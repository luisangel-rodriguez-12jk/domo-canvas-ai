
import { contextBridge, ipcRenderer } from 'electron';
import type { AppSettings, GenerateAiRequest, GenerateAiResponse, UpdateStatus } from '../src/core/types';

contextBridge.exposeInMainWorld('domo', {
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: AppSettings): Promise<AppSettings> => ipcRenderer.invoke('settings:save', settings),
  generateImage: (request: GenerateAiRequest): Promise<GenerateAiResponse> => ipcRenderer.invoke('ai:generate', request),
  saveDataUrl: (dataUrl: string, suggestedName: string): Promise<{ canceled: boolean; filePath?: string }> =>
    ipcRenderer.invoke('file:save-data-url', { dataUrl, suggestedName }),
  saveProject: (projectJson: string, suggestedName: string): Promise<{ canceled: boolean; filePath?: string }> =>
    ipcRenderer.invoke('file:save-project', { projectJson, suggestedName }),
  openProject: (): Promise<{ canceled: boolean; filePath?: string; projectJson?: string }> => ipcRenderer.invoke('file:open-project'),
  getUpdateStatus: (): Promise<UpdateStatus> => ipcRenderer.invoke('update:get-status'),
  checkForUpdates: (): Promise<UpdateStatus> => ipcRenderer.invoke('update:check'),
  installUpdate: (): Promise<UpdateStatus> => ipcRenderer.invoke('update:install'),
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: UpdateStatus) => callback(status);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },
});
