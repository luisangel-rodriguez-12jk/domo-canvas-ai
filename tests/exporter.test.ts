import { describe, expect, it } from 'vitest';
import { exportStageDataUrl, makeExportFileName } from '../src/core/exporter';
import type { CanvasProject } from '../src/core/types';

class FakeNode {
  visibleState = true;
  constructor(public selector: string) {}
  visible(value?: boolean) {
    if (typeof value === 'boolean') this.visibleState = value;
    return this.visibleState;
  }
}

class FakeStage {
  calls: string[] = [];
  private nodes = [new FakeNode('.canvas-backdrop'), new FakeNode('.print-safe-guide'), new FakeNode('.mockup-background')];
  width() { return 900; }
  find(selector: string) { return this.nodes.filter((node) => node.selector === selector); }
  batchDraw() { this.calls.push('batchDraw'); }
  toDataURL(options: { mimeType: string; pixelRatio: number }) {
    this.calls.push(`toDataURL:${options.mimeType}:${options.pixelRatio}`);
    return 'data:image/png;base64,exported';
  }
  allVisible() { return this.nodes.every((node) => node.visibleState); }
}

const project: CanvasProject = {
  id: 'p1',
  name: 'Domo Diseño Ñandú',
  width: 4500,
  height: 5400,
  background: null,
  layers: [],
  strokes: [],
  aiHistory: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('export helpers', () => {
  it('exports a transparent print file by temporarily hiding canvas guides and mockup background', () => {
    const stage = new FakeStage();
    const dataUrl = exportStageDataUrl(stage, project, { mode: 'transparent-artwork' });
    expect(dataUrl).toBe('data:image/png;base64,exported');
    expect(stage.calls).toEqual(['batchDraw', 'toDataURL:image/png:5', 'batchDraw']);
    expect(stage.allVisible()).toBe(true);
  });

  it('keeps the mockup background visible for preview exports', () => {
    const stage = new FakeStage();
    exportStageDataUrl(stage, project, { mode: 'mockup-preview' });
    expect(stage.calls).toEqual(['toDataURL:image/png:5']);
    expect(stage.allVisible()).toBe(true);
  });

  it('builds safe export file names with mode suffixes', () => {
    expect(makeExportFileName(project.name, 'transparent-artwork')).toBe('domo-diseno-nandu-arte-transparente.png');
    expect(makeExportFileName(project.name, 'mockup-preview')).toBe('domo-diseno-nandu-mockup.png');
  });
});
