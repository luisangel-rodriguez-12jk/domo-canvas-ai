import fs from 'node:fs';

const repository = process.env.GITHUB_REPOSITORY;
if (!repository || !repository.includes('/')) {
  throw new Error('GITHUB_REPOSITORY debe existir y tener formato owner/repo.');
}

const [owner, repo] = repository.split('/');
const packagePath = new URL('../package.json', import.meta.url);
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

pkg.repository = {
  type: 'git',
  url: `https://github.com/${owner}/${repo}.git`,
};

pkg.build = {
  ...pkg.build,
  publish: [
    {
      provider: 'github',
      owner,
      repo,
      releaseType: 'release',
    },
  ],
};

fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`Configured electron-builder publish target: ${owner}/${repo}`);
