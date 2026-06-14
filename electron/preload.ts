import { contextBridge, ipcRenderer, webUtils } from 'electron'

import type { AlchemistryApi, SourceFile, TransmuteRequest } from '../src/shared/types'

const api: AlchemistryApi = {
  pickSource: () => ipcRenderer.invoke('source:pick') as Promise<SourceFile | null>,
  inspectDroppedFile: (filePath: string) =>
    ipcRenderer.invoke('source:inspect', filePath) as Promise<SourceFile | null>,
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  transmute: (request: TransmuteRequest) => ipcRenderer.invoke('transmute', request),
  getGrimoire: () => ipcRenderer.invoke('grimoire:list'),
  openPath: (filePath: string) => ipcRenderer.invoke('artifact:open', filePath),
  revealInFolder: (filePath: string) => ipcRenderer.invoke('artifact:reveal', filePath),
}

contextBridge.exposeInMainWorld('alchemistry', api)
