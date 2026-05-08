import type { AiProvider } from './types';

export interface ApiKeyGuide {
  title: string;
  url: string | null;
  steps: string[];
  safetyNote: string;
}

export function getApiKeyGuide(provider: AiProvider): ApiKeyGuide {
  if (provider === 'openai') {
    return {
      title: 'Cómo conseguir tu API key de OpenAI',
      url: 'https://platform.openai.com/api-keys',
      steps: [
        'Abre platform.openai.com/api-keys e inicia sesión.',
        'Presiona “Create new secret key”.',
        'Copia la clave una sola vez; OpenAI no vuelve a mostrarla.',
        'Pégala aquí y guarda configuración. La app la cifra/guarda localmente en tu PC.',
        'Asegúrate de tener billing activo en OpenAI para usar generación de imágenes.',
      ],
      safetyNote: 'No la compartas por chat ni la subas a GitHub. Si se filtra, revócala y genera una nueva.',
    };
  }

  if (provider === 'gemini') {
    return {
      title: 'Cómo conseguir tu API key de Gemini / Google AI Studio',
      url: 'https://aistudio.google.com/app/apikey',
      steps: [
        'Abre aistudio.google.com/app/apikey con tu cuenta de Google.',
        'Presiona “Create API key”.',
        'Elige o crea un proyecto de Google Cloud.',
        'Copia la clave, pégala aquí y guarda configuración.',
        'Si Google cambia el modelo disponible, ajusta el campo Modelo en esta misma pantalla.',
      ],
      safetyNote: 'No la compartas por chat ni la subas a GitHub. Puedes rotarla desde Google AI Studio si se filtra.',
    };
  }

  if (provider === 'custom') {
    return {
      title: 'Endpoint personalizado',
      url: null,
      steps: [
        'Pega la URL de tu endpoint en “Endpoint opcional”.',
        'Si tu endpoint usa Bearer token, pega la clave en “API key local”.',
        'El endpoint debe devolver imageDataUrl, image o url con el resultado generado.',
      ],
      safetyNote: 'La API key se manda solo como Authorization: Bearer y no se incluye dentro del cuerpo JSON.',
    };
  }

  return {
    title: 'Modo simulado sin costo',
    url: null,
    steps: [
      'No necesitas API key para probar el flujo.',
      'La app genera una vista simulada local para validar capas, prompt y exportación.',
      'Cambia a OpenAI o Gemini cuando quieras resultados reales.',
    ],
    safetyNote: 'Ideal para pruebas internas antes de gastar tokens.',
  };
}
