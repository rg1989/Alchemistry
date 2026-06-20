import { randomUUID } from 'node:crypto'
import { accessSync } from 'node:fs'
import { access, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'

import { convertFile } from './converters'
import { enrichGrimoireEntries } from './services/grimoire'
import {
  appendGrimoireEntry,
  getGrimoirePath,
  loadGrimoire,
} from './services/grimoireStore'
import { inspectSourceFile } from './services/fileInfo'
import { createUniqueOutputPath, getAlchemyOutputDir } from './services/outputPaths'
import { ALLOWED_INPUT_EXTENSIONS } from '../src/shared/conversionMatrix'
import { REFINEMENT_OUTPUT_SUFFIX, resolveRefinementOutputExt } from '../src/shared/imageRefinements'
import type { GrimoireEntry, TransmuteRequest } from '../src/shared/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1120,
    height: 768,
    minWidth: 1040,
    minHeight: 700,
    useContentSize: true,
    title: 'Alchemistry',
    backgroundColor: '#1a1612',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Open external links (LinkedIn, GitHub, etc.) in the user's default browser
  // instead of navigating the app window or spawning an in-app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) {
      void shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const devUrl = process.env.ELECTRON_RENDERER_URL
    if (devUrl && url.startsWith(devUrl)) {
      return
    }
    if (/^https?:\/\//.test(url)) {
      event.preventDefault()
      void shell.openExternal(url)
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function registerIpcHandlers(): void {
  ipcMain.handle('source:pick', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Choose a reagent for the forge',
      properties: ['openFile'],
      filters: [
        {
          name: 'Alchemistry reagents',
          extensions: ALLOWED_INPUT_EXTENSIONS,
        },
      ],
    })

    if (result.canceled || !result.filePaths[0]) {
      return null
    }

    return inspectSourceFile(result.filePaths[0])
  })

  ipcMain.handle('source:inspect', async (_event, filePath: string) => inspectSourceFile(filePath))

  ipcMain.handle('transmute', async (_event, request: TransmuteRequest) => {
    const source = await inspectSourceFile(request.sourcePath)

    if (!source) {
      throw new Error('That reagent is missing or unsupported.')
    }

    const outputDir = getAlchemyOutputDir()
    await mkdir(outputDir, { recursive: true })

    const outputExt = request.refinement
      ? resolveRefinementOutputExt(source.ext, request.refinement)
      : request.outputExt.replace(/^\./, '').toLowerCase()

    const outputPath = createUniqueOutputPath({
      sourcePath: source.path,
      targetExt: outputExt,
      outputDir,
      exists: (candidate) => existsSync(candidate),
      nameSuffix: request.refinement ? REFINEMENT_OUTPUT_SUFFIX[request.refinement] : undefined,
    })

    const entryBase = {
      id: randomUUID(),
      sourcePath: source.path,
      sourceName: source.name,
      outputPath,
      outputExt,
      createdAt: Date.now(),
    }

    try {
      await convertFile({
        sourcePath: source.path,
        outputPath,
        outputExt,
        refinement: request.refinement,
      })

      const entry: GrimoireEntry = {
        ...entryBase,
        status: 'success',
      }

      await appendGrimoireEntry(getGrimoirePath(app.getPath('userData')), entry)
      return entry
    } catch (error) {
      const entry: GrimoireEntry = {
        ...entryBase,
        status: 'failed',
        error: error instanceof Error ? error.message : 'The mixture failed.',
      }

      await appendGrimoireEntry(getGrimoirePath(app.getPath('userData')), entry)
      throw error
    }
  })

  ipcMain.handle('grimoire:list', async () => {
    const entries = await loadGrimoire(getGrimoirePath(app.getPath('userData')))
    return enrichGrimoireEntries(entries, async (candidate) => existsAsync(candidate))
  })

  ipcMain.handle('artifact:open', async (_event, filePath: string) => {
    await assertPathExists(filePath)
    const errorMessage = await shell.openPath(filePath)

    if (errorMessage) {
      throw new Error(errorMessage)
    }
  })

  ipcMain.handle('artifact:reveal', async (_event, filePath: string) => {
    await assertPathExists(filePath)
    shell.showItemInFolder(filePath)
  })
}

function existsSync(candidate: string): boolean {
  try {
    accessSyncCompat(candidate)
    return true
  } catch {
    return false
  }
}

async function existsAsync(candidate: string): Promise<boolean> {
  try {
    await access(candidate)
    return true
  } catch {
    return false
  }
}

async function assertPathExists(candidate: string): Promise<void> {
  if (!(await existsAsync(candidate))) {
    throw new Error('That crafted artifact has vanished from the alchemy folder.')
  }
}

function accessSyncCompat(candidate: string): void {
  accessSync(candidate)
}
