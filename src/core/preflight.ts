import type { CanvasProject, ImageLayer } from './types';

export type PreflightSeverity = 'ok' | 'warning' | 'error';

export interface PreflightIssue {
  code: 'canvas-size' | 'empty-artwork' | 'low-res-source' | 'hidden-layers' | 'safe-area' | 'ready';
  severity: PreflightSeverity;
  title: string;
  detail: string;
}

const EXPECTED_WIDTH = 4500;
const EXPECTED_HEIGHT = 5400;
const LOW_RES_SOURCE_MIN = 900;
const SAFE_MARGIN = 180;

export function getPreflightIssues(project: CanvasProject): PreflightIssue[] {
  const issues: PreflightIssue[] = [];
  const visibleLayers = project.layers.filter((layer) => layer.visible);
  const visibleStrokes = project.strokes.filter((stroke) => stroke.points.length >= 4 && stroke.opacity > 0);

  if (project.width !== EXPECTED_WIDTH || project.height !== EXPECTED_HEIGHT) {
    issues.push({
      code: 'canvas-size',
      severity: 'warning',
      title: 'Tamaño de lienzo no estándar',
      detail: `El archivo está en ${project.width}×${project.height}px. Para DTG/Printful conviene ${EXPECTED_WIDTH}×${EXPECTED_HEIGHT}px a 300 DPI.`,
    });
  }

  if (visibleLayers.length === 0 && visibleStrokes.length === 0) {
    issues.push({
      code: 'empty-artwork',
      severity: 'error',
      title: 'No hay arte visible',
      detail: 'Agrega texto, PNG, resultado IA o pinceladas antes de exportar para impresión.',
    });
  }

  const hiddenCount = project.layers.filter((layer) => !layer.visible).length;
  if (hiddenCount > 0) {
    issues.push({
      code: 'hidden-layers',
      severity: 'warning',
      title: 'Hay capas ocultas',
      detail: `${hiddenCount} capa(s) no saldrán en el PNG exportado. Revisa si era intencional.`,
    });
  }

  const lowResLayers = project.layers
    .filter((layer): layer is ImageLayer => layer.type === 'image')
    .filter((layer) => Math.min(layer.naturalWidth, layer.naturalHeight) < LOW_RES_SOURCE_MIN);
  if (lowResLayers.length > 0) {
    issues.push({
      code: 'low-res-source',
      severity: 'warning',
      title: 'Imagen de baja resolución',
      detail: `${lowResLayers.map((layer) => layer.name).join(', ')} puede verse pixeleada si se imprime grande.`,
    });
  }

  const outsideSafeArea = visibleLayers.filter((layer) => (
    layer.x < SAFE_MARGIN ||
    layer.y < SAFE_MARGIN ||
    layer.x + layer.width > project.width - SAFE_MARGIN ||
    layer.y + layer.height > project.height - SAFE_MARGIN
  ));
  if (outsideSafeArea.length > 0) {
    issues.push({
      code: 'safe-area',
      severity: 'warning',
      title: 'Arte cerca del borde',
      detail: `${outsideSafeArea.length} capa(s) salen del margen guía. Está bien para full print, pero revisa centrado si es DTG normal.`,
    });
  }

  if (issues.length === 0) {
    issues.push({
      code: 'ready',
      severity: 'ok',
      title: 'Listo para impresión',
      detail: 'Lienzo 4500×5400 px, arte visible y sin alertas críticas.',
    });
  }

  return issues;
}

export function getPrintReadinessLabel(project: CanvasProject): string {
  const issues = getPreflightIssues(project);
  if (issues.some((issue) => issue.severity === 'error')) return 'Falta arte';
  if (issues.some((issue) => issue.severity === 'warning')) return 'Revisar antes de imprimir';
  return 'Listo para impresión';
}
