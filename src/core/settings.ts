
import type { AppSettings } from './types';

export const defaultSettings: AppSettings = {
  ai: {
    provider: 'mock',
    apiKey: '',
    endpoint: '',
    model: 'mock-preview',
    size: '1024x1536',
    printPreset: 'dtg',
    preserveLogos: true,
    transparentBackground: true,
    maxColors: 6,
  },
  workspace: {
    defaultWidth: 4500,
    defaultHeight: 5400,
    autosave: true,
  },
};

export function redactApiKey(value = ''): string {
  if (!value) return '';
  if (value.length <= 8) return '••••';
  return `${value.slice(0, 4)}••••••${value.slice(-4)}`;
}

export function mergeSettings(input?: Partial<AppSettings>): AppSettings {
  return {
    ...defaultSettings,
    ...input,
    ai: { ...defaultSettings.ai, ...input?.ai },
    workspace: { ...defaultSettings.workspace, ...input?.workspace },
  };
}
