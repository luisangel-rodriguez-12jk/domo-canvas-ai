
import type { CanvasLayer, CanvasProject, ImageLayer, ShapeLayer, TextLayer } from './types';

const now = () => new Date().toISOString();

export const createId = (prefix = 'layer') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function touchProject(project: CanvasProject): CanvasProject {
  return { ...project, updatedAt: now() };
}

export function createProject(name = 'Nuevo diseño Domo', width = 4500, height = 5400): CanvasProject {
  const timestamp = now();
  return {
    id: createId('project'),
    name,
    width,
    height,
    background: null,
    layers: [],
    strokes: [],
    aiHistory: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function addImageLayer(
  project: CanvasProject,
  input: { name: string; src: string; naturalWidth: number; naturalHeight: number; asBackground?: boolean; x?: number; y?: number },
): CanvasProject {
  const maxWidth = input.asBackground ? project.width : Math.min(project.width * 0.42, input.naturalWidth);
  const scale = Math.min(1, maxWidth / Math.max(1, input.naturalWidth));
  const width = Math.round(input.naturalWidth * scale);
  const height = Math.round(input.naturalHeight * scale);
  const layer: ImageLayer = {
    id: createId(input.asBackground ? 'background' : 'image'),
    type: 'image',
    name: input.name || 'Imagen',
    src: input.src,
    naturalWidth: input.naturalWidth,
    naturalHeight: input.naturalHeight,
    x: Math.round(input.x ?? (project.width - width) / 2),
    y: Math.round(input.y ?? (project.height - height) / 2),
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
  };

  if (input.asBackground) {
    return touchProject({ ...project, background: { ...layer, x: 0, y: 0, width: project.width, height: project.height, locked: true } });
  }

  return touchProject({ ...project, layers: [...project.layers, layer] });
}

export function addTextLayer(project: CanvasProject, text = 'DOMO', options: Partial<Pick<TextLayer, 'fontFamily' | 'fontSize' | 'fill' | 'align'>> = {}): CanvasProject {
  const fontSize = options.fontSize ?? 220;
  const lineCount = Math.max(1, text.split('\n').length);
  const layer: TextLayer = {
    id: createId('text'),
    type: 'text',
    name: `Texto: ${text.replace(/\s+/g, ' ').slice(0, 18)}`,
    text,
    fontFamily: options.fontFamily ?? 'Impact, Arial Black, Arial, sans-serif',
    fontSize,
    fontStyle: 'normal',
    fill: options.fill ?? '#ffffff',
    align: options.align ?? 'center',
    x: Math.round(project.width / 2),
    y: Math.round(project.height / 2),
    width: 1200,
    height: Math.max(300, Math.round(fontSize * 1.28 * lineCount)),
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
  };
  return touchProject({ ...project, layers: [...project.layers, layer] });
}

export function addShapeLayer(
  project: CanvasProject,
  shape: ShapeLayer['shape'],
  options: Partial<Pick<ShapeLayer, 'stroke' | 'strokeWidth' | 'fill' | 'x' | 'y' | 'width' | 'height'>> = {},
): CanvasProject {
  const width = options.width ?? (shape === 'line' ? 1100 : 900);
  const height = options.height ?? (shape === 'line' ? 0 : 900);
  const layer: ShapeLayer = {
    id: createId('shape'),
    type: 'shape',
    shape,
    name: shape === 'rect' ? 'Rectángulo' : shape === 'circle' ? 'Círculo' : 'Línea',
    x: Math.round(options.x ?? (project.width - width) / 2),
    y: Math.round(options.y ?? (shape === 'line' ? project.height / 2 : (project.height - height) / 2)),
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    stroke: options.stroke ?? '#ffffff',
    strokeWidth: options.strokeWidth ?? 16,
    fill: options.fill ?? 'transparent',
  };
  return touchProject({ ...project, layers: [...project.layers, layer] });
}

export function updateLayer(project: CanvasProject, id: string, patch: Partial<CanvasLayer>): CanvasProject {
  const layers = project.layers.map((layer) => (layer.id === id ? ({ ...layer, ...patch } as CanvasLayer) : layer));
  return touchProject({ ...project, layers });
}

export function moveLayer(project: CanvasProject, id: string, patch: { x?: number; y?: number; width?: number; height?: number; rotation?: number }): CanvasProject {
  return updateLayer(project, id, patch as Partial<CanvasLayer>);
}

export function removeLayer(project: CanvasProject, id: string): CanvasProject {
  return touchProject({ ...project, layers: project.layers.filter((layer) => layer.id !== id) });
}

export function toggleLayerVisibility(project: CanvasProject, id: string): CanvasProject {
  const layers = project.layers.map((layer) => (layer.id === id ? { ...layer, visible: !layer.visible } : layer));
  return touchProject({ ...project, layers });
}

export function toggleLayerLock(project: CanvasProject, id: string): CanvasProject {
  const layers = project.layers.map((layer) => (layer.id === id ? { ...layer, locked: !layer.locked } : layer));
  return touchProject({ ...project, layers });
}

export function bringForward(project: CanvasProject, id: string): CanvasProject {
  const index = project.layers.findIndex((layer) => layer.id === id);
  if (index < 0 || index === project.layers.length - 1) return project;
  const layers = [...project.layers];
  const [layer] = layers.splice(index, 1);
  layers.splice(index + 1, 0, layer);
  return touchProject({ ...project, layers });
}

export function duplicateLayer(project: CanvasProject, id: string): CanvasProject {
  const index = project.layers.findIndex((layer) => layer.id === id);
  if (index < 0) return project;
  const original = project.layers[index];
  const duplicate = {
    ...original,
    id: createId(original.type),
    name: `${original.name} copia`,
    x: original.x + 80,
    y: original.y + 80,
    locked: false,
  } as CanvasLayer;
  const layers = [...project.layers];
  layers.splice(index + 1, 0, duplicate);
  return touchProject({ ...project, layers });
}

export function sendBackward(project: CanvasProject, id: string): CanvasProject {
  const index = project.layers.findIndex((layer) => layer.id === id);
  if (index <= 0) return project;
  const layers = [...project.layers];
  const [layer] = layers.splice(index, 1);
  layers.splice(index - 1, 0, layer);
  return touchProject({ ...project, layers });
}
