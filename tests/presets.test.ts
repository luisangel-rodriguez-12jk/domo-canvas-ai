import { describe, expect, it } from 'vitest';
import { applyPromptPreset, promptPresets } from '../src/core/presets';

describe('creative presets', () => {
  it('exposes Domo-focused presets for fast streetwear prompting', () => {
    expect(promptPresets.length).toBeGreaterThanOrEqual(6);
    expect(promptPresets.map((preset) => preset.id)).toContain('gothic-mexican');
    expect(promptPresets.map((preset) => preset.id)).toContain('screenprint-3-inks');
  });

  it('combines a selected preset with the user idea without losing the idea', () => {
    const prompt = applyPromptPreset('gothic-mexican', 'usa el logo central');
    expect(prompt).toMatch(/gótico mexicano/i);
    expect(prompt).toMatch(/usa el logo central/i);
  });
});
