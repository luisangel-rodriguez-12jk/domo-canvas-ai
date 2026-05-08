
export type ToolMode = 'select' | 'brush' | 'eraser' | 'text' | 'ai-mask';

export type AiProvider = 'mock' | 'openai' | 'gemini' | 'custom';

export interface AiSettings {
  provider: AiProvider;
  apiKey?: string;
  endpoint?: string;
  model: string;
  size: '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
  printPreset: 'dtg' | 'screenprint' | 'embroidery' | 'mockup';
  preserveLogos: boolean;
  transparentBackground: boolean;
  maxColors: number;
}

export interface AppSettings {
  ai: AiSettings;
  workspace: {
    defaultWidth: number;
    defaultHeight: number;
    autosave: boolean;
  };
}

export interface LibraryAsset {
  id: string;
  name: string;
  src: string;
  naturalWidth: number;
  naturalHeight: number;
}

export interface BaseLayer {
  id: string;
  name: string;
  type: 'image' | 'text' | 'shape';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  src: string;
  naturalWidth: number;
  naturalHeight: number;
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontStyle: string;
  fill: string;
  align: 'left' | 'center' | 'right';
}

export interface ShapeLayer extends BaseLayer {
  type: 'shape';
  shape: 'line' | 'rect' | 'circle';
  stroke: string;
  strokeWidth: number;
  fill: string;
}

export type CanvasLayer = ImageLayer | TextLayer | ShapeLayer;

export interface Stroke {
  id: string;
  tool: 'brush' | 'eraser' | 'ai-mask';
  points: number[];
  color: string;
  width: number;
  opacity: number;
}

export interface AiHistoryItem {
  id: string;
  createdAt: string;
  provider: AiProvider;
  model: string;
  prompt: string;
  output: string;
}

export interface CanvasProject {
  id: string;
  name: string;
  width: number;
  height: number;
  background: ImageLayer | null;
  layers: CanvasLayer[];
  strokes: Stroke[];
  aiHistory: AiHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface GenerateAiRequest {
  prompt: string;
  compositionPng: string;
  maskPng?: string;
  project: CanvasProject;
  settings: AiSettings;
}

export interface GenerateAiResponse {
  imageDataUrl: string;
  provider: AiProvider;
  model: string;
  raw?: unknown;
}

export interface UpdateStatus {
  state: 'idle' | 'disabled' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  message: string;
  version?: string;
  progress?: number;
}