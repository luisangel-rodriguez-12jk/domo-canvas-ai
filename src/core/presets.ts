export interface PromptPreset {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

export const promptPresets: PromptPreset[] = [
  {
    id: 'gothic-mexican',
    name: 'Gótico mexicano',
    description: 'Santo barrio, tatuaje, alto contraste.',
    prompt: 'Diseño streetwear gótico mexicano, alto contraste, símbolos de barrio, composición agresiva pero limpia, tinta blanca con acentos rojo oscuro, listo para playera negra.',
  },
  {
    id: 'screenprint-3-inks',
    name: 'Serigrafía 3 tintas',
    description: 'Máximo control de colores.',
    prompt: 'Convierte la composición en arte de serigrafía con máximo 3 tintas planas, bordes definidos, sin degradados finos, separación visual clara y fondo transparente.',
  },
  {
    id: 'vintage-washed',
    name: 'Vintage lavado',
    description: 'Textura gastada tipo prenda usada.',
    prompt: 'Arte vintage lavado para playera, textura distressed, apariencia de tinta desgastada, composición centrada y legible, sin fondo fotográfico.',
  },
  {
    id: 'tattoo-flash',
    name: 'Tattoo flash',
    description: 'Líneas fuertes y sombras clásicas.',
    prompt: 'Reinterpreta los trazos como tattoo flash: línea negra fuerte, sombras limitadas, iconografía callejera, composición compacta e imprimible.',
  },
  {
    id: 'y2k-metal',
    name: 'Y2K metal',
    description: 'Cromos, puntas, energía 2000s.',
    prompt: 'Diseño Y2K metal para streetwear: formas filosas, brillo cromado controlado, energía futurista oscura, logo como pieza central sin deformarlo.',
  },
  {
    id: 'embroidery-ready',
    name: 'Listo para bordado',
    description: 'Simplifica detalle para puntadas.',
    prompt: 'Simplifica el diseño para bordado: formas grandes, contornos claros, pocos colores, sin detalles microscópicos, conserva silueta y legibilidad del logo.',
  },
  {
    id: 'premium-mockup',
    name: 'Mockup premium',
    description: 'Imagen comercial para redes/tienda.',
    prompt: 'Crea una presentación premium para tienda online: diseño aplicado en playera streetwear, iluminación editorial, fondo oscuro sobrio, sensación de marca de moda.',
  },
];

export function applyPromptPreset(id: string, userIdea: string): string {
  const preset = promptPresets.find((item) => item.id === id);
  const idea = userIdea.trim();
  if (!preset) return idea;
  return `${preset.prompt}\n\nIdea específica del usuario: ${idea || 'usa la composición actual como base principal.'}`;
}
