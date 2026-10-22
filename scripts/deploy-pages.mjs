#!/usr/bin/env node
/**
 * Build, gate and publish dist/ to the gh-pages branch, then verify the live site.
 *
 *   GH_TOKEN=... node scripts/deploy-pages.mjs [--repo owner/name] [--skip-build] [--verify-only]
 *
 * Token: GH_TOKEN, GITHUB_TOKEN or crsragent. It reaches git only through a
 * credential helper that reads an environment variable, so it never appears in
 * argv, git config, the published tree or this script's output.
 *
 * Gates: --preflight refuses to publish any file whose extension is not
 * web-servable; --verify probes the live URL for 200 and confirms that source
 * paths (package.json, src/, scripts/, tests/, docs/) do not resolve.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const REPO = opt('--repo', 'mizcausevic-dev/pem-electrolyzer-stack-anatomy');
const [OWNER, NAME] = REPO.split('/');
const LIVE = `https://${OWNER}.github.io/${NAME}/`;

const ALLOWED = new Set(['.html', '.js', '.css', '.svg', '.png', '.jpg', '.webp', '.woff', '.woff2', '.mp4', '.xml', '.ico']);
const MUST_NOT_RESOLVE = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'README.md',
  'src/main.ts',
  'src/engine/render.ts',
  'scripts/render.mjs',
  'scripts/deploy-pages.mjs',
  'tests/determinism.test.ts',
  'docs/medium-article-Cursor.md',
  '.git/config',
];

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

function preflight() {
  if (!existsSync(dist)) throw new Error('dist/ not found: run the build first');
  const files = walk(dist);
  const bad = files.filter((f) => {
    const rel = relative(dist, f);
    return !ALLOWED.has(extname(f).toLowerCase()) || rel.split('/').some((s) => s.startsWith('.'));
  });
  if (bad.length) {
    console.error('preflight FAILED, refusing to publish:');
    for (const f of bad) console.error(`  ${relative(dist, f)}`);
    process.exit(1);
  }
  console.log(`preflight ok: ${files.length} files, all web-servable`);
}

function token() {
  const t = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || process.env.crsragent;
  if (!t) throw new Error('set GH_TOKEN (or GITHUB_TOKEN) to publish');
  return t;
}

const HELPER = '!f() { echo username=x-access-token; echo "password=$GH_DEPLOY_TOKEN"; }; f';

function git(cwd, gitArgs, { quiet = false, allowFail = false } = {}) {
  const res = spawnSync('git', ['-c', 'credential.helper=', '-c', `credential.helper=${HELPER}`, ...gitArgs], {
    cwd,
    env: { ...process.env, GH_DEPLOY_TOKEN: token(), GIT_TERMINAL_PROMPT: '0' },
    encoding: 'utf8',
  });
  if (res.status !== 0 && !allowFail) {
    throw new Error(`git ${gitArgs[0]} failed:\n${(res.stderr || '').replaceAll(token(), '***')}`);
  }
  if (!quiet && res.stdout.trim()) console.log(res.stdout.trim());
  return res;
}

function publish() {
  const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const name = execFileSync('git', ['config', 'user.name'], { cwd: root, encoding: 'utf8' }).trim();
  const email = execFileSync('git', ['config', 'user.email'], { cwd: root, encoding: 'utf8' }).trim();
  const tmp = mkdtempSync(join(tmpdir(), 'pem-pages-'));
  try {
    git(tmp, ['init', '-q']);
    git(tmp, ['remote', 'add', 'origin', `https://github.com/${REPO}.git`]);
    const fetched = git(tmp, ['fetch', '-q', '--depth', '1', 'origin', 'gh-pages'], { allowFail: true });
    if (fetched.status === 0) {
      git(tmp, ['checkout', '-q', '-B', 'gh-pages', 'FETCH_HEAD']);
      git(tmp, ['rm', '-rq', '--ignore-unmatch', '.'], { quiet: true });
    } else {
      git(tmp, ['checkout', '-q', '--orphan', 'gh-pages']);
    }
    cpSync(dist, tmp, { recursive: true });
    writeFileSync(join(tmp, '.nojekyll'), '');
    git(tmp, ['add', '-A']);
    const changed = git(tmp, ['diff', '--cached', '--quiet'], { allowFail: true }).status !== 0;
    if (!changed) {
      console.log('gh-pages already matches this build; nothing to push');
      return;
    }
    git(tmp, ['-c', `user.name=${name}`, '-c', `user.email=${email}`, 'commit', '-q', '-m', `deploy: build of ${sha}`]);
    git(tmp, ['push', '-q', 'origin', 'gh-pages']);
    console.log(`pushed build of ${sha} to ${REPO}@gh-pages`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

async function verify() {
  const marker = /assets\/index-[\w-]+\.js/.exec(walk(dist).map((f) => relative(dist, f)).join('\n'))?.[0];
  const deadline = Date.now() + 10 * 60 * 1000;
  let ok = false;
  while (Date.now() < deadline) {
    const res = await fetch(`${LIVE}?v=${Date.now()}`, { cache: 'no-store' }).catch(() => null);
    const body = res && res.ok ? await res.text() : '';
    if (res?.status === 200 && (!marker || body.includes(marker))) {
      ok = true;
      break;
    }
    console.log(`waiting for Pages (${res ? res.status : 'no response'})...`);
    await new Promise((r) => setTimeout(r, 15000));
  }
  if (!ok) throw new Error(`live site did not serve this build within 10 minutes: ${LIVE}`);
  console.log(`verify ok: ${LIVE} serves ${marker ?? 'the build'}`);
  for (const asset of ['media/pem-electrolyzer-explainer-Cursor.mp4', 'media/og-Cursor.png', 'sitemap.xml']) {
    const r = await fetch(LIVE + asset, { method: 'HEAD' });
    console.log(`  ${r.status}  ${asset}`);
    if (r.status !== 200) throw new Error(`expected 200 for ${asset}`);
  }
  const leaks = [];
  for (const p of MUST_NOT_RESOLVE) {
    const r = await fetch(LIVE + p, { method: 'HEAD' });
    if (r.status !== 404) leaks.push(`${r.status} ${p}`);
  }
  if (leaks.length) throw new Error(`source paths reachable on the live site:\n  ${leaks.join('\n  ')}`);
  console.log(`verify ok: ${MUST_NOT_RESOLVE.length} source paths return 404`);
}

if (!flag('--verify-only')) {
  if (!flag('--skip-build')) execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
  preflight();
  publish();
}
await verify();
