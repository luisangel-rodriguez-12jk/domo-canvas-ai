import type { AiProvider } from './types';

export interface ProviderOption {
  id: AiProvider;
  label: string;
  note: string;
}

export interface ModelOption {
  id: string;
  label: string;
  note: string;
}

export const providerOptions: ProviderOption[] = [
  { id: 'mock', label: 'Simulado / sin costo', note: 'Sirve para probar el flujo sin gastar créditos.' },
  { id: 'openai', label: 'OpenAI Images', note: 'Mejor control general, edición y texto.' },
  { id: 'gemini', label: 'Google Gemini / Nano Banana', note: 'Buen balance calidad/precio.' },
  { id: 'custom', label: 'Endpoint personalizado', note: 'Para Replicate, Fal, ComfyUI u otro backend propio.' },
];

const modelsByProvider: Record<AiProvider, ModelOption[]> = {
  mock: [
    { id: 'mock-preview', label: 'Mock preview local', note: 'No llama a ningún proveedor.' },
  ],
  openai: [
    { id: 'gpt-image-1', label: 'GPT Image 1', note: 'Estable para edición de imágenes.' },
    { id: 'gpt-image-1.5', label: 'GPT Image 1.5', note: 'Mayor fidelidad cuando esté disponible en tu cuenta.' },
    { id: 'gpt-image-2', label: 'GPT Image 2', note: 'Máxima calidad si tu API lo tiene habilitado.' },
  ],
  gemini: [
    { id: 'gemini-2.5-flash-image-preview', label: 'Gemini 2.5 Flash Image', note: 'Modelo Nano Banana clásico.' },
    { id: 'gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash Image / Nano Banana 2', note: 'Calidad/precio alto si está disponible.' },
  ],
  custom: [
    { id: 'custom-image-model', label: 'Modelo custom', note: 'Usa el endpoint configurado.' },
    { id: 'flux-2-pro', label: 'FLUX.2 Pro', note: 'Opción común en endpoints externos.' },
    { id: 'flux-2-max', label: 'FLUX.2 Max', note: 'Mayor calidad en proveedores compatibles.' },
    { id: 'hunyuanimage-3-instruct', label: 'HunyuanImage 3 Instruct', note: 'Open weights / edición según backend.' },
  ],
};

export function getModelsForProvider(provider: AiProvider): ModelOption[] {
  return modelsByProvider[provider] ?? modelsByProvider.mock;
}

export function getDefaultModelForProvider(provider: AiProvider): string {
  return getModelsForProvider(provider)[0]?.id ?? 'mock-preview';
}
