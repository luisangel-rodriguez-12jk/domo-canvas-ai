import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'src/components/AssetLibrary.tsx'), 'utf8');

describe('User asset library', () => {
  it('lets users load their own image assets instead of shipping fixed Domo assets', () => {
    expect(source).toContain('Cargar archivos');
    expect(source).toContain('multiple hidden');
    expect(source).toContain('application/x-domo-asset');
    expect(source).not.toContain('domoAssets');
  });
});
