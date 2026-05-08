import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(join(process.cwd(), '.github/workflows/release.yml'), 'utf8');

describe('GitHub release workflow', () => {
  it('builds the Vite renderer and Electron main before packaging the Windows installer', () => {
    const buildIndex = workflow.indexOf('run: npm run build');
    const packageIndex = workflow.indexOf('run: npx electron-builder --win nsis --publish always');

    expect(buildIndex).toBeGreaterThan(-1);
    expect(packageIndex).toBeGreaterThan(-1);
    expect(buildIndex).toBeLessThan(packageIndex);
  });
});
