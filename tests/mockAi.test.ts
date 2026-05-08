import { describe, expect, it } from 'vitest';
import { createProject } from '../src/core/layers';
import { createMockAiPreview } from '../src/core/mockAi';
import { defaultSettings } from '../src/core/settings';

describe('mock AI preview', () => {
  it('returns a data URL preview that includes project context without needing an API key', () => {
    const preview = createMockAiPreview({
      prompt: 'calavera con logo',
      compositionPng: 'data:image/png;base64,abc',
      project: createProject('Demo'),
      settings: defaultSettings.ai,
    });
    expect(preview.provider).toBe('mock');
    expect(preview.imageDataUrl).toMatch(/^data:image\/svg\+xml;base64,/);
  });
});
