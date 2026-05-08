import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { addShapeLayer, addTextLayer, createProject } from '../src/core/layers';
import { getModelsForProvider, providerOptions } from '../src/core/aiModels';
import { buildPrintAwarePrompt } from '../src/core/aiPrompt';
import { defaultSettings } from '../src/core/settings';

const appSource = () => readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8');
const toolbarSource = () => readFileSync(join(process.cwd(), 'src/components/Toolbar.tsx'), 'utf8');
const canvasSource = () => readFileSync(join(process.cwd(), 'src/components/CanvasEditor.tsx'), 'utf8');
const settingsSource = () => readFileSync(join(process.cwd(), 'src/components/SettingsPanel.tsx'), 'utf8');
const mainSource = () => readFileSync(join(process.cwd(), 'electron/main.ts'), 'utf8');

describe('requested editor UX upgrades', () => {
  it('supports multiline text layers and font-family changes', () => {
    const project = createProject('Texto');
    const updated = addTextLayer(project, 'DOMO\nSTREETWEAR', { fontFamily: 'Bebas Neue, Impact, sans-serif' });
    expect(updated.layers[0]).toMatchObject({
      type: 'text',
      text: 'DOMO\nSTREETWEAR',
      fontFamily: 'Bebas Neue, Impact, sans-serif',
    });
    expect(updated.layers[0].height).toBeGreaterThan(300);
  });

  it('adds simple shape layers with optional fill', () => {
    let project = createProject('Formas');
    project = addShapeLayer(project, 'rect', { stroke: '#ffffff', fill: 'transparent', strokeWidth: 18 });
    project = addShapeLayer(project, 'circle', { stroke: '#ff2a55', fill: '#111111' });
    project = addShapeLayer(project, 'line', { stroke: '#00ff88', fill: 'transparent' });
    expect(project.layers.map((layer) => layer.type)).toEqual(['shape', 'shape', 'shape']);
    expect(project.layers[0]).toMatchObject({ shape: 'rect', fill: 'transparent', strokeWidth: 18 });
    expect(project.layers[1]).toMatchObject({ shape: 'circle', fill: '#111111' });
    expect(project.layers[2]).toMatchObject({ shape: 'line' });
  });

  it('uses curated provider/model options instead of forcing users to type model ids', () => {
    expect(providerOptions.map((provider) => provider.id)).toEqual(['mock', 'openai', 'gemini', 'custom']);
    expect(getModelsForProvider('openai').map((model) => model.id)).toContain('gpt-image-1');
    expect(getModelsForProvider('gemini').map((model) => model.id)).toContain('gemini-2.5-flash-image-preview');
  });

  it('makes photorealism a non-negotiable AI instruction', () => {
    const prompt = buildPrintAwarePrompt('Un jaguar gótico', createProject('AI'), defaultSettings.ai);
    expect(prompt.toLowerCase()).toContain('ultrarrealista');
    expect(prompt.toLowerCase()).toContain('fotorealista');
  });

  it('has source hooks for inline canvas text editing, ctrl+z, app-owned tooltips and brush palette', () => {
    expect(canvasSource()).toContain('text-edit-overlay');
    expect(canvasSource()).toContain('onDblClick');
    expect(appSource()).toContain("event.key.toLowerCase() === 'z'");
    expect(toolbarSource()).toContain('data-tooltip');
    expect(toolbarSource()).not.toContain('title={description}');
    expect(toolbarSource()).toContain('brush-palette');
  });

  it('switches to move after image insertion and resets file input so reused backgrounds load reliably', () => {
    expect(appSource()).toContain("setTool('select')");
    expect(appSource()).toContain("fileInputRef.current.value = ''");
  });

  it('asks before starting a new unsaved design and exposes AI save/regenerate actions', () => {
    expect(appSource()).toContain('Hay cambios sin guardar');
    expect(appSource()).toContain('saveAiOutput');
    expect(appSource()).toContain('aiRevisionPrompt');
  });

  it('uses selects for provider/model and alerts when settings are saved', () => {
    expect(settingsSource()).toContain('getModelsForProvider');
    expect(settingsSource()).toContain('<select');
    expect(appSource()).toContain('Configuración guardada');
    expect(appSource()).toContain('window.alert');
  });

  it('asks whether to keep stored API keys before installing an update', () => {
    expect(mainSource()).toContain('confirmPreserveApiKeysBeforeUpdate');
    expect(mainSource()).toContain('Conservar APIs guardadas');
  });

  it('replaces fixed prompt preset buttons with user-saved custom prompts', () => {
    expect(appSource()).not.toContain('promptPresets.map');
    expect(appSource()).toContain('savedPrompts');
    expect(appSource()).toContain('saveCustomPrompt');
    expect(appSource()).toContain('domo.savedPrompts.v1');
  });

  it('records a metaprompt on brush strokes and injects stroke meanings into AI prompt context', () => {
    expect(canvasSource()).toContain('brushMetaPrompt');
    expect(canvasSource()).toContain('metaPrompt: brushMetaPrompt.trim()');
    const project = createProject('Trazo');
    project.strokes.push({ id: 's1', tool: 'brush', points: [0, 0, 10, 10], color: '#fff', width: 12, opacity: 1, metaPrompt: 'Trazo de textura bordada y forma geométrica' });
    const prompt = buildPrintAwarePrompt('Usa mis trazos', project, defaultSettings.ai);
    expect(prompt).toContain('Trazo de textura bordada');
  });

  it('exposes AI generation modes for background images and transparent library elements', () => {
    expect(appSource()).toContain('generateAiBackground');
    expect(appSource()).toContain('generateAiLibraryAsset');
    expect(appSource()).toContain('sin fondo');
    expect(appSource()).toContain('generatedAssets');
    expect(appSource()).toContain('extraAssets={generatedAssets}');
  });
});
