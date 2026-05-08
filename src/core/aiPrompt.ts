
import type { AiSettings, CanvasProject } from './types';

export function buildPrintAwarePrompt(userPrompt: string, project: CanvasProject, settings: AiSettings): string {
  const printRules = [
    'Actúa como director creativo experto en diseño de playeras streetwear.',
    `Lienzo destino: ${project.width}x${project.height}px, composición centrada para impresión.`,
    `Tipo de salida: ${settings.printPreset}.`,
    settings.transparentBackground ? 'Entrega un diseño con fondo transparente cuando el proveedor lo permita.' : 'Puedes conservar fondo/mockup si ayuda a evaluar la composición.',
    settings.preserveLogos ? 'Preserva logotipos y textos exactos; si no puedes, genera el arte alrededor y deja espacios limpios para reponerlos encima.' : 'Puedes reinterpretar logotipos si mejora el concepto.',
    `Limita la paleta visual a aproximadamente ${settings.maxColors} colores principales si es viable.`,
    'La salida debe verse ultrarrealista y fotorealista: materiales textiles creíbles, iluminación física, sombras naturales, textura de tinta/tela real y cero apariencia plástica o caricaturesca salvo que el usuario lo pida explícitamente.',
    'Evita fondos fotográficos innecesarios, detalles microscópicos imposibles de imprimir y texto deformado.',
  ];

  return `${printRules.join('\n')}\n\nInstrucción del usuario:\n${userPrompt.trim()}`;
}
