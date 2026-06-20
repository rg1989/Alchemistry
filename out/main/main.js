"use strict";
const node_crypto = require("node:crypto");
const node_fs = require("node:fs");
const promises = require("node:fs/promises");
const node_url = require("node:url");
const path = require("node:path");
const electron = require("electron");
const node_child_process = require("node:child_process");
const node_module = require("node:module");
const marked = require("marked");
const pdfParse = require("pdf-parse");
const backgroundRemovalNode = require("@imgly/background-removal-node");
const sharp = require("sharp");
const os = require("node:os");
const IMAGE_REFINEMENTS = [
  {
    id: "remove-background",
    ext: "png",
    family: "image",
    category: "refine",
    refinement: "remove-background",
    label: "Void Background",
    description: "Banish the backdrop and keep a transparent PNG."
  },
  {
    id: "resize-max",
    ext: "same",
    family: "image",
    category: "refine",
    refinement: "resize-max",
    label: "Shrink Sigil",
    description: "Fit within 1920px on the longest edge without upscaling."
  },
  {
    id: "compress",
    ext: "same",
    family: "image",
    category: "refine",
    refinement: "compress",
    label: "Lighten Vial",
    description: "Reduce file weight with smart compression."
  },
  {
    id: "strip-metadata",
    ext: "same",
    family: "image",
    category: "refine",
    refinement: "strip-metadata",
    label: "Scrub Sigils",
    description: "Remove hidden EXIF and metadata."
  },
  {
    id: "auto-orient",
    ext: "same",
    family: "image",
    category: "refine",
    refinement: "auto-orient",
    label: "True North",
    description: "Fix rotation from camera metadata."
  },
  {
    id: "trim-borders",
    ext: "same",
    family: "image",
    category: "refine",
    refinement: "trim-borders",
    label: "Trim Frame",
    description: "Crop empty margins around the image."
  },
  {
    id: "grayscale",
    ext: "same",
    family: "image",
    category: "refine",
    refinement: "grayscale",
    label: "Ash Tint",
    description: "Bleach color into monochrome."
  }
];
const REFINEMENT_OUTPUT_SUFFIX = {
  "remove-background": "no-bg",
  "resize-max": "resized",
  compress: "compressed",
  "strip-metadata": "clean",
  "auto-orient": "oriented",
  "trim-borders": "trimmed",
  grayscale: "mono"
};
function resolveRefinementOutputExt(sourceExt, refinement) {
  const rule = IMAGE_REFINEMENTS.find((option) => option.refinement === refinement);
  if (!rule) {
    throw new Error("That refinement is not in the grimoire yet.");
  }
  if (rule.ext === "same") {
    return sourceExt === "jpeg" ? "jpg" : sourceExt;
  }
  return rule.ext;
}
function getImageRefinement(refinement) {
  return IMAGE_REFINEMENTS.find((option) => option.refinement === refinement);
}
const imageOutputs = (...extensions) => extensions.map((ext) => ({
  id: ext,
  ext,
  family: "image",
  category: "distill",
  label: ext === "ico" ? "Shortcut Sigil" : ext === "webp" ? "Essence of WebP" : `${ext.toUpperCase()} Phial`,
  description: `Distill this image into .${ext}.`
}));
const audioOutputs = (...extensions) => extensions.map((ext) => ({
  id: ext,
  ext,
  family: "audio",
  category: "distill",
  label: `${ext.toUpperCase()} Echo`,
  description: `Bottle the sound as .${ext}.`
}));
const videoOutputs = (...extensions) => extensions.map((ext) => ({
  id: ext,
  ext,
  family: "video",
  category: "distill",
  label: `${ext.toUpperCase()} Moving Rune`,
  description: `Reforge the moving picture as .${ext}.`
}));
const documentOutput = (ext, label, description, family = "document") => ({ id: ext, ext, label, description, family, category: "distill" });
const CONVERSION_MATRIX = [
  { inputExt: "png", family: "image", outputs: imageOutputs("jpg", "webp", "avif", "tiff") },
  { inputExt: "jpg", family: "image", outputs: imageOutputs("png", "webp", "avif", "tiff") },
  { inputExt: "jpeg", family: "image", outputs: imageOutputs("png", "webp", "avif", "tiff") },
  { inputExt: "webp", family: "image", outputs: imageOutputs("png", "jpg", "avif", "tiff") },
  { inputExt: "avif", family: "image", outputs: imageOutputs("png", "jpg", "webp") },
  { inputExt: "tiff", family: "image", outputs: imageOutputs("png", "jpg", "webp") },
  {
    inputExt: "mp4",
    family: "video",
    outputs: [...videoOutputs("webm", "mov", "mkv"), ...audioOutputs("mp3", "wav", "m4a")]
  },
  {
    inputExt: "mov",
    family: "video",
    outputs: [...videoOutputs("mp4", "webm", "mkv"), ...audioOutputs("mp3", "wav", "m4a")]
  },
  {
    inputExt: "mkv",
    family: "video",
    outputs: [...videoOutputs("mp4", "webm"), ...audioOutputs("mp3", "wav", "m4a")]
  },
  {
    inputExt: "webm",
    family: "video",
    outputs: [...videoOutputs("mp4", "mkv"), ...audioOutputs("mp3", "wav", "m4a")]
  },
  { inputExt: "mp3", family: "audio", outputs: audioOutputs("wav", "m4a", "flac", "ogg") },
  { inputExt: "wav", family: "audio", outputs: audioOutputs("mp3", "m4a", "flac", "ogg") },
  { inputExt: "m4a", family: "audio", outputs: audioOutputs("mp3", "wav", "flac", "ogg") },
  { inputExt: "flac", family: "audio", outputs: audioOutputs("mp3", "wav", "m4a", "ogg") },
  { inputExt: "ogg", family: "audio", outputs: audioOutputs("mp3", "wav", "m4a", "flac") },
  {
    inputExt: "txt",
    family: "document",
    outputs: [
      documentOutput("md", "Markdown Draught", "Wrap plain text in a markdown vial."),
      documentOutput("html", "HTML Scroll", "Set the text into a simple web scroll.")
    ]
  },
  {
    inputExt: "md",
    family: "document",
    outputs: [
      documentOutput("html", "HTML Scroll", "Render markdown into an HTML scroll."),
      documentOutput("txt", "Plaintext Dust", "Strip the markdown sigils down to text.")
    ]
  },
  {
    inputExt: "html",
    family: "document",
    outputs: [documentOutput("txt", "Plaintext Dust", "Extract readable text from HTML.")]
  },
  {
    inputExt: "csv",
    family: "document",
    outputs: [
      documentOutput("json", "JSON Crystal", "Turn rows and columns into structured crystals."),
      documentOutput("txt", "Plaintext Dust", "Flatten table rows into readable text.")
    ]
  },
  {
    inputExt: "json",
    family: "document",
    outputs: [
      documentOutput("txt", "Plaintext Dust", "Pretty-print structured data for mortals."),
      documentOutput("html", "HTML Scroll", "Display JSON in a simple web scroll.")
    ]
  },
  {
    inputExt: "pdf",
    family: "pdf",
    outputs: [documentOutput("txt", "Extracted Ink", "Pull selectable text from the PDF.", "pdf")]
  }
];
const ALLOWED_INPUT_EXTENSIONS = CONVERSION_MATRIX.map((rule) => rule.inputExt).sort();
const OUTPUT_FAMILY_BY_EXT = /* @__PURE__ */ new Map();
for (const rule of CONVERSION_MATRIX) {
  for (const output of rule.outputs) {
    if (!OUTPUT_FAMILY_BY_EXT.has(output.ext)) {
      OUTPUT_FAMILY_BY_EXT.set(output.ext, output.family);
    }
  }
}
function normalizeExtension(extension) {
  return extension.trim().replace(/^\./, "").toLowerCase();
}
function getRuleForExtension(extension) {
  const normalized = normalizeExtension(extension);
  return CONVERSION_MATRIX.find((rule) => rule.inputExt === normalized);
}
function getAllowedOutputs(extension) {
  return getRuleForExtension(extension)?.outputs ?? [];
}
function isAllowedInputExtension(extension) {
  return Boolean(getRuleForExtension(extension));
}
const require$2 = node_module.createRequire(require("url").pathToFileURL(__filename).href);
const MAX_DIMENSION = 1920;
const COMPRESS_QUALITY = 80;
async function processImage({
  sourcePath,
  outputPath,
  outputExt,
  sourceExt,
  refinement
}) {
  if (!refinement) {
    await convertImageFormat(sourcePath, outputPath, outputExt);
    return;
  }
  const resolvedExt = resolveRefinementOutputExt(sourceExt, refinement);
  switch (refinement) {
    case "remove-background":
      await removeImageBackground(sourcePath, outputPath);
      return;
    case "resize-max":
      await saveImage(
        sharp(sourcePath).rotate().resize(MAX_DIMENSION, MAX_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true
        }),
        outputPath,
        resolvedExt
      );
      return;
    case "compress":
      await saveImage(sharp(sourcePath).rotate(), outputPath, resolvedExt, {
        aggressive: true
      });
      return;
    case "strip-metadata":
      await saveImage(sharp(sourcePath).rotate(), outputPath, resolvedExt);
      return;
    case "auto-orient":
      await saveImage(sharp(sourcePath).rotate(), outputPath, resolvedExt);
      return;
    case "trim-borders":
      await saveImage(sharp(sourcePath).rotate().trim(), outputPath, resolvedExt);
      return;
    case "grayscale":
      await saveImage(sharp(sourcePath).rotate().grayscale(), outputPath, resolvedExt);
      return;
    default:
      throw new Error("That refinement is not in the grimoire yet.");
  }
}
async function convertImageFormat(sourcePath, outputPath, outputExt) {
  await saveImage(sharp(sourcePath), outputPath, outputExt);
}
async function removeImageBackground(sourcePath, outputPath) {
  const blob = await backgroundRemovalNode.removeBackground(sourcePath, {
    publicPath: getBackgroundRemovalPublicPath(),
    model: "medium",
    output: {
      format: "image/png",
      quality: 0.9
    }
  });
  await promises.writeFile(outputPath, Buffer.from(await blob.arrayBuffer()));
}
function getBackgroundRemovalPublicPath() {
  const entryPath = require$2.resolve("@imgly/background-removal-node");
  const distPath = path.dirname(unpackAsarPath(entryPath));
  return node_url.pathToFileURL(`${distPath}${path.sep}`).href;
}
function unpackAsarPath(filePath) {
  return filePath.replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
}
async function saveImage(pipeline, outputPath, outputExt, options = {}) {
  const format = outputExt === "jpg" ? "jpeg" : outputExt;
  const quality = options.aggressive ? COMPRESS_QUALITY : void 0;
  await pipeline.toFormat(format, getFormatOptions(format, quality)).toFile(outputPath);
}
function getFormatOptions(format, quality = COMPRESS_QUALITY) {
  if (format === "jpeg") {
    return { quality, mozjpeg: true };
  }
  if (format === "webp") {
    return { quality };
  }
  if (format === "png") {
    return { compressionLevel: 9, adaptiveFiltering: true };
  }
  if (format === "avif") {
    return { quality };
  }
  if (format === "tiff") {
    return { quality };
  }
  return {};
}
const require$1 = node_module.createRequire(require("url").pathToFileURL(__filename).href);
const rawFfmpegPath = require$1("ffmpeg-static");
const ffmpegPath = rawFfmpegPath ? rawFfmpegPath.replace("app.asar" + path.sep, "app.asar.unpacked" + path.sep) : null;
async function convertFile({
  sourcePath,
  outputPath,
  outputExt,
  refinement
}) {
  const sourceExt = path.extname(sourcePath).replace(/^\./, "").toLowerCase();
  const normalizedOutputExt = outputExt.replace(/^\./, "").toLowerCase();
  const rule = getRuleForExtension(sourceExt);
  if (!rule) {
    throw new Error("This reagent has no known transmutations.");
  }
  if (refinement) {
    if (rule.family !== "image") {
      throw new Error("Only image reagents can be refined.");
    }
    const refinementOption = getImageRefinement(refinement);
    if (!refinementOption) {
      throw new Error("That refinement is not in the grimoire yet.");
    }
    const expectedExt = resolveRefinementOutputExt(sourceExt, refinement);
    if (normalizedOutputExt !== expectedExt) {
      throw new Error(`Refinement .${refinement} expects a .${expectedExt} artifact.`);
    }
    await processImage({
      sourcePath,
      outputPath,
      outputExt: normalizedOutputExt,
      sourceExt,
      refinement
    });
    return;
  }
  const isOutputAllowed = getAllowedOutputs(sourceExt).some(
    (output) => output.ext === normalizedOutputExt
  );
  if (!isOutputAllowed) {
    throw new Error(`.${sourceExt} cannot be transmuted into .${normalizedOutputExt}.`);
  }
  if (rule.family === "image") {
    await processImage({
      sourcePath,
      outputPath,
      outputExt: normalizedOutputExt,
      sourceExt
    });
    return;
  }
  if (rule.family === "audio" || rule.family === "video") {
    await convertMedia(sourcePath, outputPath);
    return;
  }
  if (rule.family === "pdf") {
    await convertPdf(sourcePath, outputPath);
    return;
  }
  await convertDocument(sourcePath, outputPath, sourceExt, normalizedOutputExt);
}
async function convertMedia(sourcePath, outputPath) {
  if (!ffmpegPath) {
    throw new Error("The media crucible is missing its FFmpeg catalyst.");
  }
  await new Promise((resolve, reject) => {
    const ffmpeg = node_child_process.spawn(ffmpegPath, ["-y", "-i", sourcePath, outputPath]);
    let stderr = "";
    ffmpeg.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr.trim() || `FFmpeg exited with code ${code}.`));
      }
    });
  });
}
async function convertPdf(sourcePath, outputPath) {
  const parser = new pdfParse.PDFParse({ data: await promises.readFile(sourcePath) });
  const result = await parser.getText();
  await promises.writeFile(outputPath, result.text.trimEnd(), "utf8");
  await parser.destroy();
}
async function convertDocument(sourcePath, outputPath, sourceExt, outputExt) {
  const content = await promises.readFile(sourcePath, "utf8");
  const converted = await transformDocument(content, sourceExt, outputExt);
  await promises.writeFile(outputPath, converted, "utf8");
}
async function transformDocument(content, sourceExt, outputExt) {
  if (sourceExt === "md" && outputExt === "html") {
    return wrapHtml(await marked.marked.parse(content));
  }
  if (sourceExt === "txt" && outputExt === "html") {
    return wrapHtml(`<pre>${escapeHtml(content)}</pre>`);
  }
  if (sourceExt === "txt" && outputExt === "md") {
    return content;
  }
  if (sourceExt === "md" && outputExt === "txt") {
    return stripMarkdown(content);
  }
  if (sourceExt === "html" && outputExt === "txt") {
    return stripHtml(content);
  }
  if (sourceExt === "csv" && outputExt === "json") {
    return JSON.stringify(csvToJson(content), null, 2);
  }
  if (sourceExt === "csv" && outputExt === "txt") {
    return content;
  }
  if (sourceExt === "json" && outputExt === "txt") {
    return JSON.stringify(JSON.parse(content), null, 2);
  }
  if (sourceExt === "json" && outputExt === "html") {
    return wrapHtml(`<pre>${escapeHtml(JSON.stringify(JSON.parse(content), null, 2))}</pre>`);
  }
  throw new Error(`The ${sourceExt} to ${outputExt} recipe is not in the grimoire yet.`);
}
function csvToJson(content) {
  const rows = parseCsv(content).filter((row) => row.some((cell) => cell.length > 0));
  const headers = rows.shift();
  if (!headers) {
    return [];
  }
  return rows.map(
    (row) => headers.reduce((record, header, index) => {
      record[header || `column_${index + 1}`] = row[index] ?? "";
      return record;
    }, {})
  );
}
function parseCsv(content) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];
    if (char === '"' && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell.trim());
  rows.push(row);
  return rows;
}
function wrapHtml(body) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Alchemistry Artifact</title>
  </head>
  <body>
${body}
  </body>
</html>
`;
}
function stripHtml(content) {
  return content.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function stripMarkdown(content) {
  return content.replace(/```[\s\S]*?```/g, "").replace(/`([^`]+)`/g, "$1").replace(/!\[[^\]]*]\([^)]*\)/g, "").replace(/\[([^\]]+)]\([^)]*\)/g, "$1").replace(/^#{1,6}\s+/gm, "").replace(/[*_~>#-]/g, "").replace(/\n{3,}/g, "\n\n").trim();
}
function escapeHtml(content) {
  return content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
async function enrichGrimoireEntries(entries, exists) {
  return Promise.all(
    entries.map(async (entry) => {
      const outputExists = entry.status === "success" && await exists(entry.outputPath);
      return {
        ...entry,
        outputExists,
        canOpenOutput: outputExists,
        canRevealOutput: outputExists
      };
    })
  );
}
const HISTORY_LIMIT = 24;
function getGrimoirePath(userDataPath) {
  return path.join(userDataPath, "grimoire.json");
}
async function loadGrimoire(grimoirePath) {
  try {
    const raw = await promises.readFile(grimoirePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isGrimoireEntry);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
async function saveGrimoire(grimoirePath, entries) {
  await promises.mkdir(path.dirname(grimoirePath), { recursive: true });
  await promises.writeFile(grimoirePath, JSON.stringify(entries.slice(0, HISTORY_LIMIT), null, 2), "utf8");
}
async function appendGrimoireEntry(grimoirePath, entry) {
  const entries = await loadGrimoire(grimoirePath);
  const nextEntries = [entry, ...entries].slice(0, HISTORY_LIMIT);
  await saveGrimoire(grimoirePath, nextEntries);
  return nextEntries;
}
function isGrimoireEntry(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value;
  return typeof candidate.id === "string" && typeof candidate.sourcePath === "string" && typeof candidate.sourceName === "string" && typeof candidate.outputPath === "string" && typeof candidate.outputExt === "string" && typeof candidate.createdAt === "number" && (candidate.status === "success" || candidate.status === "failed");
}
function isNodeError(error) {
  return error instanceof Error && "code" in error;
}
async function inspectSourceFile(filePath) {
  const ext = path.extname(filePath).replace(/^\./, "").toLowerCase();
  if (!isAllowedInputExtension(ext)) {
    return null;
  }
  const fileStat = await promises.stat(filePath);
  if (!fileStat.isFile()) {
    return null;
  }
  const rule = getRuleForExtension(ext);
  if (!rule) {
    return null;
  }
  return {
    path: filePath,
    name: path.basename(filePath),
    ext,
    size: fileStat.size,
    family: rule.family
  };
}
function getAlchemyOutputDir(homeDir = os.homedir()) {
  return path.join(homeDir, "Downloads", "alchemy");
}
function createUniqueOutputPath({
  sourcePath,
  targetExt,
  outputDir,
  exists,
  nameSuffix
}) {
  const parsed = path.parse(sourcePath);
  const normalizedExt = targetExt.startsWith(".") ? targetExt : `.${targetExt}`;
  const baseName = nameSuffix ? `${parsed.name} ${nameSuffix}` : parsed.name;
  const firstCandidate = path.join(outputDir, `${baseName}${normalizedExt}`);
  if (!exists(firstCandidate)) {
    return firstCandidate;
  }
  let suffix = 2;
  let candidate = path.join(outputDir, `${baseName} ${suffix}${normalizedExt}`);
  while (exists(candidate)) {
    suffix += 1;
    candidate = path.join(outputDir, `${baseName} ${suffix}${normalizedExt}`);
  }
  return candidate;
}
const __dirname$1 = path.dirname(node_url.fileURLToPath(require("url").pathToFileURL(__filename).href));
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1120,
    height: 768,
    minWidth: 1040,
    minHeight: 700,
    useContentSize: true,
    title: "Alchemistry",
    backgroundColor: "#1a1612",
    webPreferences: {
      preload: path.join(__dirname$1, "../preload/preload.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) {
      void electron.shell.openExternal(url);
    }
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const devUrl = process.env.ELECTRON_RENDERER_URL;
    if (devUrl && url.startsWith(devUrl)) {
      return;
    }
    if (/^https?:\/\//.test(url)) {
      event.preventDefault();
      void electron.shell.openExternal(url);
    }
  });
  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname$1, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
function registerIpcHandlers() {
  electron.ipcMain.handle("source:pick", async () => {
    const result = await electron.dialog.showOpenDialog({
      title: "Choose a reagent for the forge",
      properties: ["openFile"],
      filters: [
        {
          name: "Alchemistry reagents",
          extensions: ALLOWED_INPUT_EXTENSIONS
        }
      ]
    });
    if (result.canceled || !result.filePaths[0]) {
      return null;
    }
    return inspectSourceFile(result.filePaths[0]);
  });
  electron.ipcMain.handle("source:inspect", async (_event, filePath) => inspectSourceFile(filePath));
  electron.ipcMain.handle("transmute", async (_event, request) => {
    const source = await inspectSourceFile(request.sourcePath);
    if (!source) {
      throw new Error("That reagent is missing or unsupported.");
    }
    const outputDir = getAlchemyOutputDir();
    await promises.mkdir(outputDir, { recursive: true });
    const outputExt = request.refinement ? resolveRefinementOutputExt(source.ext, request.refinement) : request.outputExt.replace(/^\./, "").toLowerCase();
    const outputPath = createUniqueOutputPath({
      sourcePath: source.path,
      targetExt: outputExt,
      outputDir,
      exists: (candidate) => existsSync(candidate),
      nameSuffix: request.refinement ? REFINEMENT_OUTPUT_SUFFIX[request.refinement] : void 0
    });
    const entryBase = {
      id: node_crypto.randomUUID(),
      sourcePath: source.path,
      sourceName: source.name,
      outputPath,
      outputExt,
      createdAt: Date.now()
    };
    try {
      await convertFile({
        sourcePath: source.path,
        outputPath,
        outputExt,
        refinement: request.refinement
      });
      const entry = {
        ...entryBase,
        status: "success"
      };
      await appendGrimoireEntry(getGrimoirePath(electron.app.getPath("userData")), entry);
      return entry;
    } catch (error) {
      const entry = {
        ...entryBase,
        status: "failed",
        error: error instanceof Error ? error.message : "The mixture failed."
      };
      await appendGrimoireEntry(getGrimoirePath(electron.app.getPath("userData")), entry);
      throw error;
    }
  });
  electron.ipcMain.handle("grimoire:list", async () => {
    const entries = await loadGrimoire(getGrimoirePath(electron.app.getPath("userData")));
    return enrichGrimoireEntries(entries, async (candidate) => existsAsync(candidate));
  });
  electron.ipcMain.handle("artifact:open", async (_event, filePath) => {
    await assertPathExists(filePath);
    const errorMessage = await electron.shell.openPath(filePath);
    if (errorMessage) {
      throw new Error(errorMessage);
    }
  });
  electron.ipcMain.handle("artifact:reveal", async (_event, filePath) => {
    await assertPathExists(filePath);
    electron.shell.showItemInFolder(filePath);
  });
}
function existsSync(candidate) {
  try {
    accessSyncCompat(candidate);
    return true;
  } catch {
    return false;
  }
}
async function existsAsync(candidate) {
  try {
    await promises.access(candidate);
    return true;
  } catch {
    return false;
  }
}
async function assertPathExists(candidate) {
  if (!await existsAsync(candidate)) {
    throw new Error("That crafted artifact has vanished from the alchemy folder.");
  }
}
function accessSyncCompat(candidate) {
  node_fs.accessSync(candidate);
}
