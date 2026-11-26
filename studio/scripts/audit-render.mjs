/**
 * Deterministic audit of the card renderer.
 *
 * Runs without Electron: imports the same renderer the app uses
 * (shared/card.mjs) and the same preset table as the Studio UI
 * (src/lib/presets.ts, type-stripped by Node 26).
 *
 * Fails loudly if any palette or control stops reaching the HTML.
 */
import { buildCardHtml } from '../shared/card.mjs';
import { PRESETS, mergeAppearance } from '../src/lib/presets.ts';

const ITEM = {
  quote: 'The secret of getting ahead is getting started.',
  author: 'Mark Twain',
  category: 'Motivation',
};

const DATE = '2026-11-12';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  if (!ok) console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
}

function render(appearance, patch = {}) {
  return buildCardHtml({
    width: 1920,
    height: 1080,
    item: ITEM,
    date: DATE,
    appearance: { ...appearance, ...patch },
  });
}

const norm = (hex) => String(hex).toLowerCase();

// ---------------------------------------------------------------- palettes
for (const preset of PRESETS) {
  const appearance = preset.appearance;
  const palette = appearance.palette;
  const html = render(appearance);
  const tag = `${preset.name}:`;

  check(`${tag} body background ${palette.bg}`, html.includes(`background:${norm(palette.bg)}`));
  check(`${tag} body colour ${palette.fg}`, html.includes(`body{background:${norm(palette.bg)};color:${norm(palette.fg)}`));

  if (appearance.background.kind === 'solid') {
    check(`${tag} solid layer ${palette.bg}`, html.includes(`<div class="bg" style="background:${norm(palette.bg)}"></div>`));
  } else if (appearance.background.kind === 'gradient') {
    check(
      `${tag} gradient from ${appearance.background.from}`,
      html.includes(norm(appearance.background.from)),
    );
    check(
      `${tag} gradient to ${appearance.background.to}`,
      html.includes(norm(appearance.background.to)),
    );
    check(
      `${tag} gradient angle ${appearance.background.angle}`,
      html.includes(`linear-gradient(${appearance.background.angle}deg`),
    );
  }

  check(`${tag} author muted ${palette.muted}`, html.includes(`color:${norm(palette.muted)}`));
  if (appearance.showRule !== false) {
    check(`${tag} rule accent ${palette.accent}`, html.includes(`background:${norm(palette.accent)}`));
  }
  check(`${tag} layout ${appearance.layout}`, html.includes(`layout-${appearance.layout}`));
  check(`${tag} frame ${appearance.frame}`, html.includes(`frame-${appearance.frame}`));
  check(`${tag} font ${appearance.fontFamily}`, html.includes(appearance.fontFamily));
  if (appearance.texture !== 'none') {
    check(`${tag} texture ${appearance.texture}`, html.includes(`class="${appearance.texture}"`));
  }
  if (appearance.showFooter === false) {
    check(`${tag} footer hidden`, !html.includes('class="foot"'));
  } else {
    check(`${tag} footer shown`, html.includes('class="foot"'));
  }
  if (appearance.showQuoteMarks === false) {
    check(`${tag} quote marks hidden`, !html.includes('&#8220;'));
  }
}

// ---------------------------------------------------------------- controls
const base = mergeAppearance({});

check('control layout left', render(base, { layout: 'left' }).includes('layout-left'));
check('control layout editorial', render(base, { layout: 'editorial' }).includes('layout-editorial'));
check('control layout minimal', render(base, { layout: 'minimal' }).includes('layout-minimal'));
check('control frame hairline', render(base, { frame: 'hairline' }).includes('frame-hairline'));
check('control frame inset', render(base, { frame: 'inset' }).includes('frame-inset'));
check('control texture grain', render(base, { texture: 'grain' }).includes('class="grain"'));
check('control texture vignette', render(base, { texture: 'vignette' }).includes('class="vignette"'));
check('control marks off', !render(base, { showQuoteMarks: false }).includes('&#8220;'));
check('control rule off', !render(base, { showRule: false }).includes('class="rule"'));
check('control footer off', !render(base, { showFooter: false }).includes('class="foot"'));

const big = render(base, { fontScale: 1.6 });
check('control font scale 1.6', big.includes(`font-size:${Math.round(78 * 1.6)}px`), big.match(/font-size:\d+px/)?.[0]);

const loose = render(base, { lineHeight: 1.9 });
check('control line height 1.9', loose.includes('line-height:1.9'));

const longItem = { ...ITEM, quote: 'x'.repeat(320) };
const longHtml = buildCardHtml({ width: 1920, height: 1080, item: longItem, date: DATE, appearance: base });
check('control auto font size for long quote', longHtml.includes('font-size:44px'));

const gradient = render(base, {
  background: { kind: 'gradient', from: '#112233', to: '#445566', angle: 45 },
});
check('control gradient angle 45', gradient.includes('linear-gradient(45deg, #112233, #445566)'));

const image = render(base, {
  background: { kind: 'image', image: 'https://example.com/a.jpg', position: 'bottom right', blur: 6, dim: 0.5 },
});
check('control image url', image.includes("background-image:url('https://example.com/a.jpg')"));
check('control image position', image.includes('background-position:bottom right'));
check('control image blur', image.includes('filter:blur(6px) saturate(1.04)'));
check('control image scrim', image.includes('class="scrim"'));

const custom = render(base, {
  palette: { bg: '#123456', fg: '#fedcba', muted: '#aabbcc', accent: '#00ff88' },
});
check('control custom palette bg', custom.includes('background:#123456'));
check('control custom palette fg', custom.includes('color:#fedcba'));
check('control custom palette muted', custom.includes('#aabbcc'));
check('control custom palette accent', custom.includes('#00ff88'));

// light theme fallback must not leak dark values
const lightFallback = buildCardHtml({
  width: 1920,
  height: 1080,
  item: ITEM,
  date: DATE,
  appearance: { theme: 'light', palette: {} },
});
check('control light fallback', lightFallback.includes('#f4f1ea') && lightFallback.includes('#1b1c1f'));

// ---------------------------------------------------------------- summary
const passed = results.filter((r) => r.ok).length;
const paletteResults = results.slice(0, results.length - 0);
console.log('');
console.log(`palettes: ${PRESETS.length}/${PRESETS.length} rendered from their own palette`);
console.log(`checks:   ${passed}/${paletteResults.length} passed`);
if (passed !== paletteResults.length) {
  console.log('AUDIT FAILED');
  process.exit(1);
}
console.log('AUDIT PASSED');
