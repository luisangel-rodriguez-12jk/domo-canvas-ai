
import { getApiKeyGuide } from '../core/apiKeyGuide';
import type { AppSettings, AiProvider } from '../core/types';

interface Props {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onSave: () => void;
}

export function SettingsPanel({ settings, onChange, onSave }: Props) {
  const updateAi = (patch: Partial<AppSettings['ai']>) => onChange({ ...settings, ai: { ...settings.ai, ...patch } });
  const providerModels: Record<AiProvider, string> = {
    mock: 'mock-preview',
    openai: 'gpt-image-1',
    gemini: 'gemini-2.5-flash-image-preview',
    custom: settings.ai.model || 'custom-image-model',
  };
  const apiGuide = getApiKeyGuide(settings.ai.provider);

  return (
    <section className="panel settings-panel">
      <div className="panel-title">Configuración IA</div>
      <label>
        Proveedor
        <select
          value={settings.ai.provider}
          onChange={(event) => updateAi({ provider: event.target.value as AiProvider, model: providerModels[event.target.value as AiProvider] })}
        >
          <option value="mock">Simulado / sin costo</option>
          <option value="openai">OpenAI Images</option>
          <option value="gemini">Google Gemini / Nano Banana</option>
          <option value="custom">Endpoint personalizado</option>
        </select>
      </label>
      <label>
        API key local
        <input
          type="password"
          placeholder="Pégala aquí; se guarda localmente en tu PC"
          value={settings.ai.apiKey || ''}
          onChange={(event) => updateAi({ apiKey: event.target.value })}
        />
      </label>
      <label>
        Modelo
        <input value={settings.ai.model} onChange={(event) => updateAi({ model: event.target.value })} />
      </label>
      <label>
        Endpoint opcional
        <input placeholder="Déjalo vacío para usar el endpoint por defecto" value={settings.ai.endpoint || ''} onChange={(event) => updateAi({ endpoint: event.target.value })} />
      </label>
      <div className="grid-2">
        <label>
          Tamaño IA
          <select value={settings.ai.size} onChange={(event) => updateAi({ size: event.target.value as AppSettings['ai']['size'] })}>
            <option value="1024x1024">1024x1024</option>
            <option value="1024x1536">1024x1536</option>
            <option value="1536x1024">1536x1024</option>
            <option value="auto">Auto</option>
          </select>
        </label>
        <label>
          Colores máx.
          <input type="number" min={1} max={24} value={settings.ai.maxColors} onChange={(event) => updateAi({ maxColors: Number(event.target.value) })} />
        </label>
      </div>
      <label>
        Preset textil
        <select value={settings.ai.printPreset} onChange={(event) => updateAi({ printPreset: event.target.value as AppSettings['ai']['printPreset'] })}>
          <option value="dtg">DTG / impresión directa</option>
          <option value="screenprint">Serigrafía</option>
          <option value="embroidery">Bordado</option>
          <option value="mockup">Mockup comercial</option>
        </select>
      </label>
      <label className="check-row">
        <input type="checkbox" checked={settings.ai.preserveLogos} onChange={(event) => updateAi({ preserveLogos: event.target.checked })} />
        Preservar logos/textos exactos
      </label>
      <label className="check-row">
        <input type="checkbox" checked={settings.ai.transparentBackground} onChange={(event) => updateAi({ transparentBackground: event.target.checked })} />
        Preferir fondo transparente
      </label>
      <button className="primary" onClick={onSave}>Guardar configuración</button>
      <div className="api-guide">
        <div className="guide-title">{apiGuide.title}</div>
        {apiGuide.url && (
          <a href={apiGuide.url} target="_blank" rel="noreferrer">
            Abrir página para crear API key
          </a>
        )}
        <ol>
          {apiGuide.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
        <p>{apiGuide.safetyNote}</p>
      </div>
      <p className="hint">Las claves se guardan en el perfil local de la app. No se suben al chat.</p>
    </section>
  );
}
