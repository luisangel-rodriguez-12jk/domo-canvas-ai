
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { CanvasLayer, CanvasProject, ImageLayer, LibraryAsset, Stroke, ToolMode } from '../core/types';
import { createId, moveLayer, touchProject, updateLayer } from '../core/layers';

function useHtmlImage(src?: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) { setImage(null); return; }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img);
    img.src = src;
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

  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage || !selectedId) {
      transformer?.nodes([]);
      return;
    }
    const selected = stage.findOne(`#${selectedId}`) as Konva.Node | undefined;
    const layer = project.layers.find((item) => item.id === selectedId);
    if (selected && layer && !layer.locked) transformer.nodes([selected]);
    else transformer.nodes([]);
    transformer.getLayer()?.batchDraw();
  }, [selectedId, project.layers, stageRef]);

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

  const getProjectPointFromClient = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    const rect = stage?.container().getBoundingClientRect();
    if (!stage || !rect) return null;
    return {
      x: Math.max(0, Math.min(project.width, (clientX - rect.left) / scale)),
      y: Math.max(0, Math.min(project.height, (clientY - rect.top) / scale)),
    };
  };

  const handleAssetDrop = (event: DragEvent<HTMLDivElement>) => {
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
                  opacity={layer.opacity}
                  visible={layer.visible}
                  fontFamily={layer.fontFamily}
                  fontSize={layer.fontSize}
                  fontStyle={layer.fontStyle}
                  fill={layer.fill}
                  align={layer.align}
                  offsetX={layer.width / 2}
                  offsetY={layer.height / 2}
                  draggable={!layer.locked}
                  onClick={() => setSelectedId(layer.id)}
                  onTap={() => setSelectedId(layer.id)}
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
      <div className="canvas-meta">Lienzo {project.width}×{project.height}px · escala {(scale * 100).toFixed(1)}%</div>
    </main>
  );
}
