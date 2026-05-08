import { useEffect, useState } from 'react';
import type { UpdateStatus } from '../core/types';

const defaultStatus: UpdateStatus = { state: 'idle', message: 'La app revisa actualizaciones antes de abrir el editor.' };

export function UpdatePanel() {
  const [status, setStatus] = useState<UpdateStatus>(defaultStatus);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    window.domo?.getUpdateStatus?.().then(setStatus).catch(() => undefined);
    unsubscribe = window.domo?.onUpdateStatus?.(setStatus);
    return () => unsubscribe?.();
  }, []);

  const canCheck = status.state !== 'checking' && status.state !== 'downloading' && status.state !== 'disabled';
  return (
    <section className="panel update-panel">
      <div className="panel-title">Actualizaciones</div>
      <div className={`update-state ${status.state}`}>{status.message}</div>
      {typeof status.progress === 'number' && (
        <progress max={100} value={Math.round(status.progress)} />
      )}
      <div className="grid-2">
        <button disabled={!canCheck} onClick={() => window.domo?.checkForUpdates?.().then(setStatus)}>
          Buscar updates
        </button>
        <button disabled={status.state !== 'downloaded'} onClick={() => window.domo?.installUpdate?.()}>
          Reiniciar e instalar
        </button>
      </div>
      <p className="hint">Al abrir, la app busca updates en GitHub Releases; si encuentra uno, lo descarga y se reinicia sola para instalarlo.</p>
    </section>
  );
}
