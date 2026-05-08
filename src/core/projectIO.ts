import type { CanvasProject } from './types';
import { createProject, touchProject } from './layers';

export interface ProjectSnapshot {
  schema: 'domo-canvas-ai/project';
  version: 1;
  exportedAt: string;
  project: CanvasProject;
}

export function makeSafeFileName(name: string): string {
  const safe = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return safe || 'domo-canvas-ai';
}

export function createProjectSnapshot(project: CanvasProject): ProjectSnapshot {
  return {
    schema: 'domo-canvas-ai/project',
    version: 1,
    exportedAt: new Date().toISOString(),
    project,
  };
}

export function loadProjectSnapshot(rawJson: string): CanvasProject {
  let parsed: ProjectSnapshot;
  try {
    parsed = JSON.parse(rawJson) as ProjectSnapshot;
  } catch (error) {
    throw new Error(`El archivo no es JSON válido: ${error instanceof Error ? error.message : 'error desconocido'}`);
  }

  if (parsed.schema !== 'domo-canvas-ai/project' || parsed.version !== 1 || !parsed.project) {
    throw new Error('El archivo no parece ser un proyecto Domo Canvas AI válido.');
  }

  const fallback = createProject(parsed.project.name || 'Proyecto Domo');
  const project: CanvasProject = {
    ...fallback,
    ...parsed.project,
    width: Number(parsed.project.width) || fallback.width,
    height: Number(parsed.project.height) || fallback.height,
    background: parsed.project.background ?? null,
    layers: Array.isArray(parsed.project.layers) ? parsed.project.layers : [],
    strokes: Array.isArray(parsed.project.strokes) ? parsed.project.strokes : [],
    aiHistory: Array.isArray(parsed.project.aiHistory) ? parsed.project.aiHistory : [],
  };

  return touchProject(project);
}
