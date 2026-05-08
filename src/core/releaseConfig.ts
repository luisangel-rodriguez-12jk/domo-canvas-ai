export interface GitHubPublishConfig {
  provider: 'github';
  owner: string;
  repo: string;
}

export function buildGitHubPublishConfig(repository: string): GitHubPublishConfig {
  const [owner, repo, ...rest] = repository.split('/').map((part) => part.trim()).filter(Boolean);
  if (!owner || !repo || rest.length > 0) {
    throw new Error('GITHUB_REPOSITORY debe tener formato owner/repo.');
  }
  return { provider: 'github', owner, repo };
}
