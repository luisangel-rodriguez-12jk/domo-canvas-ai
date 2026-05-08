
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
let updateStatus: UpdateStatus = { state: isDev ? 'disabled' : 'idle', message: isDev ? 'Auto-updates desactivados en modo desarrollo.' : 'Buscando actualizaciones antes de iniciar…' };
let autoUpdateConfigured = false;
let updateCheckStarted = false;
let installTimer: NodeJS.Timeout | null = null;
let rendererLoaded = false;
let startupGateTimer: NodeJS.Timeout | null = null;

const AUTO_INSTALL_DELAY_MS = 2500;
const STARTUP_UPDATE_GATE_TIMEOUT_MS = 15000;

function escapeHtml(message: string) {
  return message.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}

function setUpdateStatus(status: UpdateStatus) {
  updateStatus = status;
  if (mainWindow && !rendererLoaded && !isDev) showStartupUpdateScreen(mainWindow, status);
  mainWindow?.webContents.send('update:status', status);
}

function loadRenderer(win: BrowserWindow, reason = 'update-ready') {
  if (rendererLoaded) return;
  rendererLoaded = true;
  if (startupGateTimer) clearTimeout(startupGateTimer);
  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL!).catch((error) => showRendererLoadError(win, error.message));
  } else {
    const rendererPath = path.join(__dirname, '../../dist/index.html');
    win.loadFile(rendererPath).catch((error) => showRendererLoadError(win, `No se pudo abrir ${rendererPath}\n${error.message}`));
  }
  setUpdateStatus({ ...updateStatus, message: reason === 'timeout' ? 'No se confirmó update a tiempo; app iniciada sin cierre automático.' : updateStatus.message });
}

async function clearStoredApiKey() {
  const existing = await readSettings();
  const toPersist = { ...existing, ai: { ...existing.ai, apiKey: '' } };
  await fs.mkdir(path.dirname(getSettingsPath()), { recursive: true });
  await fs.writeFile(getSettingsPath(), JSON.stringify(toPersist, null, 2), 'utf8');
}

async function hasStoredApiKey() {
  try {
    const raw = JSON.parse(await fs.readFile(getSettingsPath(), 'utf8'));
    return Boolean(raw.ai?.apiKey);
  } catch {
    return false;
  }
}

async function confirmPreserveApiKeysBeforeUpdate() {
  if (!(await hasStoredApiKey())) return;
  const result = await dialog.showMessageBox({
    type: 'question',
    title: 'Conservar APIs guardadas',
    message: 'Domo Canvas AI detectó API keys guardadas localmente. ¿Quieres conservarlas después de actualizar?',
    detail: 'Lo normal es conservarlas. Si eliges borrar, se eliminarán del archivo local de configuración antes de instalar la actualización.',
    buttons: ['Conservar APIs guardadas', 'Borrar APIs guardadas'],
    defaultId: 0,
    cancelId: 0,
  });
  if (result.response === 1) await clearStoredApiKey();
}

function installDownloadedUpdate(version?: string) {
  if (installTimer) clearTimeout(installTimer);
  if (rendererLoaded) {
    setUpdateStatus({ state: 'downloaded', message: `Actualización ${version ?? ''} lista. Se instalará cuando reinicies la app.`, version });
    return;
  }
  setUpdateStatus({ state: 'downloaded', message: `Actualización ${version ?? ''} lista. Reiniciando para instalar automáticamente…`, version });
  installTimer = setTimeout(() => {
    confirmPreserveApiKeysBeforeUpdate()
      .then(() => autoUpdater.quitAndInstall(false, true))
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        setUpdateStatus({ state: 'error', message: `No se pudo reiniciar para instalar: ${message}` });
        if (mainWindow) loadRenderer(mainWindow, 'update-install-error');
      });
  }, AUTO_INSTALL_DELAY_MS);
}

function continueStartupAfterUpdateCheck(reason: string) {
  if (!mainWindow || rendererLoaded) return;
  setTimeout(() => mainWindow && loadRenderer(mainWindow, reason), reason === 'timeout' ? 0 : 900);
}

function startAutoUpdateCheck() {
  if (isDev || updateCheckStarted) return;
  updateCheckStarted = true;
  setUpdateStatus({ state: 'checking', message: 'Buscando actualizaciones antes de iniciar…' });
  startupGateTimer = setTimeout(() => continueStartupAfterUpdateCheck('timeout'), STARTUP_UPDATE_GATE_TIMEOUT_MS);
  autoUpdater.checkForUpdates().catch((error) => {
    updateCheckStarted = false;
    setUpdateStatus({ state: 'error', message: `No se pudo buscar actualización: ${error.message}` });
    continueStartupAfterUpdateCheck('update-error');
  });
}

function configureAutoUpdates(win: BrowserWindow) {
  mainWindow = win;
  if (isDev) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  if (!autoUpdateConfigured) {
    autoUpdateConfigured = true;
    autoUpdater.on('checking-for-update', () => setUpdateStatus({ state: 'checking', message: 'Buscando actualizaciones antes de iniciar…' }));
    autoUpdater.on('update-available', (info) => setUpdateStatus({ state: 'available', message: `Actualización ${info.version} disponible. Descargando antes de abrir el editor…`, version: info.version }));
    autoUpdater.on('update-not-available', (info) => {
      setUpdateStatus({ state: 'not-available', message: `Sin actualizaciones. Iniciando editor…`, version: info.version });
      continueStartupAfterUpdateCheck('not-available');
    });
    autoUpdater.on('download-progress', (progress) => setUpdateStatus({ state: 'downloading', message: `Descargando actualización antes de iniciar… ${Math.round(progress.percent)}%`, progress: progress.percent }));
    autoUpdater.on('update-downloaded', (info) => installDownloadedUpdate(info.version));
    autoUpdater.on('error', (error) => {
      setUpdateStatus({ state: 'error', message: `No se pudo actualizar: ${error.message}. Iniciando editor…` });
      continueStartupAfterUpdateCheck('update-error');
    });
  }
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

function showStartupUpdateScreen(win: BrowserWindow, status: UpdateStatus = updateStatus) {
  const progress = typeof status.progress === 'number' ? Math.max(3, Math.min(100, Math.round(status.progress))) : 38;
  const indeterminate = typeof status.progress !== 'number';
  const message = escapeHtml(status.message);
  const version = status.version ? `<p class="version">Versión detectada: ${escapeHtml(status.version)}</p>` : '';
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Domo Canvas AI</title><style>
    :root{color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif;background:#08080b;color:#f7f7fb}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 30% 0%,rgba(255,42,85,.22),transparent 34%),#08080b;overflow:hidden}
    main{width:min(560px,calc(100vw - 48px));padding:34px;border:1px solid #33202a;border-radius:28px;background:linear-gradient(180deg,#15151d,#0d0d13);box-shadow:0 24px 80px #0009;text-align:center}
    .brand{letter-spacing:.2em;color:#ff2a55;font-size:13px;font-weight:900;margin-bottom:14px}.brand b{display:block;color:#fff;font-size:28px;letter-spacing:.08em;margin-top:4px}
    h1{font-size:20px;margin:0 0 8px}.msg{color:#cfcfd8;line-height:1.5;margin:0 0 20px}.version{color:#9a9aaa;font-size:12px;margin:10px 0 0}
    .bar{height:14px;border-radius:999px;background:#08080c;border:1px solid #30303d;overflow:hidden;position:relative}.fill{height:100%;width:${progress}%;background:linear-gradient(90deg,#ff2a55,#7a37ff);box-shadow:0 0 24px rgba(255,42,85,.45);border-radius:999px;${indeterminate ? 'animation:pulse 1.15s ease-in-out infinite alternate;' : ''}}
    .foot{margin-top:18px;color:#898998;font-size:12px;line-height:1.45}@keyframes pulse{from{width:24%;transform:translateX(0)}to{width:62%;transform:translateX(60%)}}
  </style></head><body><main><div class="brand">DOMO<b>CANVAS AI</b></div><h1>Buscando actualizaciones</h1><p class="msg">${message}</p><div class="bar"><div class="fill"></div></div>${version}<div class="foot">El editor se abrirá cuando confirme que no hay update pendiente. Así evitas empezar a trabajar y que la app se cierre a mitad del flujo.</div></main></body></html>`;
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`).catch(() => undefined);
}

function showRendererLoadError(win: BrowserWindow, message: string) {
  const escaped = escapeHtml(message);
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Domo Canvas AI - error</title><style>
    body{margin:0;background:#08080b;color:#f7f7fb;font-family:Segoe UI,Arial,sans-serif;display:grid;place-items:center;min-height:100vh}
    main{max-width:760px;padding:32px;border:1px solid #33202a;border-radius:24px;background:#121218;box-shadow:0 20px 60px #0008}
    h1{margin:0 0 12px;color:#ff2a55;font-size:28px} code{display:block;white-space:pre-wrap;background:#050507;border:1px solid #2a2a35;padding:16px;border-radius:14px;color:#f6cad3}
    p{line-height:1.55;color:#cfcfd8}
  </style></head><body><main><h1>No se pudo cargar la interfaz</h1><p>La app abrió Electron, pero falló el renderer de React. Reinstala la última versión desde GitHub Releases o espera el auto-update.</p><code>${escaped}</code></main></body></html>`;
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`).catch(() => undefined);
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

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    if (validatedURL.startsWith('data:')) return;
    showRendererLoadError(win, `Carga fallida: ${errorCode} ${errorDescription}\nURL: ${validatedURL}`);
  });

  configureAutoUpdates(win);

  if (isDev) {
    loadRenderer(win, 'dev');
  } else {
    showStartupUpdateScreen(win);
    setTimeout(startAutoUpdateCheck, 500);
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
    updateCheckStarted = false;
    startAutoUpdateCheck();
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
