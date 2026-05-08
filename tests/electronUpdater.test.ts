import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const mainSource = readFileSync(join(process.cwd(), 'electron/main.ts'), 'utf8');

describe('Electron auto-updater startup behavior', () => {
  it('checks for updates before loading the editor in packaged builds', () => {
    expect(mainSource).toContain('showStartupUpdateScreen(win)');
    expect(mainSource).toContain('setTimeout(startAutoUpdateCheck, 500)');
    expect(mainSource).toContain('STARTUP_UPDATE_GATE_TIMEOUT_MS');
    expect(mainSource).toContain('autoUpdater.checkForUpdates()');
  });

  it('downloads and installs updates automatically only while the startup gate is still active', () => {
    expect(mainSource).toContain('autoUpdater.autoDownload = true');
    expect(mainSource).toContain('autoUpdater.autoInstallOnAppQuit = true');
    expect(mainSource).toContain("autoUpdater.on('update-downloaded', (info) => installDownloadedUpdate(info.version))");
    expect(mainSource).toContain('if (rendererLoaded)');
    expect(mainSource).toContain('autoUpdater.quitAndInstall(false, true)');
  });

  it('shows a diagnostic page if the renderer files are missing instead of staying black', () => {
    expect(mainSource).toContain('function showRendererLoadError');
    expect(mainSource).toContain("win.webContents.on('did-fail-load'");
    expect(mainSource).toContain('No se pudo cargar la interfaz');
  });
});
