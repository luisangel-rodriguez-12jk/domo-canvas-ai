import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const mainSource = readFileSync(join(process.cwd(), 'electron/main.ts'), 'utf8');

describe('Electron auto-updater startup behavior', () => {
  it('checks for updates automatically when the packaged app opens', () => {
    expect(mainSource).toContain('setTimeout(startAutoUpdateCheck, 1000)');
    expect(mainSource).toContain('autoUpdater.checkForUpdates()');
  });

  it('downloads and installs updates automatically instead of waiting for a renderer button', () => {
    expect(mainSource).toContain('autoUpdater.autoDownload = true');
    expect(mainSource).toContain('autoUpdater.autoInstallOnAppQuit = true');
    expect(mainSource).toContain("autoUpdater.on('update-downloaded', (info) => installDownloadedUpdate(info.version))");
    expect(mainSource).toContain('autoUpdater.quitAndInstall(false, true)');
  });

  it('shows a diagnostic page if the renderer files are missing instead of staying black', () => {
    expect(mainSource).toContain('function showRendererLoadError');
    expect(mainSource).toContain("win.webContents.on('did-fail-load'");
    expect(mainSource).toContain('No se pudo cargar la interfaz');
  });
});
