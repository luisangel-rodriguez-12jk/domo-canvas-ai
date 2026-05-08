
import { useEffect, useRef, useState } from 'react';
import type Konva from 'konva';
import { AssetLibrary } from './components/AssetLibrary';
import { CanvasEditor } from './components/CanvasEditor';
import { LayerPanel } from './components/LayerPanel';
import { LayerProperties } from './components/LayerProperties';
import { PreflightPanel } from './components/PreflightPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { Toolbar } from './components/Toolbar';
import { UpdatePanel } from './components/UpdatePanel';
import { addImageLayer, addTextLayer, createProject, touchProject } from './core/layers';
import { buildPrintAwarePrompt } from './core/aiPrompt';
import { createMockAiPreview } from './core/mockAi';
import { applyPromptPreset, promptPresets } from './core/presets';
import { exportStageDataUrl, makeExportFileName, type ExportMode } from './core/exporter';
import { createProjectSnapshot, loadProjectSnapshot, makeSafeFileName } from './core/projectIO';
import { defaultSettings, mergeSettings } from './core/settings';
import type { AiHistoryItem, AppSettings, CanvasProject, ToolMode } from './core/types';

async function readImageFile(file: File) {
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
  return { src, width: image.naturalWidth, height: image.naturalHeight };
}

export default function App() {
  const [project, setProject] = useState<CanvasProject>(() => createProject('Domo playera 01'));
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [tool, setTool] = useState<ToolMode>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [brushWidth, setBrushWidth] = useState(24);
  const [prompt, setPrompt] = useState('Integra las capas y rayones en un diseño streetwear para playera negra, alto contraste, fondo transparente, listo para impresión.');
  const [status, setStatus] = useState('Listo. Puedes cargar fondo, logos PNG y dibujar encima.');
  const [aiOutput, setAiOutput] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const stageRef = useRef<Konva.Stage | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingBackgroundRef = useRef(false);

  useEffect(() => {
    window.domo?.getSettings().then((loaded) => setSettings(mergeSettings(loaded))).catch(() => setSettings(defaultSettings));
  }, []);

  const addImage = (asBackground = false) => {
    pendingBackgroundRef.current = asBackground;
    fileInputRef.current?.click();
  };

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setStatus(`Cargando ${file.name}…`);
    const loaded = await readImageFile(file);
    setProject((current) => addImageLayer(current, { name: file.name, src: loaded.src, naturalWidth: loaded.width, naturalHeight: loaded.height, asBackground: pendingBackgroundRef.current }));
    setStatus(pendingBackgroundRef.current ? 'Fondo cargado.' : 'Imagen/PNG agregado como capa editable.');
    pendingBackgroundRef.current = false;
  };

  const exportCanvas = async (mode: ExportMode) => {
    const stage = stageRef.current;
    if (!stage) return;
    const dataUrl = exportStageDataUrl(stage, project, { mode });
    const result = await window.domo?.saveDataUrl(dataUrl, makeExportFileName(project.name, mode));
    const label = mode === 'transparent-artwork' ? 'arte transparente para impresión' : 'mockup completo';
    setStatus(result?.canceled ? 'Exportación cancelada.' : `PNG ${label} guardado: ${result?.filePath}`);
  };

  const newProject = () => {
    setProject(createProject(`Domo playera ${new Date().toLocaleDateString('es-MX')}`));
    setSelectedId(null);
    setAiOutput(null);
    setStatus('Proyecto nuevo creado.');
  };

  const saveProjectFile = async () => {
    const snapshot = createProjectSnapshot(project);
    const json = JSON.stringify(snapshot, null, 2);
    const result = await window.domo?.saveProject(json, `${makeSafeFileName(project.name)}.domo.json`);
    setStatus(result?.canceled ? 'Guardado de proyecto cancelado.' : `Proyecto guardado: ${result?.filePath}`);
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
      setSelectedId(null);
      setAiOutput(loaded.aiHistory[0]?.output ?? null);
      setStatus(`Proyecto abierto: ${result.filePath}`);
    } catch (error) {
      setStatus(error instanceof Error ? `No se pudo abrir el proyecto: ${error.message}` : 'No se pudo abrir el proyecto.');
    }
  };

  const saveSettings = async () => {
    const saved = await window.domo?.saveSettings(settings);
    if (saved) setSettings(saved);
    setStatus('Configuración guardada localmente.');
  };

  const generateAi = async () => {
    const stage = stageRef.current;
    if (!stage) return;
    setIsGenerating(true);
    setStatus('Componiendo imagen y enviando a IA…');
    try {
      const compositionPng = stage.toDataURL({ mimeType: 'image/png', pixelRatio: Math.max(1, project.width / stage.width()) });
      const request = { prompt, compositionPng, project, settings: settings.ai };
      const response = window.domo ? await window.domo.generateImage(request) : createMockAiPreview(request);
      setAiOutput(response.imageDataUrl);
      const history: AiHistoryItem = {
        id: `ai-${Date.now().toString(36)}`,
        createdAt: new Date().toISOString(),
        provider: response.provider,
        model: response.model,
        prompt: buildPrintAwarePrompt(prompt, project, settings.ai),
        output: response.imageDataUrl,
      };
      setProject((current) => touchProject({ ...current, aiHistory: [history, ...current.aiHistory].slice(0, 20) }));
      setStatus(`IA completada con ${response.provider}/${response.model}.`);
    } catch (error) {
      setStatus(error instanceof Error ? `Error IA: ${error.message}` : 'Error IA desconocido.');
    } finally {
      setIsGenerating(false);
    }
  };

  const addGeneratedAsLayer = async () => {
    if (!aiOutput) return;
    const image = await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = aiOutput; });
    setProject((current) => addImageLayer(current, { name: 'Resultado IA', src: aiOutput, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight }));
    setStatus('Resultado IA agregado al lienzo como capa.');
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
        onAddImage={addImage}
        onAddText={() => {
          const updated = addTextLayer(project, 'DOMO');
          setProject(updated);
          setSelectedId(updated.layers[updated.layers.length - 1]?.id ?? null);
          setTool('select');
        }}
        onExport={exportCanvas}
        onNewProject={newProject}
        onSaveProject={saveProjectFile}
        onOpenProject={openProjectFile}
        onGenerate={generateAi}
      />
      <CanvasEditor
        project={project}
        setProject={setProject}
        tool={tool}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        brushColor={brushColor}
        brushWidth={brushWidth}
        stageRef={stageRef}
      />
      <aside className="right-rail">
        <section className="panel ai-panel">
          <div className="panel-title">Prompt creativo</div>
          <div className="preset-grid">
            {promptPresets.map((preset) => (
              <button key={preset.id} title={preset.description} onClick={() => setPrompt(applyPromptPreset(preset.id, prompt))}>
                {preset.name}
              </button>
            ))}
          </div>
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          <button className="primary" disabled={isGenerating} onClick={generateAi}>{isGenerating ? 'Generando…' : 'Generar con IA'}</button>
          {aiOutput && (
            <div className="ai-output">
              <img src={aiOutput} alt="Resultado IA" />
              <button onClick={addGeneratedAsLayer}>Pegar resultado como capa</button>
            </div>
          )}
        </section>
        <AssetLibrary project={project} setProject={setProject} setSelectedId={setSelectedId} onStatus={setStatus} />
        <LayerPanel project={project} selectedId={selectedId} setProject={setProject} setSelectedId={setSelectedId} />
        <LayerProperties project={project} selectedId={selectedId} setProject={setProject} setSelectedId={setSelectedId} />
        <PreflightPanel project={project} />
        <UpdatePanel />
        <SettingsPanel settings={settings} onChange={setSettings} onSave={saveSettings} />
      </aside>
      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(event) => handleFiles(event.target.files)} />
      <footer className="status-bar">{status}</footer>
    </div>
  );
}
