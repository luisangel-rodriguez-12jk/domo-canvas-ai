
import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { AppSettings, GenerateAiRequest, GenerateAiResponse, UpdateStatus } from '../src/core/types';
import { buildPrintAwarePrompt } from '../src/core/aiPrompt';
import { createMockAiPreview } from '../src/core/mockAi';
import { defaultSettings, mergeSettings } from '../src/core/settings';

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

let mainWindow: BrowserWindow | null = null;
let updateStatus: UpdateStatus = { state: isDev ? 'disabled' : 'idle', message: isDev ? 'Auto-updates desactivados en modo desarrollo.' : 'Listo para buscar actualizaciones.' };

function setUpdateStatus(status: UpdateStatus) {
  updateStatus = status;
  mainWindow?.webContents.send('update:status', status);
}

function configureAutoUpdates(win: BrowserWindow) {
  mainWindow = win;
  if (isDev) return;

  autoUpdater.autoDownload = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('checking-for-update', () => setUpdateStatus({ state: 'checking', message: 'Buscando actualizaciones…' }));
  autoUpdater.on('update-available', (info) => setUpdateStatus({ state: 'available', message: `Actualización ${info.version} disponible. Descargando…`, version: info.version }));
  autoUpdater.on('update-not-available', (info) => setUpdateStatus({ state: 'not-available', message: `Ya tienes la versión más nueva (${info.version}).`, version: info.version }));
  autoUpdater.on('download-progress', (progress) => setUpdateStatus({ state: 'downloading', message: `Descargando actualización… ${Math.round(progress.percent)}%`, progress: progress.percent }));
  autoUpdater.on('update-downloaded', (info) => setUpdateStatus({ state: 'downloaded', message: `Actualización ${info.version} lista. Reinicia para instalar.`, version: info.version }));
  autoUpdater.on('error', (error) => setUpdateStatus({ state: 'error', message: `No se pudo actualizar: ${error.message}` }));

  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((error) => setUpdateStatus({ state: 'error', message: `No se pudo buscar actualización: ${error.message}` }));
  }, 3500);
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function encryptSecret(secret = '') {
  if (!secret) return '';
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return `safe:${safeStorage.encryptString(secret).toString('base64')}`;
    }
  } catch {
    // Fall back to plain local storage if OS encryption is unavailable.
  }
  return `plain:${Buffer.from(secret, 'utf8').toString('base64')}`;
}

function decryptSecret(secret = '') {
  if (!secret) return '';
  try {
    if (secret.startsWith('safe:')) return safeStorage.decryptString(Buffer.from(secret.slice(5), 'base64'));
    if (secret.startsWith('plain:')) return Buffer.from(secret.slice(6), 'base64').toString('utf8');
  } catch {
    return '';
  }
  return secret;
}

async function readSettings(): Promise<AppSettings> {
  try {
    const raw = JSON.parse(await fs.readFile(getSettingsPath(), 'utf8'));
    const merged = mergeSettings(raw);
    merged.ai.apiKey = decryptSecret(raw.ai?.apiKey ?? '');
    return merged;
  } catch {
    return defaultSettings;
  }
}

function publicSettings(settings: AppSettings): AppSettings {
  return { ...settings, ai: { ...settings.ai, apiKey: '' } };
}

async function readPublicSettings(): Promise<AppSettings> {
  return publicSettings(await readSettings());
}

async function writeSettings(settings: AppSettings): Promise<AppSettings> {
  const existing = await readSettings();
  const merged = mergeSettings({ ...settings, ai: { ...settings.ai, apiKey: settings.ai.apiKey || existing.ai.apiKey } });
  const toPersist = { ...merged, ai: { ...merged.ai, apiKey: encryptSecret(merged.ai.apiKey) } };
  await fs.mkdir(path.dirname(getSettingsPath()), { recursive: true });
  await fs.writeFile(getSettingsPath(), JSON.stringify(toPersist, null, 2), 'utf8');
  return publicSettings(merged);
}

function dataUrlToBuffer(dataUrl: string) {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) throw new Error('La imagen no está en formato data URL base64.');
  return { mime: match[1] || 'image/png', buffer: Buffer.from(match[2], 'base64'), base64: match[2] };
}

function svgMockResponse(request: GenerateAiRequest, prompt: string) {
  const escaped = prompt.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char] ?? char);
  const lines = escaped.match(/.{1,72}(\s|$)/g)?.slice(0, 8).join('') ?? escaped;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536">
  <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#050505"/><stop offset="1" stop-color="#3b111b"/></linearGradient></defs>
  <rect width="1024" height="1536" fill="url(#g)"/>
  <rect x="76" y="90" width="872" height="1356" rx="48" fill="none" stroke="#ff2a55" stroke-width="8" opacity=".8"/>
  <text x="512" y="235" text-anchor="middle" fill="#fff" font-family="Impact, Arial Black, Arial" font-size="78">DOMO CANVAS AI</text>
  <text x="512" y="330" text-anchor="middle" fill="#ff2a55" font-family="Arial" font-size="32">Vista simulada: agrega API key para IA real</text>
  <foreignObject x="120" y="450" width="784" height="650"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial;color:white;font-size:34px;line-height:1.35;white-space:pre-wrap">${lines}</div></foreignObject>
  <text x="512" y="1300" text-anchor="middle" fill="#fff" opacity=".8" font-family="Arial" font-size="30">Composición recibida: ${request.project.layers.length} capas + ${request.project.strokes.length} trazos</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

async function callOpenAi(request: GenerateAiRequest, fullPrompt: string): Promise<GenerateAiResponse> {
  if (!request.settings.apiKey) throw new Error('Falta API key de OpenAI en Configuración.');
  const { mime, buffer } = dataUrlToBuffer(request.compositionPng);
  const form = new FormData();
  form.append('model', request.settings.model || 'gpt-image-1');
  form.append('prompt', fullPrompt);
  if (request.settings.size !== 'auto') form.append('size', request.settings.size);
  form.append('image', new Blob([buffer], { type: mime }), 'composition.png');

  const endpoint = request.settings.endpoint || 'https://api.openai.com/v1/images/edits';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${request.settings.apiKey}` },
    body: form,
  });
  const json: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error?.message || `OpenAI respondió HTTP ${response.status}`);
  const item = json.data?.[0];
  const imageDataUrl = item?.b64_json ? `data:image/png;base64,${item.b64_json}` : item?.url;
  if (!imageDataUrl) throw new Error('OpenAI no devolvió b64_json ni url de imagen.');
  return { imageDataUrl, provider: 'openai', model: request.settings.model, raw: json };
}

async function callGemini(request: GenerateAiRequest, fullPrompt: string): Promise<GenerateAiResponse> {
  if (!request.settings.apiKey) throw new Error('Falta API key de Gemini en Configuración.');
  const { mime, base64 } = dataUrlToBuffer(request.compositionPng);
  const model = request.settings.model || 'gemini-2.5-flash-image-preview';
  const endpoint = request.settings.endpoint || `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${request.settings.apiKey}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }, { inlineData: { mimeType: mime, data: base64 } }] }],
    }),
  });
  const json: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error?.message || `Gemini respondió HTTP ${response.status}`);
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const inline = parts.find((part: any) => part.inlineData?.data || part.inline_data?.data);
  const data = inline?.inlineData?.data || inline?.inline_data?.data;
  const outMime = inline?.inlineData?.mimeType || inline?.inline_data?.mime_type || 'image/png';
  if (!data) throw new Error('Gemini no devolvió imagen inline. Revisa modelo/endpoint.');
  return { imageDataUrl: `data:${outMime};base64,${data}`, provider: 'gemini', model, raw: json };
}

async function callCustom(request: GenerateAiRequest, fullPrompt: string): Promise<GenerateAiResponse> {
  if (!request.settings.endpoint) throw new Error('Falta endpoint custom en Configuración.');
  const response = await fetch(request.settings.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(request.settings.apiKey ? { Authorization: `Bearer ${request.settings.apiKey}` } : {}),
    },
    body: JSON.stringify({
      prompt: fullPrompt,
      image: request.compositionPng,
      project: request.project,
      settings: { ...request.settings, apiKey: undefined },
    }),
  });
  const json: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || json.message || `Endpoint custom respondió HTTP ${response.status}`);
  const imageDataUrl = json.imageDataUrl || json.image || json.url;
  if (!imageDataUrl) throw new Error('Endpoint custom debe devolver imageDataUrl, image o url.');
  return { imageDataUrl, provider: 'custom', model: request.settings.model, raw: json };
}

async function generateImage(request: GenerateAiRequest): Promise<GenerateAiResponse> {
  const persisted = await readSettings();
  request = { ...request, settings: { ...request.settings, apiKey: request.settings.apiKey || persisted.ai.apiKey } };
  const fullPrompt = buildPrintAwarePrompt(request.prompt, request.project, request.settings);
  if (request.settings.provider === 'openai') return callOpenAi(request, fullPrompt);
  if (request.settings.provider === 'gemini') return callGemini(request, fullPrompt);
  if (request.settings.provider === 'custom') return callCustom(request, fullPrompt);
  return createMockAiPreview(request);
}

async function saveDataUrl(dataUrl: string, suggestedName: string) {
  const result = await dialog.showSaveDialog({
    title: 'Guardar diseño PNG',
    defaultPath: suggestedName,
    filters: [{ name: 'Imagen', extensions: ['png', 'jpg', 'svg'] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  const { buffer } = dataUrlToBuffer(dataUrl);
  await fs.writeFile(result.filePath, buffer);
  return { canceled: false, filePath: result.filePath };
}

async function saveProject(projectJson: string, suggestedName: string) {
  const result = await dialog.showSaveDialog({
    title: 'Guardar proyecto Domo',
    defaultPath: suggestedName.endsWith('.domo.json') ? suggestedName : `${suggestedName}.domo.json`,
    filters: [{ name: 'Proyecto Domo Canvas AI', extensions: ['domo.json', 'json'] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  await fs.writeFile(result.filePath, projectJson, 'utf8');
  return { canceled: false, filePath: result.filePath };
}

async function openProject() {
  const result = await dialog.showOpenDialog({
    title: 'Abrir proyecto Domo',
    properties: ['openFile'],
    filters: [{ name: 'Proyecto Domo Canvas AI', extensions: ['domo.json', 'json'] }],
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  const filePath = result.filePaths[0];
  const projectJson = await fs.readFile(filePath, 'utf8');
  return { canceled: false, filePath, projectJson };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 1180,
    minHeight: 760,
    title: 'Domo Canvas AI',
    backgroundColor: '#08080b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url).catch(() => undefined);
    return { action: 'deny' };
  });

  configureAutoUpdates(win);

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL!);
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

app.whenReady().then(() => {
  ipcMain.handle('settings:get', readPublicSettings);
  ipcMain.handle('settings:save', (_event, settings: AppSettings) => writeSettings(settings));
  ipcMain.handle('ai:generate', (_event, request: GenerateAiRequest) => generateImage(request));
  ipcMain.handle('file:save-data-url', (_event, payload: { dataUrl: string; suggestedName: string }) => saveDataUrl(payload.dataUrl, payload.suggestedName));
  ipcMain.handle('file:save-project', (_event, payload: { projectJson: string; suggestedName: string }) => saveProject(payload.projectJson, payload.suggestedName));
  ipcMain.handle('file:open-project', () => openProject());
  ipcMain.handle('update:get-status', () => updateStatus);
  ipcMain.handle('update:check', async () => {
    if (isDev) return updateStatus;
    await autoUpdater.checkForUpdatesAndNotify();
    return updateStatus;
  });
  ipcMain.handle('update:install', () => {
    if (updateStatus.state === 'downloaded') autoUpdater.quitAndInstall(false, true);
    return updateStatus;
  });
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
