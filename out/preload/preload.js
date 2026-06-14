"use strict";
const electron = require("electron");
const api = {
  pickSource: () => electron.ipcRenderer.invoke("source:pick"),
  inspectDroppedFile: (filePath) => electron.ipcRenderer.invoke("source:inspect", filePath),
  getPathForFile: (file) => electron.webUtils.getPathForFile(file),
  transmute: (request) => electron.ipcRenderer.invoke("transmute", request),
  getGrimoire: () => electron.ipcRenderer.invoke("grimoire:list"),
  openPath: (filePath) => electron.ipcRenderer.invoke("artifact:open", filePath),
  revealInFolder: (filePath) => electron.ipcRenderer.invoke("artifact:reveal", filePath)
};
electron.contextBridge.exposeInMainWorld("alchemistry", api);
