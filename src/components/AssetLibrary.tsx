import { useRef, useState } from 'react';
import type { LibraryAsset } from '../core/types';

interface Props {
  onAddAsset: (asset: LibraryAsset) => void;
  onStatus: (message: string) => void;
}

async function readAssetFile(file: File): Promise<LibraryAsset> {
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
  return {
    id: `asset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    src,
    naturalWidth: image.naturalWidth || 1200,
    naturalHeight: image.naturalHeight || 1200,
  };
}

export function AssetLibrary({ onAddAsset, onStatus }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const loadFiles = async (files: FileList | null) => {
    const imageFiles = Array.from(files ?? []).filter((file) => file.type.startsWith('image/') || /\.(png|jpe?g|webp|svg)$/i.test(file.name));
    if (!imageFiles.length) return;
    onStatus(`Cargando ${imageFiles.length} asset(s)…`);
    try {
      const loaded = await Promise.all(imageFiles.map(readAssetFile));
      setAssets((current) => [...loaded, ...current]);
      onStatus(`${loaded.length} asset(s) cargados en biblioteca. Arrastra uno al lienzo o haz clic para insertarlo.`);
    } catch (error) {
      onStatus(error instanceof Error ? `No se pudo cargar asset: ${error.message}` : 'No se pudo cargar el asset.');
    }
  };

  return (
    <section
      className={`panel asset-panel ${isDraggingOver ? 'drag-over' : ''}`}
      onDragOver={(event) => { event.preventDefault(); setIsDraggingOver(true); }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDraggingOver(false);
        loadFiles(event.dataTransfer.files);
      }}
    >
      <div className="panel-title">Biblioteca de archivos</div>
      <p className="hint">Carga PNG, JPG, WebP o SVG para reutilizarlos. Luego arrastra el asset al lienzo o haz clic para insertarlo centrado.</p>
      <button className="asset-upload" onClick={() => inputRef.current?.click()}>Cargar archivos</button>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" multiple hidden onChange={(event) => loadFiles(event.target.files)} />
      {assets.length === 0 ? (
        <div className="asset-dropzone">Suelta aquí tus logos, texturas, referencias o PNGs.</div>
      ) : (
        <div className="asset-grid user-assets">
          {assets.map((asset) => (
            <button
              key={asset.id}
              draggable
              title={`${asset.name} · ${asset.naturalWidth}×${asset.naturalHeight}px`}
              onClick={() => onAddAsset(asset)}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'copy';
                event.dataTransfer.setData('application/x-domo-asset', JSON.stringify(asset));
                event.dataTransfer.setData('text/plain', asset.name);
              }}
            >
              <img src={asset.src} alt={asset.name} />
              <span>{asset.name}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
