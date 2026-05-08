import { buildPrintAwarePrompt } from './aiPrompt';
import type { GenerateAiRequest, GenerateAiResponse } from './types';

function encodeBase64(text: string): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(text).toString('base64');
  return btoa(unescape(encodeURIComponent(text)));
}

function escapeXml(text: string): string {
  return text.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char] ?? char);
}

export function createMockAiPreview(request: GenerateAiRequest): GenerateAiResponse {
  const fullPrompt = buildPrintAwarePrompt(request.prompt, request.project, request.settings);
  const escaped = escapeXml(fullPrompt);
  const lines = escaped.match(/.{1,74}(\s|$)/g)?.slice(0, 8).join('') ?? escaped;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#050505"/><stop offset="1" stop-color="#35101a"/></linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="1024" height="1536" fill="url(#g)"/>
  <circle cx="512" cy="744" r="315" fill="none" stroke="#ff2a55" stroke-width="7" opacity=".35"/>
  <path d="M188 918 C312 675 384 557 512 440 C640 557 712 675 836 918" fill="none" stroke="#ffffff" stroke-width="10" opacity=".82" filter="url(#glow)"/>
  <text x="512" y="210" text-anchor="middle" fill="#fff" font-family="Impact, Arial Black, Arial" font-size="78">DOMO CANVAS AI</text>
  <text x="512" y="292" text-anchor="middle" fill="#ff2a55" font-family="Arial" font-size="30">Preview simulado · conecta API para imagen real</text>
  <foreignObject x="116" y="1010" width="792" height="330"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial;color:white;font-size:30px;line-height:1.28;white-space:pre-wrap;text-align:center">${lines}</div></foreignObject>
  <text x="512" y="1410" text-anchor="middle" fill="#fff" opacity=".78" font-family="Arial" font-size="28">${request.project.layers.length} capas · ${request.project.strokes.length} trazos · ${request.settings.printPreset}</text>
</svg>`;
  return { imageDataUrl: `data:image/svg+xml;base64,${encodeBase64(svg)}`, provider: 'mock', model: 'mock-preview' };
}
