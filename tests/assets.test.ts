import { describe, expect, it } from 'vitest';
import { domoAssets } from '../src/core/assets';

describe('Domo asset library', () => {
  it('ships reusable transparent SVG assets with print-friendly dimensions', () => {
    expect(domoAssets.length).toBeGreaterThanOrEqual(3);
    expect(domoAssets.every((asset) => asset.src.startsWith('data:image/svg+xml,'))).toBe(true);
    expect(domoAssets.every((asset) => asset.width >= 1000 && asset.height >= 1000)).toBe(true);
  });
});
