/**
 * Resolve a Vercel preview URL, screenshot it against production, post to Linear.
 *
 *   node shot.mjs resolve    # print the preview URL (waits for the deploy on pull_request)
 *   node shot.mjs capture    # screenshots + Linear comment + out/comment.md
 *   node shot.mjs run        # resolve, then capture (local / manual)
 *
 * Copy this folder with `.github/workflows/preview-screenshots.yml` and `preview-shots.json`.
 */
import { execFile, execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync, appendFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { chooseRoutes } from './routes.mjs';

const execFileAsync = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = findRoot(here);
const outDir = path.join(here, 'out');
const MARKER = '<!-- preview-shots';

function findRoot(start) {
  let dir = start;
  while (dir !== path.dirname(dir)) {
    if (existsSync(path.join(dir, '.git'))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error(`No git root above ${start}`);
}

function loadConfig() {
  const defaults = {
    productionUrl: '',
    fallbackRoutes: ['/'],
    maxRoutes: 3,
    waitFor: 'body',
    viewports: {
      phone: { width: 390, height: 844 },
      desktop: { width: 1280, height: 800 },
    },
    vercel: { projectId: '', teamId: '' },
  };
  const file = path.join(root, 'preview-shots.json');
  const raw = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  return {
    ...defaults,
    ...raw,
    productionUrl: process.env.PRODUCTION_URL || raw.productionUrl || '',
    fallbackRoutes: raw.fallbackRoutes?.length ? raw.fallbackRoutes : defaults.fallbackRoutes,
    maxRoutes: raw.maxRoutes ?? defaults.maxRoutes,
    waitFor: raw.waitFor || defaults.waitFor,
    viewports: { ...defaults.viewports, ...raw.viewports },
    vercel: { ...defaults.vercel, ...raw.vercel },
    routes: raw.routes,
  };
}

function readEvent() {
  const file = process.env.GITHUB_EVENT_PATH;
  if (!file || !existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

function token() {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
}

function setOutput(pairs) {
  const lines = Object.entries(pairs)
    .map(([key, value]) => `${key}=${String(value ?? '').replace(/\r?\n/g, ' ')}`)
    .join('\n');
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines}\n`);
  for (const [key, value] of Object.entries(pairs)) console.log(`${key}=${value}`);
}

async function gh(pathname, { accept } = {}) {
  const auth = token();
  if (!auth) throw new Error('GITHUB_TOKEN is not set');
  const res = await fetch(`https://api.github.com${pathname}`, {
    headers: {
      Authorization: `Bearer ${auth}`,
      Accept: accept || 'application/vnd.github+json',
      'User-Agent': 'preview-shots',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (res.status === 404) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`GitHub ${res.status} ${pathname}: ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}

function isDeploymentUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname;
    if (host === 'github.com' || host.endsWith('.github.com')) return false;
    if (host === 'vercel.com' || host.endsWith('.vercel.com')) return false;
    return true;
  } catch {
    return false;
  }
}

function hostOf(value) {
  try {
    return new URL(value).host;
  } catch {
    return '';
  }
}

function eventIsProduction(event) {
  const env = `${event.deployment?.environment || ''} ${event.deployment_status?.environment || ''}`;
  return /production/i.test(env);
}

function urlFromStatus(status = {}) {
  for (const key of ['environment_url', 'target_url', 'log_url']) {
    if (isDeploymentUrl(status[key])) return status[key];
  }
  return '';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function githubPreviewUrl(repo, sha, productionUrl) {
  const deployments = await gh(`/repos/${repo}/deployments?sha=${encodeURIComponent(sha)}&per_page=20`);
  for (const deployment of deployments || []) {
    if (/production/i.test(deployment.environment || '')) continue;
    const statuses = await gh(`/repos/${repo}/deployments/${deployment.id}/statuses?per_page=10`);
    const success = (statuses || []).find(status => status.state === 'success');
    const url = success && urlFromStatus(success);
    if (url && hostOf(url) !== hostOf(productionUrl)) return url;
  }
  const combined = await gh(`/repos/${repo}/commits/${sha}/status`);
  for (const status of combined?.statuses || []) {
    if (status.state !== 'success' || !/vercel/i.test(status.context || '')) continue;
    if (isDeploymentUrl(status.target_url) && hostOf(status.target_url) !== hostOf(productionUrl)) {
      return status.target_url;
    }
  }
  return '';
}

async function vercelPreviewUrl(sha, config) {
  const apiToken = process.env.VERCEL_TOKEN;
  const projectId = config.vercel?.projectId;
  if (!apiToken || !projectId) return '';
  const url = new URL('https://api.vercel.com/v6/deployments');
  url.searchParams.set('projectId', projectId);
  url.searchParams.set('sha', sha);
  url.searchParams.set('limit', '20');
  if (config.vercel.teamId) url.searchParams.set('teamId', config.vercel.teamId);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${apiToken}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.warn(`Vercel API ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
    return '';
  }
  const ready = (body.deployments || []).find(item => {
    const state = item.readyState || item.state;
    return state === 'READY' && item.target !== 'production' && item.url;
  });
  if (!ready) return '';
  return ready.url.startsWith('http') ? ready.url : `https://${ready.url}`;
}

async function pullForSha(repo, sha) {
  const pulls = await gh(`/repos/${repo}/commits/${sha}/pulls`);
  const open = (pulls || []).find(pull => pull.state === 'open');
  return open || pulls?.[0] || null;
}

async function resolvePreview() {
  const config = loadConfig();
  const eventName = process.env.GITHUB_EVENT_NAME || '';
  const event = readEvent();
  const repo = process.env.GITHUB_REPOSITORY || '';
  let prNumber = process.env.PR_NUMBER || '';
  let baseSha = process.env.BASE_SHA || '';
  let headSha = process.env.HEAD_SHA || '';
  const explicit = process.env.PREVIEW_URL || '';

  if (!headSha) {
    try {
      headSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    } catch {
      headSha = '';
    }
  }

  if (eventName === 'deployment_status') {
    if (event.deployment_status?.state && event.deployment_status.state !== 'success') {
      return finish('', 'deployment status is not success', { prNumber, baseSha, headSha });
    }
    if (eventIsProduction(event)) {
      return finish('', 'production deployment', { prNumber, baseSha, headSha });
    }
    const fromEvent = urlFromStatus(event.deployment_status);
    if (fromEvent && hostOf(fromEvent) === hostOf(config.productionUrl)) {
      return finish('', 'deployment URL is the production host', { prNumber, baseSha, headSha });
    }
    if (!prNumber && repo && headSha && token()) {
      const pull = await pullForSha(repo, headSha);
      prNumber = pull?.number ? String(pull.number) : '';
      baseSha = baseSha || pull?.base?.sha || '';
    }
    if (!fromEvent) return finish('', 'deployment status had no preview URL', { prNumber, baseSha, headSha });
    return finish(fromEvent, '', { prNumber, baseSha, headSha });
  }

  if (explicit) {
    if (!isDeploymentUrl(explicit) && !explicit.startsWith('http://')) {
      return finish('', `refusing preview URL ${explicit}`, { prNumber, baseSha, headSha });
    }
    return finish(explicit, '', { prNumber, baseSha, headSha });
  }

  if (eventName !== 'pull_request' || !repo || !headSha) {
    return finish('', 'no preview URL (set PREVIEW_URL, or run from deployment_status / pull_request)', { prNumber, baseSha, headSha });
  }

  const waitMs = Number(process.env.PREVIEW_WAIT_SECONDS || 180) * 1000;
  const deadline = Date.now() + waitMs;
  console.log(`Waiting up to ${waitMs / 1000}s for a preview of ${headSha.slice(0, 7)}`);

  while (Date.now() < deadline) {
    try {
      const ghUrl = await githubPreviewUrl(repo, headSha, config.productionUrl);
      // deployment_status carries the URL and posts the comment. Capturing here too
      // doubled the job, and the shared concurrency group cancelled the real run.
      if (ghUrl) {
        return finish('', 'GitHub already has a successful preview deployment; the deployment_status run posts the screenshots', { prNumber, baseSha, headSha });
      }
    } catch (error) {
      console.warn(`GitHub deployment lookup failed: ${error.message}`);
    }
    try {
      const vercelUrl = await vercelPreviewUrl(headSha, config);
      if (vercelUrl && hostOf(vercelUrl) !== hostOf(config.productionUrl)) {
        return finish(vercelUrl, '', { prNumber, baseSha, headSha });
      }
    } catch (error) {
      console.warn(`Vercel lookup failed: ${error.message}`);
    }
    await sleep(15_000);
  }
  return finish('', 'no preview URL. Vercel did not post a GitHub deployment status, and VERCEL_TOKEN is unset or the deploy is not READY.', { prNumber, baseSha, headSha });
}

function finish(previewUrl, skipReason, ids) {
  if (skipReason) console.log(`skip: ${skipReason}`);
  if (previewUrl) console.log(`preview: ${previewUrl}`);
  setOutput({
    preview_url: previewUrl,
    skip_reason: skipReason,
    pr_number: ids.prNumber || '',
    base_sha: ids.baseSha || '',
    head_sha: ids.headSha || '',
  });
  return { previewUrl, skipReason, ...ids };
}

function changedFiles(baseSha, headSha) {
  if (!baseSha) return [];
  try {
    const out = execFileSync('git', ['diff', '--name-only', `${baseSha}...${headSha}`], { cwd: root, encoding: 'utf8' });
    return out.split('\n').map(line => line.trim()).filter(Boolean);
  } catch (error) {
    console.warn(`git diff failed (${error.message}); using fallback routes`);
    return [];
  }
}

function routeSlug(route) {
  const slug = route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  return slug || 'home';
}

function joinUrl(base, route) {
  const url = new URL(base);
  url.pathname = route.startsWith('/') ? route : `/${route}`;
  url.search = '';
  url.hash = '';
  return url.href;
}

function bypassHeaders() {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!secret) return {};
  return {
    'x-vercel-protection-bypass': secret,
    'x-vercel-set-bypass-cookie': 'true',
  };
}

async function assertNotWalled(page) {
  const title = await page.title();
  const current = page.url();
  let text = '';
  try {
    text = (await page.locator('body').innerText({ timeout: 2000 })).slice(0, 600);
  } catch {
    text = '';
  }
  const blob = `${title}\n${current}\n${text}`;
  if (/vercel\.com\/login/i.test(current) || /Authentication Required/i.test(blob) || /Log in to Vercel/i.test(blob)) {
    throw new Error(
      'Vercel Deployment Protection blocked the page. Add repository secret VERCEL_AUTOMATION_BYPASS_SECRET from Vercel → Project → Settings → Deployment Protection → Protection Bypass for Automation. The browser sends it as x-vercel-protection-bypass and x-vercel-set-bypass-cookie: true.',
    );
  }
}

async function grab(browser, target, viewport, { video, waitFor }) {
  const videoDir = video ? mkdtempSync(path.join(tmpdir(), 'preview-shot-')) : undefined;
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    extraHTTPHeaders: bypassHeaders(),
    recordVideo: video ? { dir: videoDir, size: viewport } : undefined,
  });
  try {
    const page = await context.newPage();
    const response = await page.goto(target, { waitUntil: 'load', timeout: 45_000 });
    if (waitFor) await page.waitForSelector(waitFor, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(700);
    await assertNotWalled(page);
    const png = await page.screenshot({ type: 'png' });
    if (video) {
      for (let step = 0; step < 6; step += 1) {
        await page.mouse.wheel(0, 160);
        await page.waitForTimeout(250);
      }
      await page.waitForTimeout(400);
    }
    const handle = page.video();
    await context.close();
    const videoPath = handle ? await handle.path() : '';
    return { png, videoPath, status: response?.status() ?? 0 };
  } catch (error) {
    await context.close().catch(() => {});
    if (videoDir) rmSync(videoDir, { recursive: true, force: true });
    throw error;
  }
}

async function toGif(webm, gif) {
  await execFileAsync('ffmpeg', [
    '-y', '-t', '6', '-i', webm,
    '-vf', 'fps=10,scale=390:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3',
    '-loop', '0', gif,
  ], { timeout: 60_000 });
}

function issueKeys(...chunks) {
  const keys = [];
  const seen = new Set();
  const pattern = /\b([A-Z][A-Z0-9]+-\d+)\b/g;
  const link = /linear\.app\/[^/\s]+\/issue\/([A-Z][A-Z0-9]+-\d+)/g;
  for (const chunk of chunks) {
    const text = chunk || '';
    for (const match of text.matchAll(link)) add(match[1]);
    for (const match of text.matchAll(pattern)) add(match[1]);
  }
  return keys.slice(0, 3);

  function add(key) {
    if (seen.has(key)) return;
    seen.add(key);
    keys.push(key);
  }
}

async function linear(query, variables) {
  const key = process.env.LINEAR_API_KEY;
  if (!key) throw new Error('LINEAR_API_KEY is not set');
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { Authorization: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.errors) {
    throw new Error(`Linear ${res.status}: ${JSON.stringify(body.errors || body).slice(0, 500)}`);
  }
  return body.data;
}

async function uploadToLinear(filename, contentType, bytes) {
  const data = await linear(
    `mutation($contentType: String!, $filename: String!, $size: Int!) {
      fileUpload(contentType: $contentType, filename: $filename, size: $size) {
        success
        uploadFile { uploadUrl assetUrl headers { key value } }
      }
    }`,
    { contentType, filename, size: bytes.length },
  );
  const file = data.fileUpload?.uploadFile;
  if (!data.fileUpload?.success || !file?.uploadUrl || !file.assetUrl) {
    throw new Error(`Linear fileUpload did not return an upload URL for ${filename}`);
  }
  // Match Linear's upload guide: Content-Type and Cache-Control, then every signed header.
  const headers = new Headers();
  headers.set('Content-Type', contentType);
  headers.set('Cache-Control', 'public, max-age=31536000');
  for (const header of file.headers || []) headers.set(header.key, header.value);
  const put = await fetch(file.uploadUrl, { method: 'PUT', headers, body: bytes });
  if (!put.ok) {
    const detail = await put.text().catch(() => '');
    throw new Error(`Linear upload ${filename} failed: HTTP ${put.status} ${detail.slice(0, 200)}`);
  }
  return file.assetUrl;
}

async function postLinear(keys, body) {
  const urls = [];
  for (const key of keys) {
    const data = await linear(
      `query($id: String!) {
        issue(id: $id) {
          id
          identifier
          url
          comments(last: 50) { nodes { id body url } }
        }
      }`,
      { id: key },
    );
    const issue = data.issue;
    if (!issue) {
      console.warn(`No Linear issue ${key}`);
      continue;
    }
    const prior = (issue.comments?.nodes || []).find(comment => comment.body?.includes(markerFor(body)));
    if (prior) {
      const updated = await linear(
        `mutation($id: String!, $body: String!) {
          commentUpdate(id: $id, input: { body: $body }) { success comment { id url } }
        }`,
        { id: prior.id, body },
      );
      const url = updated.commentUpdate?.comment?.url || prior.url;
      console.log(`Updated Linear comment on ${issue.identifier}: ${url}`);
      urls.push(url);
      continue;
    }
    const created = await linear(
      `mutation($id: String!, $body: String!) {
        commentCreate(input: { issueId: $id, body: $body }) { success comment { id url } }
      }`,
      { id: issue.id, body },
    );
    const url = created.commentCreate?.comment?.url;
    console.log(`Commented on ${issue.identifier}: ${url}`);
    urls.push(url);
  }
  return urls;
}

function markerFor(body) {
  const line = body.split('\n', 1)[0];
  return line.startsWith(MARKER) ? line : MARKER;
}

async function capture() {
  const config = loadConfig();
  const previewUrl = process.env.PREVIEW_URL;
  if (!previewUrl) throw new Error('PREVIEW_URL is not set');
  const headSha = process.env.HEAD_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const baseSha = process.env.BASE_SHA || '';
  const files = changedFiles(baseSha, headSha);
  const routes = chooseRoutes(files, file => existsSync(path.join(root, file)), config);
  console.log(`Changed files: ${files.length}. Routes: ${routes.join(', ') || '(none)'}`);

  mkdirSync(outDir, { recursive: true });
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
  const shots = [];
  try {
    for (const route of routes) {
      const slug = routeSlug(route);
      const targets = [
        ['before', 'phone', config.productionUrl, config.viewports.phone, false],
        ['before', 'desktop', config.productionUrl, config.viewports.desktop, false],
        ['after', 'phone', previewUrl, config.viewports.phone, true],
        ['after', 'desktop', previewUrl, config.viewports.desktop, false],
      ];
      const record = { route, slug, images: {}, notes: [] };
      for (const [side, viewportName, base, viewport, video] of targets) {
        if (!base) {
          record.notes.push(`${side} ${viewportName}: production URL is not set in preview-shots.json`);
          continue;
        }
        const target = joinUrl(base, route);
        console.log(`capture ${side} ${viewportName} ${target}`);
        try {
          const shot = await grab(browser, target, viewport, { video, waitFor: config.waitFor });
          const pngName = `${slug}-${viewportName}-${side}.png`;
          writeFileSync(path.join(outDir, pngName), shot.png);
          record.images[`${side}-${viewportName}`] = { file: pngName, bytes: shot.png, contentType: 'image/png', status: shot.status };
          if (shot.status >= 400) record.notes.push(`${side} ${viewportName} responded HTTP ${shot.status}`);
          if (video && shot.videoPath) {
            const gifName = `${slug}-phone-after.gif`;
            try {
              await toGif(shot.videoPath, path.join(outDir, gifName));
              const gif = readFileSync(path.join(outDir, gifName));
              record.images.gif = { file: gifName, bytes: gif, contentType: 'image/gif' };
            } catch (error) {
              record.notes.push(`GIF skipped (${error.message.split('\n')[0]})`);
            }
          }
        } catch (error) {
          if (/Deployment Protection/.test(error.message)) throw error;
          record.notes.push(`${side} ${viewportName}: ${error.message.split('\n')[0]}`);
          console.warn(error.message);
        }
      }
      shots.push(record);
    }
  } finally {
    await browser.close();
  }

  const repo = process.env.GITHUB_REPOSITORY || '';
  const prNumber = process.env.PR_NUMBER || '';
  let pull = null;
  let commentBodies = '';
  if (repo && prNumber && token()) {
    pull = await gh(`/repos/${repo}/pulls/${prNumber}`);
    const comments = await gh(`/repos/${repo}/issues/${prNumber}/comments?per_page=100`);
    commentBodies = (comments || []).map(comment => comment.body || '').join('\n');
  }
  const keys = issueKeys(pull?.head?.ref, pull?.title, pull?.body, commentBodies);
  console.log(keys.length ? `Linear issues: ${keys.join(', ')}` : 'No Linear issue key in the branch, PR title, body, or comments');

  const uploaded = new Map();
  if (process.env.LINEAR_API_KEY) {
    for (const shot of shots) {
      for (const image of Object.values(shot.images)) {
        const url = await uploadToLinear(image.file, image.contentType, image.bytes);
        uploaded.set(image.file, url);
        console.log(`uploaded ${image.file}`);
      }
    }
  } else {
    console.log('LINEAR_API_KEY is not set. Skipping Linear upload. Add it under GitHub → Settings → Secrets and variables → Actions.');
  }

  const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_RUN_ID && repo
    ? `${process.env.GITHUB_SERVER_URL}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : '';
  const body = renderComment({
    prNumber,
    pull,
    previewUrl,
    productionUrl: config.productionUrl,
    headSha,
    shots,
    uploaded,
    runUrl,
    viewports: config.viewports,
  });
  writeFileSync(path.join(outDir, 'comment.md'), body);

  if (process.env.LINEAR_API_KEY && keys.length) {
    await postLinear(keys, body);
  } else if (process.env.LINEAR_API_KEY) {
    console.log('Linear comment skipped: no issue key. Put the key in the branch name, PR title, or PR body (for example OWEX-123).');
  }
}

function imageMarkdown(alt, file, uploaded) {
  const url = uploaded.get(file);
  if (!url) return `_${alt} (\`${file}\` is in the workflow artifact)_`;
  return `![${alt}](${url})`;
}

function renderComment({ prNumber, pull, previewUrl, productionUrl, headSha, shots, uploaded, runUrl, viewports }) {
  const marker = prNumber ? `${MARKER} pr=${prNumber} -->` : `${MARKER} -->`;
  const lines = [marker, '### Preview screenshots', ''];
  const title = pull?.title ? ` ${pull.title}` : '';
  const prLink = pull?.html_url ? `[PR #${prNumber}](${pull.html_url})` : prNumber ? `PR #${prNumber}` : 'Pull request';
  lines.push(`${prLink}${title ? ` —${title}` : ''}`);
  lines.push('');
  lines.push(`Commit \`${(headSha || '').slice(0, 7)}\` · routes ${shots.map(shot => `\`${shot.route}\``).join(', ')}`);
  const prod = productionUrl ? `[production](${productionUrl})` : 'production URL not configured';
  lines.push(`${prod} · [preview](${previewUrl})`);
  if (runUrl) lines.push(`[Workflow run](${runUrl})`);
  lines.push('');
  for (const shot of shots) {
    lines.push(`#### \`${shot.route}\` — phone (${viewports.phone.width}×${viewports.phone.height})`, '');
    lines.push('**Production**', '');
    lines.push(shot.images['before-phone']
      ? imageMarkdown(`${shot.route} phone, production`, shot.images['before-phone'].file, uploaded)
      : '_not captured_');
    lines.push('', '**Preview**', '');
    lines.push(shot.images['after-phone']
      ? imageMarkdown(`${shot.route} phone, preview`, shot.images['after-phone'].file, uploaded)
      : '_not captured_');
    lines.push('', `#### \`${shot.route}\` — desktop (${viewports.desktop.width}×${viewports.desktop.height})`, '');
    lines.push('**Production**', '');
    lines.push(shot.images['before-desktop']
      ? imageMarkdown(`${shot.route} desktop, production`, shot.images['before-desktop'].file, uploaded)
      : '_not captured_');
    lines.push('', '**Preview**', '');
    lines.push(shot.images['after-desktop']
      ? imageMarkdown(`${shot.route} desktop, preview`, shot.images['after-desktop'].file, uploaded)
      : '_not captured_');
    lines.push('', `#### \`${shot.route}\` — preview clip`, '');
    lines.push(shot.images.gif
      ? imageMarkdown(`${shot.route} preview clip`, shot.images.gif.file, uploaded)
      : '_GIF not captured_');
    if (shot.notes.length) {
      lines.push('', shot.notes.map(note => `- ${note}`).join('\n'));
    }
    lines.push('');
  }
  lines.push('Phone and desktop stills are the top of the page. The clip is the preview at phone size, including a short scroll. Linear stores the images privately, so they render on the issue; the files are also on the workflow run.');
  return `${lines.join('\n').trim()}\n`;
}

const command = process.argv[2] || 'run';
if (command === 'resolve') {
  await resolvePreview();
} else if (command === 'capture') {
  await capture();
} else if (command === 'run') {
  const resolved = await resolvePreview();
  if (!resolved.previewUrl) process.exit(0);
  process.env.PREVIEW_URL = resolved.previewUrl;
  if (resolved.prNumber) process.env.PR_NUMBER = String(resolved.prNumber);
  if (resolved.baseSha) process.env.BASE_SHA = resolved.baseSha;
  if (resolved.headSha) process.env.HEAD_SHA = resolved.headSha;
  await capture();
} else {
  console.error('Usage: node shot.mjs resolve|capture|run');
  process.exit(1);
}
