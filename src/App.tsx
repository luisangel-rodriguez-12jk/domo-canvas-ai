import { useCallback, useEffect, useRef, useState } from 'react';
import type Konva from 'konva';
import { AssetLibrary } from './components/AssetLibrary';
import { CanvasEditor } from './components/CanvasEditor';
import { LayerPanel } from './components/LayerPanel';
import { LayerProperties } from './components/LayerProperties';
import { PreflightPanel } from './components/PreflightPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { Toolbar } from './components/Toolbar';
import { UpdatePanel } from './components/UpdatePanel';
import { addImageLayer, addShapeLayer, addTextLayer, createProject, touchProject } from './core/layers';
import { buildPrintAwarePrompt } from './core/aiPrompt';
import { createMockAiPreview } from './core/mockAi';
import { exportStageDataUrl, makeExportFileName, type ExportMode } from './core/exporter';
import { createProjectSnapshot, loadProjectSnapshot, makeSafeFileName } from './core/projectIO';
import { defaultSettings, mergeSettings } from './core/settings';
import type { AiHistoryItem, AppSettings, CanvasProject, GenerateAiResponse, LibraryAsset, SavedPrompt, ShapeLayer, ToolMode } from './core/types';

const SAVED_PROMPTS_KEY = 'domo.savedPrompts.v1';

async function readImageFile(file: File) {
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const image = await loadImageElement(src);
  return { src, width: image.naturalWidth, height: image.naturalHeight };
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function loadSavedPrompts(): SavedPrompt[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SAVED_PROMPTS_KEY) || '[]') as SavedPrompt[];
    return Array.isArray(parsed) ? parsed.filter((prompt) => prompt?.id && prompt?.text) : [];
  } catch {
    return [];
  }
}

function persistSavedPrompts(prompts: SavedPrompt[]) {
  window.localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(prompts.slice(0, 40)));
}

const isTextEntry = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable;
};

export default function App() {
  const [project, setProject] = useState<CanvasProject>(() => createProject('Domo playera 01'));
  const [undoStack, setUndoStack] = useState<CanvasProject[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [tool, setTool] = useState<ToolMode>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [brushWidth, setBrushWidth] = useState(24);
  const [brushMetaPrompt, setBrushMetaPrompt] = useState('');
  const [shapeFill, setShapeFill] = useState('transparent');
  const [prompt, setPrompt] = useState('Integra las capas y rayones en un diseño streetwear para playera negra, alto contraste, ultrarrealista, fondo transparente, listo para impresión.');
  const [promptName, setPromptName] = useState('');
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>(() => loadSavedPrompts());
  const [aiRevisionPrompt, setAiRevisionPrompt] = useState('');
  const [generatedAssets, setGeneratedAssets] = useState<LibraryAsset[]>([]);
  const [status, setStatus] = useState('Listo. Puedes cargar fondo, logos PNG y dibujar encima.');
  const [aiOutput, setAiOutput] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const projectRef = useRef(project);
  const stageRef = useRef<Konva.Stage | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingBackgroundRef = useRef(false);

  useEffect(() => { projectRef.current = project; }, [project]);

  const commitProject = useCallback((next: CanvasProject | ((current: CanvasProject) => CanvasProject), markDirty = true) => {
    setProject((current) => {
      const updated = typeof next === 'function' ? next(current) : next;
      if (updated !== current) {
        setUndoStack((stack) => [current, ...stack].slice(0, 60));
        if (markDirty) setIsDirty(true);
      }
      return updated;
    });
  }, []);

  const undoLast = useCallback(() => {
    setUndoStack((stack) => {
      const [previous, ...rest] = stack;
      if (!previous) {
        setStatus('No hay más cambios para deshacer.');
        return stack;
      }
      setProject(previous);
      setSelectedId(null);
      setIsDirty(true);
      setStatus('Cambio deshecho con Ctrl+Z.');
      return rest;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey && !isTextEntry(event.target)) {
        event.preventDefault();
        undoLast();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoLast]);

  useEffect(() => {
    window.domo?.getSettings().then((loaded) => setSettings(mergeSettings(loaded))).catch(() => setSettings(defaultSettings));
  }, []);

  const saveCustomPrompt = () => {
    const text = prompt.trim();
    if (!text) {
      setStatus('Escribe un prompt antes de guardarlo.');
      return;
    }
    const name = promptName.trim() || text.replace(/\s+/g, ' ').slice(0, 42) || 'Prompt custom';
    const next: SavedPrompt[] = [
      { id: `prompt-${Date.now().toString(36)}`, name, text, createdAt: new Date().toISOString() },
      ...savedPrompts.filter((item) => item.text !== text),
    ].slice(0, 40);
    setSavedPrompts(next);
    persistSavedPrompts(next);
    setPromptName('');
    setStatus(`Prompt custom guardado: ${name}`);
  };

  const deleteCustomPrompt = (id: string) => {
    const next = savedPrompts.filter((item) => item.id !== id);
    setSavedPrompts(next);
    persistSavedPrompts(next);
    setStatus('Prompt custom eliminado.');
  };

  const addImage = (asBackground = false) => {
    pendingBackgroundRef.current = asBackground;
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  };

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setStatus(`Cargando ${file.name}…`);
    try {
      const loaded = await readImageFile(file);
      commitProject((current) => addImageLayer(current, { name: file.name, src: loaded.src, naturalWidth: loaded.width, naturalHeight: loaded.height, asBackground: pendingBackgroundRef.current }));
      setTool('select');
      setStatus(pendingBackgroundRef.current ? 'Fondo cargado. Herramienta Mover activada para evitar rayones accidentales.' : 'Imagen/PNG agregado como capa editable. Herramienta Mover activada.');
    } catch (error) {
      setStatus(error instanceof Error ? `No se pudo cargar la imagen: ${error.message}` : 'No se pudo cargar la imagen.');
    } finally {
      pendingBackgroundRef.current = false;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const exportCanvas = async (mode: ExportMode) => {
    const stage = stageRef.current;
    if (!stage) return;
    const dataUrl = exportStageDataUrl(stage, project, { mode });
    const result = await window.domo?.saveDataUrl(dataUrl, makeExportFileName(project.name, mode));
    const label = mode === 'transparent-artwork' ? 'arte transparente para impresión' : 'mockup completo';
    setStatus(result?.canceled ? 'Exportación cancelada.' : `PNG ${label} guardado: ${result?.filePath}`);
  };

  const saveProjectFile = async () => {
    const snapshot = createProjectSnapshot(projectRef.current);
    const json = JSON.stringify(snapshot, null, 2);
    const result = await window.domo?.saveProject(json, `${makeSafeFileName(projectRef.current.name)}.domo.json`);
    if (!result || result.canceled) {
      setStatus('Guardado de proyecto cancelado.');
      return false;
    }
    setIsDirty(false);
    setStatus(`Proyecto guardado: ${result.filePath}`);
    return true;
  };

  const newProject = async () => {
    if (isDirty) {
      const wantsSave = window.confirm('Hay cambios sin guardar. ¿Quieres guardar antes de crear un diseño nuevo?');
      if (wantsSave) {
        const saved = await saveProjectFile();
        if (!saved) return;
      } else if (!window.confirm('Crear diseño nuevo sin guardar los cambios actuales?')) {
        setStatus('Proyecto nuevo cancelado para conservar el diseño actual.');
        return;
      }
    }
    setProject(createProject(`Domo playera ${new Date().toLocaleDateString('es-MX')}`));
    setUndoStack([]);
    setIsDirty(false);
    setSelectedId(null);
    setTool('select');
    setAiOutput(null);
    setAiRevisionPrompt('');
    setStatus('Proyecto nuevo creado.');
  };

  const openProjectFile = async () => {
    try {
      const result = await window.domo?.openProject();
      if (!result || result.canceled || !result.projectJson) {
        setStatus('Apertura de proyecto cancelada.');
        return;
      }
      const loaded = loadProjectSnapshot(result.projectJson);
      setProject(loaded);
      setUndoStack([]);
      setIsDirty(false);
      setSelectedId(null);
      setTool('select');
      setAiOutput(loaded.aiHistory[0]?.output ?? null);
      setStatus(`Proyecto abierto: ${result.filePath}`);
    } catch (error) {
      setStatus(error instanceof Error ? `No se pudo abrir el proyecto: ${error.message}` : 'No se pudo abrir el proyecto.');
    }
  };

  const saveSettings = async () => {
    const saved = await window.domo?.saveSettings(settings);
    if (saved) setSettings(saved);
    const message = 'Configuración guardada localmente. Tus API keys quedaron en el perfil local de Domo Canvas AI.';
    setStatus(message);
    window.alert(message);
  };

  const requestAiImage = async (activePrompt: string, statusMessage: string): Promise<GenerateAiResponse | null> => {
    const stage = stageRef.current;
    if (!stage) return null;
    setIsGenerating(true);
    setStatus(statusMessage);
    try {
      const compositionPng = stage.toDataURL({ mimeType: 'image/png', pixelRatio: Math.max(1, projectRef.current.width / stage.width()) });
      const request = { prompt: activePrompt, compositionPng, project: projectRef.current, settings: settings.ai };
      const response = window.domo ? await window.domo.generateImage(request) : createMockAiPreview(request);
      setAiOutput(response.imageDataUrl);
      const history: AiHistoryItem = {
        id: `ai-${Date.now().toString(36)}`,
        createdAt: new Date().toISOString(),
        provider: response.provider,
        model: response.model,
        prompt: buildPrintAwarePrompt(activePrompt, projectRef.current, settings.ai),
        output: response.imageDataUrl,
      };
      commitProject((current) => touchProject({ ...current, aiHistory: [history, ...current.aiHistory].slice(0, 20) }));
      return response;
    } catch (error) {
      setStatus(error instanceof Error ? `Error IA: ${error.message}` : 'Error IA desconocido.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAi = async (promptOverride?: string) => {
    const activePrompt = promptOverride ?? prompt;
    const response = await requestAiImage(activePrompt, 'Componiendo imagen ultrarrealista y enviando a IA…');
    if (response) setStatus(`IA completada con ${response.provider}/${response.model}. Puedes guardarla, pegarla como capa o regenerarla con cambios.`);
  };

  const generateAiBackground = async () => {
    const backgroundPrompt = `${prompt}\n\nModo fondo: genera una imagen de fondo/mockup ultrarrealista para previsualizar playeras, con iluminación real, tela creíble y composición útil para diseño streetwear. No agregues texto nuevo salvo que el usuario lo pida.`;
    const response = await requestAiImage(backgroundPrompt, 'Generando fondo IA ultrarrealista…');
    if (!response) return;
    const image = await loadImageElement(response.imageDataUrl);
    commitProject((current) => addImageLayer(current, { name: 'Fondo IA', src: response.imageDataUrl, naturalWidth: image.naturalWidth || current.width, naturalHeight: image.naturalHeight || current.height, asBackground: true }));
    setTool('select');
    setStatus('Fondo IA generado y aplicado. Herramienta Mover activada.');
  };

  const generateAiLibraryAsset = async () => {
    const assetPrompt = `${prompt}\n\nModo elemento de biblioteca: genera UN SOLO elemento gráfico para playera en PNG sin fondo. Fondo transparente obligatorio, sin mockup, sin playera, sin escenario, sin sombras de fondo, silueta limpia recortada, listo para arrastrarlo como asset. Si agregas texto, que sea nítido y editable visualmente.`;
    const response = await requestAiImage(assetPrompt, 'Generando elemento IA sin fondo para biblioteca…');
    if (!response) return;
    const image = await loadImageElement(response.imageDataUrl);
    const asset: LibraryAsset = {
      id: `ai-asset-${Date.now().toString(36)}`,
      name: `Elemento IA sin fondo ${generatedAssets.length + 1}`,
      src: response.imageDataUrl,
      naturalWidth: image.naturalWidth || 1024,
      naturalHeight: image.naturalHeight || 1024,
    };
    setGeneratedAssets((current) => [asset, ...current].slice(0, 30));
    setStatus('Elemento IA sin fondo agregado a la biblioteca. Haz clic o arrástralo al lienzo.');
  };

  const regenerateAiWithChanges = () => {
    const changes = aiRevisionPrompt.trim();
    void generateAi(changes ? `${prompt}\n\nCambios para regenerar: ${changes}` : prompt);
  };

  const saveAiOutput = async () => {
    if (!aiOutput) return;
    const result = await window.domo?.saveDataUrl(aiOutput, `${makeSafeFileName(project.name)}-resultado-ia.png`);
    setStatus(result?.canceled ? 'Guardado de resultado IA cancelado.' : `Resultado IA guardado: ${result?.filePath}`);
  };

  const addGeneratedAsLayer = async () => {
    if (!aiOutput) return;
    const image = await loadImageElement(aiOutput);
    commitProject((current) => addImageLayer(current, { name: 'Resultado IA', src: aiOutput, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight }));
    setTool('select');
    setStatus('Resultado IA agregado al lienzo como capa. Herramienta Mover activada.');
  };

  const addAssetToProject = (asset: LibraryAsset, position?: { x: number; y: number }) => {
    commitProject((current) => {
      const maxWidth = Math.min(current.width * 0.42, asset.naturalWidth);
      const scale = Math.min(1, maxWidth / Math.max(1, asset.naturalWidth));
      const width = Math.round(asset.naturalWidth * scale);
      const height = Math.round(asset.naturalHeight * scale);
      const x = position ? Math.max(0, Math.min(current.width - width, Math.round(position.x - width / 2))) : undefined;
      const y = position ? Math.max(0, Math.min(current.height - height, Math.round(position.y - height / 2))) : undefined;
      const updated = addImageLayer(current, {
        name: asset.name,
        src: asset.src,
        naturalWidth: asset.naturalWidth,
        naturalHeight: asset.naturalHeight,
        x,
        y,
      });
      setSelectedId(updated.layers[updated.layers.length - 1]?.id ?? null);
      return updated;
    });
    setTool('select');
    setStatus(position ? `${asset.name} agregado desde biblioteca en el lienzo. Herramienta Mover activada.` : `${asset.name} agregado centrado como capa editable. Herramienta Mover activada.`);
  };

  const addShape = (shape: ShapeLayer['shape']) => {
    commitProject((current) => {
      const updated = addShapeLayer(current, shape, { stroke: brushColor, strokeWidth: brushWidth, fill: shapeFill });
      setSelectedId(updated.layers[updated.layers.length - 1]?.id ?? null);
      return updated;
    });
    setTool('select');
    setStatus('Forma agregada como capa editable.');
  };

  return (
    <div className="app-shell">
      <Toolbar
        tool={tool}
        setTool={setTool}
        brushColor={brushColor}
        setBrushColor={setBrushColor}
        brushWidth={brushWidth}
        setBrushWidth={setBrushWidth}
        brushMetaPrompt={brushMetaPrompt}
        setBrushMetaPrompt={setBrushMetaPrompt}
        shapeFill={shapeFill}
        setShapeFill={setShapeFill}
        onAddShape={addShape}
        onAddImage={addImage}
        onAddText={() => {
          const updated = addTextLayer(project, 'DOMO\nSTREETWEAR', { fill: brushColor });
          commitProject(updated);
          setSelectedId(updated.layers[updated.layers.length - 1]?.id ?? null);
          setTool('select');
        }}
        onExport={exportCanvas}
        onNewProject={() => { void newProject(); }}
        onSaveProject={() => { void saveProjectFile(); }}
        onOpenProject={openProjectFile}
        onGenerate={() => { void generateAi(); }}
      />
      <CanvasEditor
        project={project}
        setProject={commitProject}
        tool={tool}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        brushColor={brushColor}
        brushWidth={brushWidth}
        brushMetaPrompt={brushMetaPrompt}
        stageRef={stageRef}
        onAssetDrop={addAssetToProject}
      />
      <aside className="right-rail">
        <section className="panel ai-panel">
          <div className="panel-title">Prompt creativo ultrarrealista</div>
          <p className="hint">Edita libremente el prompt, guarda tus propios prompts custom y reutilízalos sin botones predefinidos.</p>
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => event.stopPropagation()} />
          <div className="prompt-save-row">
            <input placeholder="Nombre del prompt custom" value={promptName} onChange={(event) => setPromptName(event.target.value)} onKeyDown={(event) => event.stopPropagation()} />
            <button onClick={saveCustomPrompt}>Guardar prompt</button>
          </div>
          {savedPrompts.length > 0 && (
            <div className="saved-prompts">
              {savedPrompts.map((item) => (
                <div key={item.id} className="saved-prompt-row">
                  <button onClick={() => { setPrompt(item.text); setStatus(`Prompt cargado: ${item.name}`); }}>{item.name}</button>
                  <button aria-label={`Eliminar ${item.name}`} onClick={() => deleteCustomPrompt(item.id)}>×</button>
                </div>
              ))}
            </div>
          )}
          <button className="primary" disabled={isGenerating} onClick={() => { void generateAi(); }}>{isGenerating ? 'Generando…' : 'Generar diseño IA'}</button>
          <div className="grid-2 ai-mode-actions">
            <button disabled={isGenerating} onClick={() => { void generateAiBackground(); }}>Generar fondo IA</button>
            <button disabled={isGenerating} onClick={() => { void generateAiLibraryAsset(); }}>Generar asset sin fondo</button>
          </div>
          {aiOutput && (
            <div className="ai-output">
              <img src={aiOutput} alt="Resultado IA" />
              <button onClick={addGeneratedAsLayer}>Pegar resultado como capa</button>
              <button onClick={saveAiOutput}>Guardar resultado IA para exportar</button>
              <textarea
                className="ai-revision"
                placeholder="Cambios para regenerar: más realista, cambia color, conserva logo, etc."
                value={aiRevisionPrompt}
                onChange={(event) => setAiRevisionPrompt(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
              />
              <button onClick={regenerateAiWithChanges} disabled={isGenerating}>{isGenerating ? 'Regenerando…' : 'Regenerar con cambios'}</button>
            </div>
          )}
        </section>
        <AssetLibrary onAddAsset={addAssetToProject} onStatus={setStatus} extraAssets={generatedAssets} />
        <LayerPanel project={project} selectedId={selectedId} setProject={commitProject} setSelectedId={setSelectedId} />
        <LayerProperties project={project} selectedId={selectedId} setProject={commitProject} setSelectedId={setSelectedId} />
        <PreflightPanel project={project} />
        <UpdatePanel />
        <SettingsPanel settings={settings} onChange={setSettings} onSave={saveSettings} />
      </aside>
      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(event) => handleFiles(event.target.files)} />
      <footer className="status-bar">{isDirty ? '● ' : ''}{status}</footer>
    </div>
  );
}
