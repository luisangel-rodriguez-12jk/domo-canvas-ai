import { describe, expect, it } from 'vitest';
import config from '../vite.config';

describe('Vite Electron production config', () => {
  it('uses relative asset paths so file:// packaged Electron loads the renderer bundle', () => {
    expect((config as { base?: string }).base).toBe('./');
  });
});
