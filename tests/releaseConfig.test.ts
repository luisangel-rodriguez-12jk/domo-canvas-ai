import { describe, expect, it } from 'vitest';
import { buildGitHubPublishConfig } from '../src/core/releaseConfig';

describe('release config helpers', () => {
  it('derives GitHub owner and repo from GITHUB_REPOSITORY', () => {
    expect(buildGitHubPublishConfig('LuisAngel/domo-canvas-ai')).toEqual({ provider: 'github', owner: 'LuisAngel', repo: 'domo-canvas-ai' });
  });

  it('rejects malformed repository identifiers', () => {
    expect(() => buildGitHubPublishConfig('domo-canvas-ai')).toThrow(/owner\/repo/i);
    expect(() => buildGitHubPublishConfig('')).toThrow(/owner\/repo/i);
  });
});
