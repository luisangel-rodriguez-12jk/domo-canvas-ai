# Domo Canvas AI

App de escritorio para Windows pensada como estudio creativo interno para Domo Streetwear: lienzo tipo Paint, imagen de fondo, capas PNG/logos, trazos, textos y panel para generar/editar diseños con IA.

## Funciones incluidas

- Lienzo textil 4500 x 5400 px, útil para playeras DTG/Printful.
- Cargar imagen de fondo: mockup, foto, referencia o boceto.
- Pegar PNG/JPG/WebP/SVG encima como capas editables.
- Mover, escalar, rotar, ocultar, bloquear, subir/bajar y eliminar capas.
- Pincel, borrador y máscara visual para indicar zonas a la IA.
- Agregar texto editable sobre el lienzo.
- Guardar/cargar proyectos `.domo.json`.
- Panel de propiedades para capa seleccionada: nombre, posición, tamaño, rotación, opacidad, texto, fuente, color y duplicado.
- Presets creativos rápidos para streetwear: gótico mexicano, serigrafía 3 tintas, vintage lavado, tattoo flash, Y2K metal, bordado y mockup premium.
- Exportar composición completa a PNG de mockup.
- Exportar “Arte PNG” con fondo/mockup/guías ocultos para archivo transparente de impresión.
- Mini biblioteca de assets Domo SVG: wordmark gótico, monograma D y calavera badge.
- Preflight de impresión con alertas de tamaño, arte vacío, capas ocultas, baja resolución y margen seguro.
- Panel de prompt creativo con reglas internas para diseño imprimible.
- Configuración local para API keys y modelos:
  - Mock/simulado sin costo.
  - OpenAI Images API.
  - Google Gemini / Nano Banana.
  - Endpoint personalizado.
- Guardado local de configuración en el perfil de la app. Las API keys no se pegan en chats. La app no vuelve a mostrar la API key guardada al renderer; si quieres cambiarla, escribe una nueva en Configuración y guarda.

## Stack

- Electron + React + TypeScript.
- Konva / react-konva para canvas y capas.
- Vite para desarrollo.
- Vitest para pruebas.
- electron-builder para generar instalador/portable de Windows.
- electron-updater para actualizaciones automáticas desde GitHub Releases.

## Ejecutar en desarrollo

```bash
cd /home/luisa/domo-canvas-ai
npm install
npm run dev
```

En Windows nativo sería equivalente dentro de la carpeta del proyecto:

```powershell
npm install
npm run dev
```

## Crear instalador de Windows

Para releases reales, lo recomendado es crear un tag y dejar que GitHub Actions compile en Windows. Si el repo aún no existe, usa el helper local sin pegar tokens en el chat:

```bash
export GITHUB_TOKEN='tu_token_local_con_scopes_repo_y_workflow'
./scripts/publish-github.sh
```

Ese script crea el repo público `luisangel-rodriguez-12jk/domo-canvas-ai`, hace push de `main`, crea/sube `v0.1.0` y dispara GitHub Actions.

Después, para nuevas releases:

```bash
git tag v0.1.1
git push origin v0.1.1
```

El workflow `.github/workflows/release.yml` ejecuta tests, typecheck y publica el instalador NSIS en GitHub Releases. La app instalada desde ese `.exe` revisa updates automáticamente al iniciar y también tiene un panel “Actualizaciones”.

Para build local en Windows nativo:

```powershell
npm install
npm run dist
```

La salida local queda en:

```text
release/
```

Genera instalador NSIS y versión portable. En WSL puede fallar el instalador final por falta de Wine; por eso GitHub Actions es la ruta buena.

## Configurar API

Abre la app y ve al panel “Configuración IA”. Ahí aparece una guía corta según el proveedor seleccionado, con enlace directo para crear la clave.

- OpenAI: https://platform.openai.com/api-keys
- Gemini / Google AI Studio: https://aistudio.google.com/app/apikey

No pegues claves en chats ni las subas a GitHub. Domo Canvas AI las guarda localmente en el perfil de la app y no las devuelve al renderer después de guardarlas.

### Modo simulado

Proveedor: `Simulado / sin costo`.

Sirve para probar el flujo sin gastar tokens.

### OpenAI Images

Proveedor: `OpenAI Images`.

Campos:

- API key: tu clave local de OpenAI.
- Modelo: `gpt-image-1` por defecto. Puedes cambiarlo si tu cuenta tiene modelos nuevos.
- Endpoint opcional: vacío usa `https://api.openai.com/v1/images/edits`.

La app manda la composición actual como imagen + prompt enriquecido para diseño textil.

### Gemini / Nano Banana

Proveedor: `Google Gemini / Nano Banana`.

Campos:

- API key: tu clave local de Google AI Studio.
- Modelo: `gemini-2.5-flash-image-preview` por defecto.
- Endpoint opcional: vacío usa el endpoint `generateContent` de Google.

### Endpoint personalizado

Proveedor: `Endpoint personalizado`.

La app hace POST JSON con:

```json
{
  "prompt": "prompt enriquecido",
  "image": "data:image/png;base64,...",
  "project": {},
  "settings": {}
}
```

Tu endpoint debe devolver una de estas propiedades:

```json
{
  "imageDataUrl": "data:image/png;base64,..."
}
```

o:

```json
{
  "url": "https://.../resultado.png"
}
```

## Uso recomendado para Domo

1. Carga un mockup o fondo de playera negra.
2. Pega el PNG del logo Domo como capa.
3. Usa pincel/máscara para marcar dónde quieres flamas, serpientes, alas, texturas, etc.
4. Escribe una instrucción como:

```text
Integra el logo con una serpiente estilo tatuaje mexicano, alto contraste, tinta blanca y roja, fondo transparente, composición centrada para playera negra.
```

5. Genera con IA.
6. Si el resultado te gusta, pégalo como capa.
7. Revisa el panel “Preflight impresión”.
8. Usa “Exportar mockup” para redes o revisión visual.
9. Usa “Arte PNG” para sacar un PNG transparente sin mockup/guías, pensado para producción.

## Notas importantes

- Para preservar logos exactos, lo mejor es usar la IA para generar el arte alrededor y luego mantener el logo PNG original encima como capa.
- Para texto exacto, usa capas de texto de la app; la IA puede deformar letras.
- Para impresión real, revisa legibilidad, contraste, cantidad de colores y tamaño final antes de mandar a producción.

## Verificación

```bash
npm test
npm run typecheck
npm run build
```
