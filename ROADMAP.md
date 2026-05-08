# Roadmap de Domo Canvas AI

## Versión 0.1 actual

- Editor de escritorio con Electron.
- Canvas con fondo, capas, texto, pincel, borrador y máscara IA.
- Panel para configurar API keys.
- Integración base con OpenAI, Gemini y endpoint personalizado.
- Exportación PNG separada: mockup completo y arte transparente sin guías/fondo.
- Guardar/cargar proyectos `.domo.json`.
- Presets creativos Domo para prompts textiles.
- Mini biblioteca local de assets Domo SVG.
- Preflight de impresión para detectar arte vacío, tamaño no estándar, capas ocultas, imágenes baja resolución y margen seguro.
- Panel de propiedades y duplicado de capas.
- Mock IA local para probar el flujo sin API.
- Auto-updates vía electron-updater + GitHub Releases (instalador NSIS).
- Guía integrada para conseguir API keys de OpenAI/Gemini desde Configuración.
- Endurecimiento inicial: CSP, ruta de producción corregida, API key redacted al renderer y endpoint custom sin API key en body.

## Siguiente mejora recomendada

1. Paletas Domo predefinidas.
2. Plantillas de playera: pecho, espalda, manga, etiqueta.
3. Historial visual de generaciones.
4. Herramienta “preservar logo exacto”: generar arte debajo y reponer capa de logo arriba automáticamente.
5. Vectorización opcional con Potrace/SVG.
6. Empaque Windows firmado.
7. Pipeline Printful/maquila: exportar nombre, mockup, descripción y archivo imprimible.
