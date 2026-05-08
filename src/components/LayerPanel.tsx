
import { Eye, EyeOff, Lock, Trash2, Unlock, ArrowUp, ArrowDown } from 'lucide-react';
import type { CanvasProject } from '../core/types';
import { bringForward, removeLayer, sendBackward, toggleLayerLock, toggleLayerVisibility } from '../core/layers';

interface Props {
  project: CanvasProject;
  selectedId: string | null;
  setProject: (project: CanvasProject) => void;
  setSelectedId: (id: string | null) => void;
}

export function LayerPanel({ project, selectedId, setProject, setSelectedId }: Props) {
  const displayLayers = [...project.layers].reverse();
  return (
    <section className="panel layers-panel">
      <div className="panel-title">Capas</div>
      {project.background && <div className="layer-row muted">Fondo bloqueado</div>}
      {displayLayers.length === 0 && <p className="hint">Agrega PNGs, logos o textos como capas.</p>}
      {displayLayers.map((layer) => (
        <div key={layer.id} className={`layer-row ${selectedId === layer.id ? 'selected' : ''}`} onClick={() => setSelectedId(layer.id)}>
          <span className="layer-name">{layer.name}</span>
          <button title="Visible" onClick={(event) => { event.stopPropagation(); setProject(toggleLayerVisibility(project, layer.id)); }}>
            {layer.visible ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
          <button title="Bloquear" onClick={(event) => { event.stopPropagation(); setProject(toggleLayerLock(project, layer.id)); }}>
            {layer.locked ? <Lock size={15} /> : <Unlock size={15} />}
          </button>
          <button title="Subir" onClick={(event) => { event.stopPropagation(); setProject(bringForward(project, layer.id)); }}><ArrowUp size={15} /></button>
          <button title="Bajar" onClick={(event) => { event.stopPropagation(); setProject(sendBackward(project, layer.id)); }}><ArrowDown size={15} /></button>
          <button title="Eliminar" onClick={(event) => { event.stopPropagation(); setProject(removeLayer(project, layer.id)); setSelectedId(null); }}><Trash2 size={15} /></button>
        </div>
      ))}
    </section>
  );
}
