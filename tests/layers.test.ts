import { describe, expect, it } from 'vitest';
import { addImageLayer, addTextLayer, bringForward, duplicateLayer, moveLayer, removeLayer, resizeProject, toggleLayerVisibility } from '../src/core/layers';
import type { CanvasProject } from '../src/core/types';

const emptyProject = (): CanvasProject => ({
  id: 'p1',
  name: 'Demo',
  width: 4500,
  height: 5400,
  background: null,
  layers: [],
  strokes: [],
  aiHistory: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('layer model', () => {
  it('adds PNG/image layers above existing layers with sensible transform defaults', () => {
    const project = emptyProject();
    const updated = addImageLayer(project, { name: 'Logo', src: 'data:image/png;base64,abc', naturalWidth: 1000, naturalHeight: 500 });
    expect(updated.layers).toHaveLength(1);
    expect(updated.layers[0]).toMatchObject({ type: 'image', name: 'Logo', visible: true, opacity: 1, x: 1750, y: 2450 });
    expect(updated.layers[0].width).toBe(1000);
    expect(updated.layers[0].height).toBe(500);
  });

  it('adds editable text layers centered on the print area', () => {
    const updated = addTextLayer(emptyProject(), 'DOMO');
    expect(updated.layers[0]).toMatchObject({ type: 'text', text: 'DOMO', x: 2250, y: 2700, fontSize: 220, fill: '#ffffff' });
  });

  it('moves, brings forward, hides and removes layers without mutating the original project', () => {
    let project = addTextLayer(emptyProject(), 'A');
    project = addTextLayer(project, 'B');
    const firstId = project.layers[0].id;
    const secondId = project.layers[1].id;

    const moved = moveLayer(project, firstId, { x: 10, y: 20 });
    expect(moved.layers[0].x).toBe(10);
    expect(project.layers[0].x).not.toBe(10);

    const hidden = toggleLayerVisibility(moved, firstId);
    expect(hidden.layers[0].visible).toBe(false);

    const brought = bringForward(hidden, firstId);
    expect(brroughtIds(brought)).toEqual([secondId, firstId]);

    const removed = removeLayer(brought, secondId);
    expect(removed.layers.map((layer) => layer.id)).toEqual([firstId]);
  });
  it('duplicates a selected layer above the original with a new id and offset', () => {
    const project = addTextLayer(emptyProject(), 'DOMO');
    const original = project.layers[0];
    const updated = duplicateLayer(project, original.id);
    expect(updated.layers).toHaveLength(2);
    expect(updated.layers[1].id).not.toBe(original.id);
    expect(updated.layers[1].name).toContain('copia');
    expect(updated.layers[1].x).toBe(original.x + 80);
    expect(updated.layers[1].y).toBe(original.y + 80);
  });

  it('resizes the canvas without destroying layers, strokes, or AI history', () => {
    let project = addTextLayer(emptyProject(), 'DOMO');
    project.strokes.push({ id: 's1', tool: 'brush', points: [1, 2], color: '#fff', width: 8, opacity: 1 });
    project.aiHistory.push({ id: 'ai1', createdAt: '2026-01-01T00:00:00.000Z', provider: 'mock', model: 'mock', prompt: 'x', output: 'data:image/png;base64,x' });
    const resized = resizeProject(project, 3000, 4000);
    expect(resized.width).toBe(3000);
    expect(resized.height).toBe(4000);
    expect(resized.layers).toHaveLength(1);
    expect(resized.strokes).toHaveLength(1);
    expect(resized.aiHistory).toHaveLength(1);
    expect(project.width).toBe(4500);
  });
});

function brroughtIds(project: CanvasProject) {
  return project.layers.map((layer) => layer.id);
}
