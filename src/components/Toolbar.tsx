import type { ReactNode } from 'react';
import { Brush, Circle, Eraser, FileDown, FilePlus2, FolderOpen, ImagePlus, Minus, MousePointer2, PenLine, Save, Sparkles, Square, Type, Wand2 } from 'lucide-react';
import type { ShapeLayer, ToolMode } from '../core/types';
import type { ExportMode } from '../core/exporter';

interface Props {
  tool: ToolMode;
  setTool: (tool: ToolMode) => void;
  brushColor: string;
  setBrushColor: (color: string) => void;
  brushWidth: number;
  setBrushWidth: (width: number) => void;
  brushMetaPrompt: string;
  setBrushMetaPrompt: (value: string) => void;
  shapeFill: string;
  setShapeFill: (color: string) => void;
  onAddShape: (shape: ShapeLayer['shape']) => void;
  onAddImage: (asBackground?: boolean) => void;
  onAddText: () => void;
  onExport: (mode: ExportMode) => void;
  onNewProject: () => void;
  onSaveProject: () => void;
  onOpenProject: () => void;
  onGenerate: () => void;
}

const colors = ['#ffffff', '#000000', '#ff2a55', '#7a37ff', '#00ff88', '#ffcc00', '#00d4ff', '#f4efe8'];

export function Toolbar(props: Props) {
  const tooltipButton = (label: string, description: string, icon: ReactNode, onClick: () => void, className = '') => (
    <button className={className} onClick={onClick} aria-label={description} data-tooltip={description}>{icon}<span>{label}</span></button>
  );
  const toolButton = (id: ToolMode, label: string, description: string, icon: ReactNode) => (
    tooltipButton(label, description, icon, () => props.setTool(id), props.tool === id ? 'active' : '')
  );
  const isPaintTool = ['brush', 'eraser', 'ai-mask'].includes(props.tool);

  return (
    <aside className="toolbar">
      <div className="brand-mark">DOMO<br /><b>CANVAS AI</b></div>
      {toolButton('select', 'Mover', 'Selecciona, mueve y transforma capas sin dibujar accidentalmente.', <MousePointer2 size={18} />)}
      {toolButton('brush', 'Pincel', 'Dibuja trazos libres. Al activarlo aparece paleta de color y grosor.', <Brush size={18} />)}
      {toolButton('eraser', 'Borrar', 'Borra trazos manuales usando el grosor elegido.', <Eraser size={18} />)}
      {toolButton('ai-mask', 'Máscara IA', 'Marca zonas donde quieres que la IA intervenga más.', <PenLine size={18} />)}
      {toolButton('text', 'Texto', 'Agrega texto y edítalo directamente con doble clic sobre el lienzo.', <Type size={18} />)}
      {isPaintTool && (
        <div className="brush-palette" data-tooltip="Paleta rápida: color, grosor y presets del pincel actual.">
          <div className="palette-colors">
            {colors.map((color) => (
              <button key={color} className={props.brushColor === color ? 'swatch active' : 'swatch'} style={{ background: color }} onClick={() => props.setBrushColor(color)} aria-label={`Color ${color}`} />
            ))}
          </div>
          <input type="color" value={props.brushColor} onChange={(event) => props.setBrushColor(event.target.value)} aria-label="Color personalizado" />
          <input type="range" min={4} max={140} value={props.brushWidth} onChange={(event) => props.setBrushWidth(Number(event.target.value))} aria-label="Grosor del pincel" />
          <span>{props.brushWidth}px</span>
          <textarea
            className="brush-metaprompt"
            aria-label="Metaprompt de trazos"
            placeholder="Metaprompt del trazo: textura bordada, corregir a forma geométrica…"
            value={props.brushMetaPrompt}
            onChange={(event) => props.setBrushMetaPrompt(event.target.value)}
          />
        </div>
      )}
      <div className="shape-tools">
        <div className="mini-title">Formas</div>
        {tooltipButton('Línea', 'Inserta una línea editable con el color/grosor actual.', <Minus size={18} />, () => props.onAddShape('line'))}
        {tooltipButton('Rect', 'Inserta un rectángulo editable. Usa relleno transparente o color.', <Square size={18} />, () => props.onAddShape('rect'))}
        {tooltipButton('Círculo', 'Inserta un círculo editable. Usa relleno transparente o color.', <Circle size={18} />, () => props.onAddShape('circle'))}
        <div className="toolbar-control compact" data-tooltip="Relleno para nuevas formas. Transparente deja solo contorno.">
          <input type="color" value={props.shapeFill === 'transparent' ? '#111111' : props.shapeFill} onChange={(event) => props.setShapeFill(event.target.value)} />
          <button onClick={() => props.setShapeFill('transparent')}>Sin relleno</button>
        </div>
      </div>
      {tooltipButton('Fondo', 'Carga una imagen como fondo/mockup; después activa Mover automáticamente.', <ImagePlus size={18} />, () => props.onAddImage(true))}
      {tooltipButton('PNG/logo', 'Carga una imagen como capa editable; después activa Mover automáticamente.', <ImagePlus size={18} />, () => props.onAddImage(false))}
      {tooltipButton('Agregar texto', 'Crea una capa de texto multilínea editable en el lienzo.', <Type size={18} />, props.onAddText)}
      {tooltipButton('Generar IA', 'Envía composición y prompt a la IA configurada.', <Sparkles size={18} />, props.onGenerate, 'glow')}
      {tooltipButton('Exportar mockup', 'Guarda una vista PNG completa con fondo y guías visibles.', <Save size={18} />, () => props.onExport('mockup-preview'))}
      {tooltipButton('Arte PNG', 'Guarda solo el arte imprimible con transparencia.', <Save size={18} />, () => props.onExport('transparent-artwork'))}
      {tooltipButton('Nuevo', 'Crea un diseño nuevo; si hay cambios pregunta si quieres guardar.', <FilePlus2 size={18} />, props.onNewProject)}
      {tooltipButton('Guardar', 'Guarda el proyecto editable .domo.json.', <FileDown size={18} />, props.onSaveProject)}
      {tooltipButton('Abrir', 'Abre un proyecto .domo.json guardado.', <FolderOpen size={18} />, props.onOpenProject)}
      <div className="toolbar-footer"><Wand2 size={16}/> App local Windows</div>
    </aside>
  );
}
