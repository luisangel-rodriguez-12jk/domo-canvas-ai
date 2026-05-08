import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent as ReactDragEvent } from 'react';
import { Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { CanvasLayer, CanvasProject, ImageLayer, LibraryAsset, ShapeLayer, Stroke, TextLayer, ToolMode } from '../core/types';
import { createId, moveLayer, touchProject, updateLayer } from '../core/layers';

function useHtmlImage(src?: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) { setImage(null); return; }
    let cancelled = false;
    setImage(null);
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { if (!cancelled) setImage(img); };
    img.onerror = () => { if (!cancelled) setImage(null); };
    img.src = src;
    if (img.complete && img.naturalWidth > 0) setImage(img);
    return () => { cancelled = true; };
  }, [src]);
  return image;
}

function ImageNode({ layer, onSelect, onChange, nodeName = 'editable-node' }: { layer: ImageLayer; onSelect: () => void; onChange: (patch: Partial<CanvasLayer>) => void; nodeName?: string }) {
  const image = useHtmlImage(layer.src);
  return (
    <KonvaImage
      id={layer.id}
      name={nodeName}
      image={image ?? undefined}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      rotation={layer.rotation}
      opacity={layer.opacity}
      visible={layer.visible}
      draggable={!layer.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(event) => onChange({ x: Math.round(event.target.x()), y: Math.round(event.target.y()) })}
      onTransformEnd={(event) => {
        const node = event.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: Math.round(node.x()),
          y: Math.round(node.y()),
          width: Math.max(10, Math.round(node.width() * scaleX)),
          height: Math.max(10, Math.round(node.height() * scaleY)),
          rotation: Math.round(node.rotation()),
        });
      }}
    />
  );
}

function ShapeNode({ layer, onSelect, onChange }: { layer: ShapeLayer; onSelect: () => void; onChange: (patch: Partial<CanvasLayer>) => void }) {
  const common = {
    id: layer.id,
    name: 'editable-node',
    x: layer.x,
    y: layer.y,
    rotation: layer.rotation,
    opacity: layer.opacity,
    visible: layer.visible,
    draggable: !layer.locked,
    stroke: layer.stroke,
    strokeWidth: layer.strokeWidth,
    fill: layer.fill === 'transparent' ? undefined : layer.fill,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: (event: Konva.KonvaEventObject<globalThis.DragEvent>) => onChange({ x: Math.round(event.target.x()), y: Math.round(event.target.y()) }),
    onTransformEnd: (event: Konva.KonvaEventObject<Event>) => {
      const node = event.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      onChange({
        x: Math.round(node.x()),
        y: Math.round(node.y()),
        width: Math.max(1, Math.round(node.width() * scaleX)),
        height: layer.shape === 'line' ? Math.round(node.height() * scaleY) : Math.max(1, Math.round(node.height() * scaleY)),
        rotation: Math.round(node.rotation()),
      });
    },
  };

  if (layer.shape === 'line') {
    return <Line {...common} points={[0, 0, layer.width, layer.height]} lineCap="round" lineJoin="round" />;
  }

  return (
    <Rect
      {...common}
      width={layer.width}
      height={layer.height}
      cornerRadius={layer.shape === 'circle' ? Math.min(layer.width, layer.height) / 2 : 0}
    />
  );
}

interface Props {
  project: CanvasProject;
  setProject: (project: CanvasProject) => void;
  tool: ToolMode;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  brushColor: string;
  brushWidth: number;
  stageRef: React.RefObject<Konva.Stage | null>;
  onAssetDrop?: (asset: LibraryAsset, position: { x: number; y: number }) => void;
}

export function CanvasEditor({ project, setProject, tool, selectedId, setSelectedId, brushColor, brushWidth, stageRef, onAssetDrop }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 900, height: 780 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState('');

  useEffect(() => {
    const resize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) setContainerSize({ width: rect.width - 24, height: rect.height - 24 });
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const scale = useMemo(() => Math.min(containerSize.width / project.width, containerSize.height / project.height), [containerSize, project.width, project.height]);
  const stageWidth = Math.round(project.width * scale);
  const stageHeight = Math.round(project.height * scale);
  const editingLayer = project.layers.find((layer): layer is TextLayer => layer.id === editingTextId && layer.type === 'text') ?? null;

  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage || !selectedId || editingTextId) {
      transformer?.nodes([]);
      return;
    }
    const selected = stage.findOne(`#${selectedId}`) as Konva.Node | undefined;
    const layer = project.layers.find((item) => item.id === selectedId);
    if (selected && layer && !layer.locked) transformer.nodes([selected]);
    else transformer.nodes([]);
    transformer.getLayer()?.batchDraw();
  }, [selectedId, project.layers, stageRef, editingTextId]);

  const pointer = () => {
    const position = stageRef.current?.getPointerPosition();
    if (!position) return null;
    return { x: position.x / scale, y: position.y / scale };
  };

  const startDrawing = () => {
    if (!['brush', 'eraser', 'ai-mask'].includes(tool)) return;
    const pos = pointer();
    if (!pos) return;
    setIsDrawing(true);
    const stroke: Stroke = {
      id: createId('stroke'),
      tool: tool as Stroke['tool'],
      points: [pos.x, pos.y],
      color: tool === 'ai-mask' ? '#ff2a55' : brushColor,
      width: tool === 'ai-mask' ? Math.max(brushWidth, 36) : brushWidth,
      opacity: tool === 'ai-mask' ? 0.58 : 1,
    };
    setProject(touchProject({ ...project, strokes: [...project.strokes, stroke] }));
  };

  const continueDrawing = () => {
    if (!isDrawing) return;
    const pos = pointer();
    if (!pos) return;
    const strokes = project.strokes.slice();
    const last = strokes[strokes.length - 1];
    if (!last) return;
    strokes[strokes.length - 1] = { ...last, points: [...last.points, pos.x, pos.y] };
    setProject(touchProject({ ...project, strokes }));
  };

  const stopDrawing = () => setIsDrawing(false);

  const beginTextEdit = (layer: TextLayer) => {
    setSelectedId(layer.id);
    setEditingTextId(layer.id);
    setEditingTextValue(layer.text);
  };

  const commitTextEdit = () => {
    if (!editingLayer) return;
    const lineCount = Math.max(1, editingTextValue.split('\n').length);
    setProject(updateLayer(project, editingLayer.id, {
      text: editingTextValue,
      name: `Texto: ${editingTextValue.replace(/\s+/g, ' ').slice(0, 18)}`,
      height: Math.max(editingLayer.height, Math.round(editingLayer.fontSize * 1.28 * lineCount)),
    } as Partial<CanvasLayer>));
    setEditingTextId(null);
  };

  const getProjectPointFromClient = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    const rect = stage?.container().getBoundingClientRect();
    if (!stage || !rect) return null;
    return {
      x: Math.max(0, Math.min(project.width, (clientX - rect.left) / scale)),
      y: Math.max(0, Math.min(project.height, (clientY - rect.top) / scale)),
    };
  };

  const handleAssetDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    const raw = event.dataTransfer.getData('application/x-domo-asset');
    if (!raw || !onAssetDrop) return;
    event.preventDefault();
    try {
      const asset = JSON.parse(raw) as LibraryAsset;
      const position = getProjectPointFromClient(event.clientX, event.clientY);
      if (asset?.src && position) onAssetDrop(asset, position);
    } catch {
      // Ignore unrelated drags.
    }
  };

  const textEditStyle: CSSProperties | undefined = editingLayer ? {
    position: 'absolute',
    left: `calc(50% - ${stageWidth / 2}px + ${(editingLayer.x - editingLayer.width / 2) * scale}px)`,
    top: `calc(50% - ${stageHeight / 2}px + ${(editingLayer.y - editingLayer.height / 2) * scale}px)`,
    width: Math.max(90, editingLayer.width * scale),
    minHeight: Math.max(42, editingLayer.height * scale),
    fontFamily: editingLayer.fontFamily,
    fontSize: Math.max(12, editingLayer.fontSize * scale),
    color: editingLayer.fill,
    textAlign: editingLayer.align,
  } : undefined;

  return (
    <main
      className="canvas-shell"
      ref={containerRef}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('application/x-domo-asset')) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDrop={handleAssetDrop}
    >
      <Stage
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
        className="konva-stage"
        onMouseDown={(event) => {
          const clickedOnEmpty = event.target === event.target.getStage();
          if (clickedOnEmpty && tool === 'select') setSelectedId(null);
          startDrawing();
        }}
        onMouseMove={continueDrawing}
        onMouseUp={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={continueDrawing}
        onTouchEnd={stopDrawing}
      >
        <Layer>
          <Group scaleX={scale} scaleY={scale}>
            <Rect name="canvas-backdrop" width={project.width} height={project.height} fill="#111116" />
            <Rect name="print-safe-guide" x={180} y={180} width={project.width - 360} height={project.height - 360} stroke="#2f2f38" dash={[34, 22]} strokeWidth={8} />
            {project.background?.visible && <ImageNode layer={project.background} nodeName="mockup-background" onSelect={() => undefined} onChange={() => undefined} />}
            {project.layers.map((layer) => {
              if (layer.type === 'image') {
                return <ImageNode key={layer.id} layer={layer} onSelect={() => setSelectedId(layer.id)} onChange={(patch) => setProject(moveLayer(project, layer.id, patch))} />;
              }
              if (layer.type === 'shape') {
                return <ShapeNode key={layer.id} layer={layer} onSelect={() => setSelectedId(layer.id)} onChange={(patch) => setProject(moveLayer(project, layer.id, patch))} />;
              }
              return (
                <Text
                  key={layer.id}
                  id={layer.id}
                  name="editable-node"
                  text={layer.text}
                  x={layer.x}
                  y={layer.y}
                  width={layer.width}
                  height={layer.height}
                  rotation={layer.rotation}
                  opacity={editingTextId === layer.id ? 0 : layer.opacity}
                  visible={layer.visible}
                  fontFamily={layer.fontFamily}
                  fontSize={layer.fontSize}
                  fontStyle={layer.fontStyle}
                  fill={layer.fill}
                  align={layer.align}
                  verticalAlign="middle"
                  offsetX={layer.width / 2}
                  offsetY={layer.height / 2}
                  draggable={!layer.locked && editingTextId !== layer.id}
                  onClick={() => setSelectedId(layer.id)}
                  onTap={() => setSelectedId(layer.id)}
                  onDblClick={() => beginTextEdit(layer)}
                  onDblTap={() => beginTextEdit(layer)}
                  onDragEnd={(event) => setProject(moveLayer(project, layer.id, { x: Math.round(event.target.x()), y: Math.round(event.target.y()) }))}
                  onTransformEnd={(event) => {
                    const node = event.target as Konva.Text;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();
                    node.scaleX(1); node.scaleY(1);
                    setProject(updateLayer(project, layer.id, {
                      x: Math.round(node.x()), y: Math.round(node.y()),
                      width: Math.max(40, Math.round(node.width() * scaleX)),
                      height: Math.max(40, Math.round(node.height() * scaleY)),
                      fontSize: Math.max(10, Math.round(layer.fontSize * scaleY)),
                      rotation: Math.round(node.rotation()),
                    }));
                  }}
                />
              );
            })}
            {project.strokes.map((stroke) => (
              <Line
                key={stroke.id}
                points={stroke.points}
                stroke={stroke.color}
                strokeWidth={stroke.width}
                opacity={stroke.opacity}
                tension={0.35}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={stroke.tool === 'eraser' ? 'destination-out' : 'source-over'}
              />
            ))}
            <Transformer ref={transformerRef} rotateEnabled anchorSize={22} borderStroke="#ff2a55" anchorStroke="#ffffff" anchorFill="#ff2a55" />
          </Group>
        </Layer>
      </Stage>
      {editingLayer && (
        <textarea
          className="text-edit-overlay"
          autoFocus
          value={editingTextValue}
          onChange={(event) => setEditingTextValue(event.target.value)}
          onBlur={commitTextEdit}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') commitTextEdit();
            if (event.key === 'Escape') setEditingTextId(null);
          }}
          style={textEditStyle}
        />
      )}
      <div className="canvas-meta">Lienzo {project.width}×{project.height}px · escala {(scale * 100).toFixed(1)}%</div>
    </main>
  );
}
