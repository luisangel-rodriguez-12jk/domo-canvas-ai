
import type { AppSettings, GenerateAiRequest, GenerateAiResponse, UpdateStatus } from './core/types';

export interface DomoApi {
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<AppSettings>;
  generateImage: (request: GenerateAiRequest) => Promise<GenerateAiResponse>;
  saveDataUrl: (dataUrl: string, suggestedName: string) => Promise<{ canceled: boolean; filePath?: string }>;
  saveProject: (projectJson: string, suggestedName: string) => Promise<{ canceled: boolean; filePath?: string }>;
  openProject: () => Promise<{ canceled: boolean; filePath?: string; projectJson?: string }>;
  getUpdateStatus: () => Promise<UpdateStatus>;
  checkForUpdates: () => Promise<UpdateStatus>;
  installUpdate: () => Promise<UpdateStatus>;
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;
}

declare global {
  interface Window {
    domo?: DomoApi;
  }
}
