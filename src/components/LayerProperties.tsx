import type { CanvasLayer, CanvasProject } from '../core/types';
import { duplicateLayer, updateLayer } from '../core/layers';

interface Props {
  project: CanvasProject;
  selectedId: string | null;
  setProject: (project: CanvasProject) => void;
  setSelectedId: (id: string | null) => void;
}

export function LayerProperties({ project, selectedId, setProject, setSelectedId }: Props) {
  const layer = project.layers.find((item) => item.id === selectedId);
  if (!layer) {
    return (
      <section className="panel properties-panel">
        <div className="panel-title">Propiedades</div>
        <p className="hint">Selecciona una capa para ajustar nombre, opacidad, tamaño, rotación y texto.</p>
      </section>
    );
  }

  const patch = (next: Partial<CanvasLayer>) => setProject(updateLayer(project, layer.id, next));
  const numberPatch = (key: keyof CanvasLayer, value: string) => patch({ [key]: Number(value) } as Partial<CanvasLayer>);

  return (
    <section className="panel properties-panel">
      <div className="panel-title">Propiedades</div>
      <label>
        Nombre
        <input value={layer.name} onChange={(event) => patch({ name: event.target.value })} />
      </label>
      <div className="grid-2">
        <label>
          X
          <input type="number" value={Math.round(layer.x)} onChange={(event) => numberPatch('x', event.target.value)} />
        </label>
        <label>
          Y
          <input type="number" value={Math.round(layer.y)} onChange={(event) => numberPatch('y', event.target.value)} />
        </label>
      </div>
      <div className="grid-2">
        <label>
          Ancho
          <input type="number" min={1} value={Math.round(layer.width)} onChange={(event) => numberPatch('width', event.target.value)} />
        </label>
        <label>
          Alto
          <input type="number" min={1} value={Math.round(layer.height)} onChange={(event) => numberPatch('height', event.target.value)} />
        </label>
      </div>
      <div className="grid-2">
        <label>
          Rotación
          <input type="number" value={Math.round(layer.rotation)} onChange={(event) => numberPatch('rotation', event.target.value)} />
        </label>
        <label>
          Opacidad
          <input type="range" min={0} max={1} step={0.01} value={layer.opacity} onChange={(event) => numberPatch('opacity', event.target.value)} />
        </label>
      </div>
      {layer.type === 'text' && (
        <>
          <label>
            Texto
            <textarea value={layer.text} onChange={(event) => patch({ text: event.target.value, name: `Texto: ${event.target.value.slice(0, 18)}` } as Partial<CanvasLayer>)} />
          </label>
          <div className="grid-2">
            <label>
              Tamaño fuente
              <input type="number" min={8} value={layer.fontSize} onChange={(event) => patch({ fontSize: Number(event.target.value) } as Partial<CanvasLayer>)} />
            </label>
            <label>
              Color
              <input type="color" value={layer.fill} onChange={(event) => patch({ fill: event.target.value } as Partial<CanvasLayer>)} />
            </label>
          </div>
        </>
      )}
      <button
        onClick={() => {
          const updated = duplicateLayer(project, layer.id);
          setProject(updated);
          const currentIndex = project.layers.findIndex((item) => item.id === layer.id);
          setSelectedId(updated.layers[currentIndex + 1]?.id ?? layer.id);
        }}
      >
        Duplicar capa
      </button>
    </section>
  );
}
