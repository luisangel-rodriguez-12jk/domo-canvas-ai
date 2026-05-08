import { describe, expect, it } from 'vitest';
import { createProject, addTextLayer } from '../src/core/layers';
import { createProjectSnapshot, loadProjectSnapshot, makeSafeFileName } from '../src/core/projectIO';

describe('project IO', () => {
  it('creates a portable snapshot and restores a valid editable project', () => {
    const project = addTextLayer(createProject('Mi diseño / raro', 4500, 5400), 'DOMO');
    const snapshot = createProjectSnapshot(project);
    expect(snapshot.schema).toBe('domo-canvas-ai/project');
    expect(snapshot.version).toBe(1);
    expect(snapshot.project.layers).toHaveLength(1);

    const restored = loadProjectSnapshot(JSON.stringify(snapshot));
    expect(restored.name).toBe('Mi diseño / raro');
    expect(restored.width).toBe(4500);
    expect(restored.height).toBe(5400);
    expect(restored.layers[0].type).toBe('text');
    expect(restored.updatedAt).toBeTruthy();
  });

  it('rejects invalid project snapshots instead of loading unknown data', () => {
    expect(() => loadProjectSnapshot('{"schema":"wrong"}')).toThrow(/proyecto Domo/i);
    expect(() => loadProjectSnapshot('not-json')).toThrow(/JSON/i);
  });

  it('creates filesystem-safe filenames for project exports', () => {
    expect(makeSafeFileName('Domo: logo/calavera?')).toBe('domo-logo-calavera');
    expect(makeSafeFileName('   ')).toBe('domo-canvas-ai');
  });
});
