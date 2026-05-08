import { describe, expect, it } from 'vitest';
import { getPreflightIssues, getPrintReadinessLabel } from '../src/core/preflight';
import { addImageLayer, addTextLayer, createProject } from '../src/core/layers';

describe('print preflight', () => {
  it('marks a 4500x5400 design with visible content as ready for DTG export', () => {
    const project = addTextLayer(createProject('Ready', 4500, 5400), 'DOMO');
    expect(getPrintReadinessLabel(project)).toBe('Listo para impresión');
    expect(getPreflightIssues(project).filter((issue) => issue.severity !== 'ok')).toEqual([]);
  });

  it('warns when the canvas dimensions are not the expected Printful/DTG size', () => {
    const project = addTextLayer(createProject('Small', 1024, 1024), 'DOMO');
    expect(getPreflightIssues(project).some((issue) => issue.code === 'canvas-size')).toBe(true);
    expect(getPrintReadinessLabel(project)).toBe('Revisar antes de imprimir');
  });

  it('reports missing artwork as an error', () => {
    const project = createProject('Empty', 4500, 5400);
    expect(getPreflightIssues(project).some((issue) => issue.code === 'empty-artwork' && issue.severity === 'error')).toBe(true);
    expect(getPrintReadinessLabel(project)).toBe('Falta arte');
  });

  it('warns about low resolution bitmap source layers', () => {
    const project = addImageLayer(createProject('Low res'), { name: 'Logo low', src: 'data:image/png;base64,abc', naturalWidth: 320, naturalHeight: 280 });
    expect(getPreflightIssues(project).some((issue) => issue.code === 'low-res-source')).toBe(true);
  });
});
