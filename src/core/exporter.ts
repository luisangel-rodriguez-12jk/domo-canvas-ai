import { makeSafeFileName } from './projectIO';
import type { CanvasProject } from './types';

export type ExportMode = 'mockup-preview' | 'transparent-artwork';

interface ExportStageNode {
  visible(value?: boolean): boolean;
}

interface ExportStageLike {
  width(): number;
  find(selector: string): ExportStageNode[];
  batchDraw?(): void;
  toDataURL(options: { mimeType: string; pixelRatio: number }): string;
}

const TRANSPARENT_EXPORT_SELECTORS = ['.canvas-backdrop', '.print-safe-guide', '.mockup-background'];

export function makeExportFileName(projectName: string, mode: ExportMode): string {
  const suffix = mode === 'transparent-artwork' ? 'arte-transparente' : 'mockup';
  return `${makeSafeFileName(projectName)}-${suffix}.png`;
}

export function exportStageDataUrl(stage: ExportStageLike, project: CanvasProject, options: { mode: ExportMode }): string {
  const pixelRatio = Math.max(1, project.width / Math.max(1, stage.width()));
  if (options.mode === 'mockup-preview') {
    return stage.toDataURL({ mimeType: 'image/png', pixelRatio });
  }

  const hiddenNodes = TRANSPARENT_EXPORT_SELECTORS.flatMap((selector) => stage.find(selector));
  const previousVisibility = hiddenNodes.map((node) => ({ node, visible: node.visible() }));

  hiddenNodes.forEach((node) => node.visible(false));
  stage.batchDraw?.();
  try {
    return stage.toDataURL({ mimeType: 'image/png', pixelRatio });
  } finally {
    previousVisibility.forEach(({ node, visible }) => node.visible(visible));
    stage.batchDraw?.();
  }
}
