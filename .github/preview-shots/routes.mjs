/**
 * Guess which URLs a diff touches, from file paths.
 * Dynamic segments ([slug], $id) are skipped: a smoke check cannot invent ids.
 * Repos with no file-based router (this one) get the fallback, usually "/".
 */

const PAGE_BASENAMES = [
  'page.tsx', 'page.jsx', 'page.ts', 'page.js', 'page.mdx',
  '+page.svelte',
  'index.tsx', 'index.jsx', 'index.ts', 'index.js', 'index.mdx',
  'index.astro', 'index.vue', 'index.md',
];

const SIBLING_EXTS = ['tsx', 'jsx', 'ts', 'js', 'mdx', 'astro', 'vue', 'md', 'svelte'];

const ROUTE_ROOTS = ['app', 'src/app', 'pages', 'src/pages', 'src/routes', 'app/routes'];

function normalize(file) {
  return file.replaceAll('\\', '/').replace(/^\.\//, '');
}

function pathOf(parts) {
  const clean = parts.filter(Boolean);
  return clean.length ? `/${clean.join('/')}` : '/';
}

function fromSegments(segments, { stripGroups }) {
  const kept = [];
  for (const seg of segments) {
    if (!seg) continue;
    if (stripGroups && /^\([^)]+\)$/.test(seg)) continue;
    if (stripGroups && seg.startsWith('@')) continue;
    kept.push(seg);
  }
  if (kept.some(seg => seg.includes('[') || seg.startsWith(':'))) return { dynamic: true };
  return { path: pathOf(kept) };
}

/** @returns {{ path?: string, dynamic?: boolean } | null} */
export function parsePage(file) {
  const f = normalize(file);
  if (/\.(?:test|spec|stories)\.[jt]sx?$/.test(f)) return null;

  let match = f.match(/^(?:src\/)?app\/(.*\/)?page\.(?:jsx?|tsx?|mdx)$/);
  if (match) return fromSegments((match[1] || '').split('/').filter(Boolean), { stripGroups: true });

  match = f.match(/^(?:src\/)?pages\/(.+)\.(?:jsx?|tsx?|mdx)$/);
  if (match) return fromPagesSpec(match[1]);

  match = f.match(/^src\/routes\/(.*\/)?\+page\.svelte$/);
  if (match) return fromSegments((match[1] || '').split('/').filter(Boolean), { stripGroups: true });

  match = f.match(/^(?:src\/)?pages\/(.+)\.(?:astro|vue|md|mdx)$/);
  if (match) return fromPagesSpec(match[1]);

  match = f.match(/^(?:app|src\/app)\/routes\/(.+)\.(?:jsx?|tsx?)$/);
  if (match) return fromRemix(match[1]);

  return null;
}

function fromPagesSpec(spec) {
  const parts = spec.split('/');
  if (parts[0] === 'api' || parts[0].startsWith('_')) return null;
  if (parts.some(part => part.includes('[') || part.startsWith(':'))) return { dynamic: true };
  if (parts.at(-1) === 'index') parts.pop();
  return { path: pathOf(parts) };
}

function fromRemix(spec) {
  if (spec.includes('$')) return { dynamic: true };
  const parts = [];
  for (const seg of spec.split('.')) {
    if (seg === 'index' || seg === '_index' || seg.startsWith('_')) continue;
    parts.push(seg);
  }
  return { path: pathOf(parts) };
}

export function routeFromPageFile(file) {
  const parsed = parsePage(file);
  if (!parsed || parsed.dynamic || !parsed.path) return null;
  return parsed.path;
}

export function isDynamicPageFile(file) {
  return Boolean(parsePage(file)?.dynamic);
}

function insideRouteRoot(dir) {
  return ROUTE_ROOTS.some(root => dir === root || dir.startsWith(`${root}/`));
}

function look(dir, exists) {
  const base = dir.split('/').at(-1) || '';
  if (base.includes('[') || base.startsWith('$')) return null;

  for (const name of PAGE_BASENAMES) {
    const candidate = `${dir}/${name}`;
    if (!exists(candidate)) continue;
    const route = routeFromPageFile(candidate);
    if (route) return route;
  }

  const parent = dir.includes('/') ? dir.slice(0, dir.lastIndexOf('/')) : '.';
  if (parent === '.' || !base) return null;
  for (const ext of SIBLING_EXTS) {
    const sibling = parent === '.' ? `${base}.${ext}` : `${parent}/${base}.${ext}`;
    if (!exists(sibling)) continue;
    const route = routeFromPageFile(sibling);
    if (route) return route;
  }
  return null;
}

/** Nearest concrete route for a changed file, or null when the path is not a routable page. */
export function nearestRoute(file, exists) {
  const f = normalize(file);
  if (isDynamicPageFile(f)) return null;
  const direct = routeFromPageFile(f);
  if (direct) return direct;

  let dir = f.includes('/') ? f.slice(0, f.lastIndexOf('/')) : '.';
  while (dir && dir !== '.' && insideRouteRoot(dir)) {
    const found = look(dir, exists);
    if (found) return found;
    dir = dir.includes('/') ? dir.slice(0, dir.lastIndexOf('/')) : '.';
  }
  return null;
}

/**
 * @param {string[]} files repo-relative paths changed in the pull request
 * @param {(file: string) => boolean} exists
 * @param {{ routes?: string[], fallbackRoutes?: string[], maxRoutes?: number }} [options]
 */
export function chooseRoutes(files, exists, options = {}) {
  const maxRoutes = options.maxRoutes ?? 3;
  if (Array.isArray(options.routes) && options.routes.length) {
    return options.routes.slice(0, maxRoutes);
  }
  const found = new Set();
  for (const file of files) {
    const route = nearestRoute(file, exists);
    if (route) found.add(route);
  }
  const fallback = options.fallbackRoutes?.length ? options.fallbackRoutes : ['/'];
  const list = found.size ? [...found] : fallback;
  list.sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0));
  return list.slice(0, maxRoutes);
}
