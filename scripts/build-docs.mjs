// Generates the demo site from scripts/docs-data.mjs.
//
//   docs/style.css              shared stylesheet
//   docs/index.html             the grid of all sixteen
//   docs/effects/<kind>.html    one page per kind, with every option it takes
//
// Run: bun run docs:build
//
// The output is committed, for the same reason nitrogen/generated is: the Pages
// workflow only uploads docs/, and a site that needs a build step to be read
// locally is a site nobody reads locally.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { EFFECTS, UNIVERSAL_OPTIONS } from './docs-data.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs');
const REPO = 'https://github.com/saleh2001k/react-native-nitro-theme-transition';

/** Escape for use in a text node or a double-quoted attribute. */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// ---------------------------------------------------------------- page shell

function page({ title, description, depth, body, extraHead = '' }) {
  const up = depth === 0 ? '' : '../';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <link rel="stylesheet" href="${up}style.css" />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='26' font-size='26'>🌗</text></svg>" />
${extraHead}  </head>
  <body>
    <div class="wrap">
${body}
      <footer>
        MIT © <a href="https://salehos.com">Saleh Almashni</a> ·
        <a href="${REPO}">source</a> · built on
        <a href="https://nitro.margelo.com">Nitro Modules</a>
      </footer>
    </div>
    <script src="${up}site.js"></script>
  </body>
</html>
`;
}

const themeButton = `        <button class="btn" id="toggle" type="button" aria-label="Toggle colour scheme">
          <span id="toggle-icon">🌙</span> <span id="toggle-label">Dark</span>
        </button>`;

// --------------------------------------------------------------- index page

function indexPage() {
  const cards = EFFECTS.map(
    e => `        <a class="card" href="effects/${e.kind}.html">
          <video muted loop playsinline preload="none" poster="poster/${e.file}.jpg"
                 aria-label="${esc(e.kind)} transition running on Android and iOS">
            <source src="media/${e.file}.mp4" type="video/mp4" />
          </video>
          <span class="meta">
            <span class="name"><code>${e.kind}</code></span>
            <span class="desc">${e.tagline}</span>
            <span class="more">Options and native detail →</span>
          </span>
        </a>`,
  ).join('\n');

  const body = `      <header>
        <div class="top">
          <div>
            <h1>react-native-nitro-theme-transition</h1>
            <p class="lede">
              Native, GPU-driven theme-change transitions for React Native — sixteen of them.
              <strong>No Skia. No Reanimated. No JS animation library.</strong>
            </p>
            <p class="lede">
              The animation is Core Animation on iOS and the platform animators on Android, both
              interpolated by the OS render thread, so a busy JavaScript thread cannot drop a frame
              of it.
            </p>
            <p class="byline">
              Built by <a href="https://salehos.com">Saleh Almashni</a>
            </p>
          </div>
${themeButton}
        </div>

        <div class="cta">
          <a class="btn" href="${REPO}">GitHub</a>
          <a class="btn" href="https://www.npmjs.com/package/react-native-nitro-theme-transition">npm</a>
          <a class="btn" href="${REPO}#usage">Docs</a>
        </div>

        <pre class="install">npm install react-native-nitro-theme-transition react-native-nitro-modules</pre>
      </header>

      <h2>The sixteen effects</h2>
      <p class="sub">
        Every clip is the same screen of the <a href="${REPO}/tree/main/example">example app</a>,
        running on an Android emulator and an iOS simulator at the same time. Open one for the
        options it takes and how it is done natively.
      </p>
      <div class="grid">
${cards}
      </div>
`;

  return page({
    title: 'react-native-nitro-theme-transition — sixteen native theme transitions',
    description:
      'GPU-driven theme-change transitions for React Native. Sixteen effects, no Skia, no Reanimated, no JS animation library.',
    depth: 0,
    body,
  });
}

// -------------------------------------------------------------- effect page

function optionRow(o) {
  const values = o.values
    ? `\n              <dl class="values">${o.values
        .map(([v, d]) => `<dt><code>'${v}'</code></dt><dd>${d}</dd>`)
        .join('')}</dl>`
    : '';
  return `            <tr>
              <td><code class="opt">${o.name}</code></td>
              <td><code class="type">${esc(o.type)}</code></td>
              <td><code>${esc(o.default)}</code></td>
              <td>${o.note}${values}</td>
            </tr>`;
}

function example(e) {
  const lines = [`  kind: '${e.kind}',`, `  durationMs: ${Math.max(650, e.floor)},`];
  const names = e.options.map(o => o.name);
  if (names.includes('origin')) lines.push('  origin: { x: pageX, y: pageY },');
  if (names.includes('shape')) lines.push("  shape: 'hexagon',");
  if (names.includes('blurStyle')) lines.push("  blurStyle: 'sweep',");
  if (names.includes('direction')) lines.push("  direction: 'bottom',");
  if (names.includes('angleDeg')) lines.push('  angleDeg: 0,');
  if (names.includes('bands')) lines.push('  bands: 6,');
  return `withThemeTransition(applyTheme, {\n${lines.join('\n')}\n});`;
}

function effectPage(e, index) {
  const prev = EFFECTS[index - 1];
  const next = EFFECTS[index + 1];

  const rows = [...e.options, ...UNIVERSAL_OPTIONS].map(optionRow).join('\n');

  const ignored = EFFECTS.length
    ? ['origin', 'direction', 'angleDeg', 'shape', 'blurStyle', 'bands'].filter(
        n => !e.options.some(o => o.name === n),
      )
    : [];

  const asides = [
    e.note ? `        <aside class="aside"><h3>Worth knowing</h3><p>${e.note}</p></aside>` : '',
    e.platform
      ? `        <aside class="aside warn"><h3>Platform</h3><p>${e.platform}</p></aside>`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const body = `      <nav class="crumbs">
        <a href="../index.html">← All sixteen effects</a>
${themeButton}
      </nav>

      <article>
        <h1><code>${e.kind}</code></h1>
        <p class="lede">${e.tagline}</p>

        <video class="hero" muted loop playsinline autoplay preload="auto"
               poster="../poster/${e.file}.jpg"
               aria-label="${esc(e.kind)} transition running on Android and iOS">
          <source src="../media/${e.file}.mp4" type="video/mp4" />
        </video>
        <p class="caption">
          The <a href="${REPO}/tree/main/example">example app</a> on an Android emulator and an iOS
          simulator at once. Click to replay.
        </p>

        <p class="body">${e.body}</p>

        <h2>Options it takes</h2>
        <table class="opts">
          <thead>
            <tr><th>Option</th><th>Type</th><th>Default</th><th>What it does here</th></tr>
          </thead>
          <tbody>
${rows}
          </tbody>
        </table>
        ${
          ignored.length
            ? `<p class="ignored">Ignored by this kind: ${ignored
                .map(n => `<code>${n}</code>`)
                .join(', ')}. Passing them is harmless.</p>`
            : '<p class="ignored">Every other option is ignored by this kind. Passing them is harmless.</p>'
        }

        <h2>Minimum duration</h2>
        <p class="body">
          A request below <strong>${e.floor}ms</strong> is clamped up to it, natively, so both
          platforms agree. Below that floor a full-screen copy coming apart has too few frames to
          read as motion — the eye gets the start and the end and nothing in between, which looks
          like a flicker rather than a fast transition. <code>durationMs: 0</code> still means “no
          animation” and is never clamped.
        </p>

        <h2>Usage</h2>
        <pre class="code"><code>${esc(example(e))}</code></pre>

        <h2>How it is done</h2>
        <table class="opts native">
          <tbody>
            <tr><th>iOS</th><td>${e.ios}</td></tr>
            <tr><th>Android</th><td>${e.android}</td></tr>
          </tbody>
        </table>
${asides}
      </article>

      <nav class="pager">
        ${prev ? `<a href="${prev.kind}.html">← <code>${prev.kind}</code></a>` : '<span></span>'}
        ${next ? `<a href="${next.kind}.html"><code>${next.kind}</code> →</a>` : '<span></span>'}
      </nav>
`;

  return page({
    title: `${e.kind} — react-native-nitro-theme-transition`,
    description: `${e.tagline} Every option the ${e.kind} theme transition takes, and how it is implemented on iOS and Android.`,
    depth: 1,
    body,
    // The hero video is the page's whole point, so it is worth telling the
    // browser to start it before the parser reaches the <video>.
    extraHead: `    <link rel="preload" as="video" href="../media/${e.file}.mp4" />\n`,
  });
}

// ------------------------------------------------------------------- write

mkdirSync(join(DOCS, 'effects'), { recursive: true });

writeFileSync(join(DOCS, 'index.html'), indexPage());
for (const [i, effect] of EFFECTS.entries()) {
  writeFileSync(join(DOCS, 'effects', `${effect.kind}.html`), effectPage(effect, i));
}

console.log(`docs: index.html + ${EFFECTS.length} effect pages`);
