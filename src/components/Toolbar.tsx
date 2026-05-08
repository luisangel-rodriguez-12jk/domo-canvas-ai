
import type { ReactNode } from 'react';
import { Brush, Eraser, FileDown, FilePlus2, FolderOpen, ImagePlus, MousePointer2, PenLine, Save, Sparkles, Type, Wand2 } from 'lucide-react';
import type { ToolMode } from '../core/types';
import type { ExportMode } from '../core/exporter';

interface Props {
  tool: ToolMode;
  setTool: (tool: ToolMode) => void;
  brushColor: string;
  setBrushColor: (color: string) => void;
  brushWidth: number;
  setBrushWidth: (width: number) => void;
  onAddImage: (asBackground?: boolean) => void;
  onAddText: () => void;
  onExport: (mode: ExportMode) => void;
  onNewProject: () => void;
  onSaveProject: () => void;
  onOpenProject: () => void;
  onGenerate: () => void;
}

export function Toolbar(props: Props) {
  const toolButton = (id: ToolMode, label: string, icon: ReactNode) => (
    <button className={props.tool === id ? 'active' : ''} onClick={() => props.setTool(id)} title={label}>{icon}<span>{label}</span></button>
  );
  return (
    <aside className="toolbar">
      <div className="brand-mark">DOMO<br /><b>CANVAS AI</b></div>
      {toolButton('select', 'Mover', <MousePointer2 size={18} />)}
      {toolButton('brush', 'Pincel', <Brush size={18} />)}
      {toolButton('eraser', 'Borrar', <Eraser size={18} />)}
      {toolButton('ai-mask', 'Máscara IA', <PenLine size={18} />)}
      {toolButton('text', 'Texto', <Type size={18} />)}
      <div className="toolbar-control">
        <input type="color" value={props.brushColor} onChange={(event) => props.setBrushColor(event.target.value)} />
        <input type="range" min={4} max={120} value={props.brushWidth} onChange={(event) => props.setBrushWidth(Number(event.target.value))} />
        <span>{props.brushWidth}px</span>
      </div>
      <button onClick={() => props.onAddImage(true)}><ImagePlus size={18} /><span>Fondo</span></button>
      <button onClick={() => props.onAddImage(false)}><ImagePlus size={18} /><span>PNG/logo</span></button>
      <button onClick={props.onAddText}><Type size={18} /><span>Agregar texto</span></button>
      <button onClick={props.onGenerate} className="glow"><Sparkles size={18} /><span>Generar IA</span></button>
      <button onClick={() => props.onExport('mockup-preview')}><Save size={18} /><span>Exportar mockup</span></button>
      <button onClick={() => props.onExport('transparent-artwork')}><Save size={18} /><span>Arte PNG</span></button>
      <button onClick={props.onNewProject}><FilePlus2 size={18} /><span>Nuevo</span></button>
      <button onClick={props.onSaveProject}><FileDown size={18} /><span>Guardar</span></button>
      <button onClick={props.onOpenProject}><FolderOpen size={18} /><span>Abrir</span></button>
      <div className="toolbar-footer"><Wand2 size={16}/> App local Windows</div>
    </aside>
  );
}
