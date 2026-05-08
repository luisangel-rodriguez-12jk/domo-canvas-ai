import { describe, expect, it } from 'vitest';
import { getApiKeyGuide } from '../src/core/apiKeyGuide';

describe('API key guide', () => {
  it('returns concrete OpenAI steps and a direct key URL', () => {
    const guide = getApiKeyGuide('openai');
    expect(guide.title).toContain('OpenAI');
    expect(guide.url).toBe('https://platform.openai.com/api-keys');
    expect(guide.steps.join(' ')).toMatch(/Create new secret key/i);
    expect(guide.safetyNote).toMatch(/no la compartas/i);
  });

  it('returns concrete Gemini steps and a direct Google AI Studio URL', () => {
    const guide = getApiKeyGuide('gemini');
    expect(guide.title).toContain('Gemini');
    expect(guide.url).toBe('https://aistudio.google.com/app/apikey');
    expect(guide.steps.join(' ')).toMatch(/Create API key/i);
  });

  it('keeps mock mode clear that no key is needed', () => {
    const guide = getApiKeyGuide('mock');
    expect(guide.url).toBeNull();
    expect(guide.steps.join(' ')).toMatch(/No necesitas API key/i);
  });
});
