import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseRoutes, isDynamicPageFile, routeFromPageFile } from './routes.mjs';

test('file-based routers map to concrete paths', () => {
  assert.equal(routeFromPageFile('app/page.tsx'), '/');
  assert.equal(routeFromPageFile('src/app/page.tsx'), '/');
  assert.equal(routeFromPageFile('app/about/page.tsx'), '/about');
  assert.equal(routeFromPageFile('app/(marketing)/about/page.tsx'), '/about');
  assert.equal(routeFromPageFile('app/@modal/page.tsx'), '/');
  assert.equal(routeFromPageFile('pages/index.tsx'), '/');
  assert.equal(routeFromPageFile('pages/about.tsx'), '/about');
  assert.equal(routeFromPageFile('pages/about/index.tsx'), '/about');
  assert.equal(routeFromPageFile('src/pages/docs/index.astro'), '/docs');
  assert.equal(routeFromPageFile('src/pages/pricing.vue'), '/pricing');
  assert.equal(routeFromPageFile('src/routes/+page.svelte'), '/');
  assert.equal(routeFromPageFile('src/routes/about/+page.svelte'), '/about');
  assert.equal(routeFromPageFile('app/routes/_index.tsx'), '/');
  assert.equal(routeFromPageFile('app/routes/about.tsx'), '/about');
  assert.equal(routeFromPageFile('app/routes/_auth.login.tsx'), '/login');
});

test('dynamic, private, and api files are not routes', () => {
  assert.equal(routeFromPageFile('app/blog/[slug]/page.tsx'), null);
  assert.equal(isDynamicPageFile('app/blog/[slug]/page.tsx'), true);
  assert.equal(routeFromPageFile('src/routes/blog/[slug]/+page.svelte'), null);
  assert.equal(routeFromPageFile('pages/blog/[slug].tsx'), null);
  assert.equal(routeFromPageFile('app/routes/blog.$slug.tsx'), null);
  assert.equal(routeFromPageFile('pages/api/hello.ts'), null);
  assert.equal(routeFromPageFile('pages/_app.tsx'), null);
  assert.equal(routeFromPageFile('app/about/chart.test.tsx'), null);
});

test('a changed component uses the nearest page, otherwise the fallback', () => {
  const tree = new Set([
    'app/page.tsx',
    'app/about/page.tsx',
    'pages/about.tsx',
    'pages/index.tsx',
  ]);
  const exists = file => tree.has(file);

  assert.deepEqual(chooseRoutes(['app/about/chart.tsx'], exists), ['/about']);
  // Pages router: a file under pages/ is itself a route, not a component of the parent.
  assert.deepEqual(chooseRoutes(['pages/about/widget.tsx'], exists), ['/about/widget']);
  assert.deepEqual(chooseRoutes(['app/layout.tsx'], exists), ['/']);
  assert.deepEqual(chooseRoutes(['src/App.tsx', 'src/index.css'], () => false), ['/']);
  assert.deepEqual(
    chooseRoutes(['app/about/page.tsx', 'app/blog/page.tsx', 'README.md'], file => file.endsWith('page.tsx') || file === 'app/page.tsx'),
    ['/blog', '/about'],
  );
});

test('explicit routes replace the heuristic and maxRoutes caps the list', () => {
  assert.deepEqual(chooseRoutes(['src/App.tsx'], () => false, { routes: ['/day/1', '/day/2'], maxRoutes: 3 }), ['/day/1', '/day/2']);
  const tree = new Set(['app/page.tsx', 'app/a/page.tsx', 'app/b/page.tsx', 'app/c/page.tsx']);
  assert.deepEqual(
    chooseRoutes(['app/a/page.tsx', 'app/b/page.tsx', 'app/c/page.tsx'], file => tree.has(file), { maxRoutes: 2 }),
    ['/a', '/b'],
  );
});
