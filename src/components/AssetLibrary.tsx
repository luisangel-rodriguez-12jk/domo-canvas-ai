import { addImageLayer } from '../core/layers';
import { domoAssets } from '../core/assets';
import type { CanvasProject } from '../core/types';

interface Props {
  project: CanvasProject;
  setProject: (project: CanvasProject) => void;
  setSelectedId: (id: string | null) => void;
  onStatus: (message: string) => void;
}

export function AssetLibrary({ project, setProject, setSelectedId, onStatus }: Props) {
  return (
    <section className="panel asset-panel">
      <div className="panel-title">Assets Domo</div>
      <p className="hint">Logos SVG transparentes para arrancar rápido sin buscar archivos.</p>
      <div className="asset-grid">
        {domoAssets.map((asset) => (
          <button
            key={asset.id}
            title={asset.description}
            onClick={() => {
              const updated = addImageLayer(project, {
                name: asset.name,
                src: asset.src,
                naturalWidth: asset.width,
                naturalHeight: asset.height,
              });
              setProject(updated);
              setSelectedId(updated.layers[updated.layers.length - 1]?.id ?? null);
              onStatus(`${asset.name} agregado como capa editable.`);
            }}
          >
            <img src={asset.src} alt={asset.name} />
            <span>{asset.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
