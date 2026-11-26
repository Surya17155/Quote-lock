const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB = /^(?:rgb|rgba|hsl|hsla)\([0-9.,%\s/+-]+\)$/i;

function color(value, fallback) {
  const v = String(value || '').trim();
  if (HEX.test(v) || RGB.test(v)) return v;
  return fallback;
}

function clamp(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function hexToRgba(hex, alpha) {
  const v = color(hex, '#000000');
  const a = clamp(alpha, 0, 1, 0);
  if (!HEX.test(v)) return v;
  let h = v.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

function cssUrl(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  if (!/^(data:image\/|file:|ql:|https?:)/i.test(v)) return '';
  return v.replace(/['"\\\n\r]/g, '');
}

function fontStack(family) {
  const safe = String(family || 'Segoe Script').replace(/[^a-zA-Z0-9 -]/g, '').trim();
  return `'${safe || 'Segoe Script'}', 'Segoe Script', 'Ink Free', cursive`;
}

const DEFAULT_PALETTE = {
  dark: { bg: '#0f1115', fg: '#f6f2e9', muted: '#a9a396', accent: '#c8a656' },
  light: { bg: '#f4f1ea', fg: '#1b1c1f', muted: '#6b655b', accent: '#8a6a1f' },
};

export const DEFAULT_APPEARANCE = {
  theme: 'dark',
  preset: 'nocturne',
  palette: DEFAULT_PALETTE.dark,
  background: {
    kind: 'solid',
    color: '#0f1115',
    from: '#0f1115',
    to: '#1a2030',
    angle: 135,
    image: '',
    blur: 0,
    dim: 0.35,
    position: 'center',
  },
  layout: 'center',
  frame: 'none',
  texture: 'none',
  showQuoteMarks: true,
  showRule: true,
  showFooter: true,
  fontFamily: 'Segoe Script',
  fontScale: 1,
  lineHeight: 1.42,
};

function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object') return base;
  const out = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && base[key]) {
      out[key] = deepMerge(base[key], value);
    } else if (value !== undefined && value !== null) {
      out[key] = value;
    }
  }
  return out;
}

function formatDate(date) {
  if (!date) return '';
  const parsed = new Date(`${String(date).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(date).toUpperCase();
  return parsed
    .toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    .toUpperCase();
}

export function buildCardHtml(input = {}) {
  const width = Math.round(clamp(input.width, 320, 7680, 1920));
  const height = Math.round(clamp(input.height, 320, 4320, 1080));
  const appearance = deepMerge(DEFAULT_APPEARANCE, input.appearance || {});
  const theme = appearance.theme === 'light' ? 'light' : 'dark';
  const fallback = DEFAULT_PALETTE[theme];
  const paletteInput = input.appearance?.palette || {};
  const palette = {
    bg: color(paletteInput.bg, fallback.bg),
    fg: color(paletteInput.fg, fallback.fg),
    muted: color(paletteInput.muted, fallback.muted),
    accent: color(paletteInput.accent, fallback.accent),
  };
  const bg = appearance.background || DEFAULT_APPEARANCE.background;
  const kind = ['solid', 'gradient', 'image'].includes(bg.kind) ? bg.kind : 'solid';
  const angle = Math.round(clamp(bg.angle, -360, 360, 135));
  const blur = clamp(bg.blur, 0, 40, 0);
  const dim = clamp(bg.dim, 0, 0.92, 0.35);
  const position = ['center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right'].includes(bg.position)
    ? bg.position
    : 'center';
  const imageUrl = cssUrl(bg.image);

  const quote = String(input.item?.quote ?? '');
  const author = String(input.item?.author ?? '');
  const category = String(input.item?.category ?? '');
  const dateText = String(input.dateText || formatDate(input.date || '')).toUpperCase();

  const len = [...quote].length;
  let fontSize = len > 300 ? 44 : len > 220 ? 52 : len > 150 ? 60 : len > 90 ? 68 : 78;
  const scale = clamp(appearance.fontScale, 0.6, 1.8, 1);
  fontSize = Math.round(fontSize * scale);
  const lineHeight = clamp(appearance.lineHeight, 1.05, 2.1, 1.42);
  const layout = ['center', 'left', 'editorial', 'minimal'].includes(appearance.layout)
    ? appearance.layout
    : 'center';
  const frame = ['none', 'hairline', 'inset'].includes(appearance.frame) ? appearance.frame : 'none';
  const texture = ['none', 'grain', 'vignette'].includes(appearance.texture) ? appearance.texture : 'none';
  const showMarks = appearance.showQuoteMarks !== false && layout !== 'minimal';
  const showRule = appearance.showRule !== false && layout !== 'minimal';
  const showFooter = appearance.showFooter !== false;

  const gradient =
    kind === 'gradient'
      ? `radial-gradient(1200px 780px at 12% 8%, ${hexToRgba(palette.accent, 0.2)}, transparent 62%),
         radial-gradient(1100px 760px at 88% 94%, ${hexToRgba(bg.from, 0.75)}, transparent 66%),
         linear-gradient(${angle}deg, ${color(bg.from, palette.bg)}, ${color(bg.to, palette.bg)})`
      : palette.bg;

  const layers = [];
  if (kind === 'image' && imageUrl) {
    layers.push(
      `<div class="bg image" style="background-image:url('${imageUrl}');background-position:${position};filter:blur(${blur}px) saturate(1.04)"></div>`,
      `<div class="scrim" style="background:linear-gradient(180deg, ${hexToRgba(palette.bg, dim * 0.72)} 0%, ${hexToRgba(palette.bg, dim)} 58%, ${hexToRgba(palette.bg, Math.min(1, dim + 0.22))} 100%)"></div>`,
    );
  } else if (kind === 'gradient') {
    layers.push(`<div class="bg" style="background:${gradient}"></div>`);
  } else {
    layers.push(
      `<div class="bg" style="background:${palette.bg}"></div>`,
    );
  }
  if (texture === 'grain') layers.push('<div class="grain"></div>');
  if (texture === 'vignette') layers.push('<div class="vignette"></div>');

  const authorLine = author
    ? `<div class="author">${showMarks && layout === 'center' ? '&#8212; ' : ''}${esc(author)}</div>`
    : '';
  const rule = showRule ? '<div class="rule"></div>' : '';
  const quoteMark =
    layout === 'editorial'
      ? `<div class="big-mark" aria-hidden="true">&#8220;</div>`
      : '';
  const open = showMarks ? '&#8220;' : '';
  const close = showMarks ? '&#8221;' : '';
  const foot =
    showFooter && (category || dateText)
      ? `<div class="foot">${category ? `<span>${esc(category.toUpperCase())}</span>` : '<span></span>'}${
          dateText ? `<span>${esc(dateText)}</span>` : '<span></span>'
        }</div>`
      : '';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=${width}, initial-scale=1">
<style>
*{box-sizing:border-box}
html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden}
body{background:${palette.bg};color:${palette.fg};font-family:'Segoe UI','Segoe UI Variable Text',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.stage{position:relative;width:100%;height:100%;overflow:hidden;background:${palette.bg}}
.bg{position:absolute;inset:-40px;background-size:cover;background-repeat:no-repeat}
.bg.image{transform:scale(1.06)}
.scrim{position:absolute;inset:0}
.grain{position:absolute;inset:0;opacity:.07;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E")}
.vignette{position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 42%, transparent 42%, ${hexToRgba('#000000', theme === 'dark' ? 0.5 : 0.22)} 100%)}
.frame-hairline .stage::after,.frame-inset .stage::after{content:'';position:absolute;z-index:3;pointer-events:none}
.frame-hairline .stage::after{inset:34px;border:1px solid ${hexToRgba(palette.fg, 0.2)}}
.frame-inset .stage::after{inset:26px;border:1px solid ${hexToRgba(palette.accent, 0.42)};box-shadow:inset 0 0 0 1px ${hexToRgba(palette.fg, 0.08)}}
.card{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;justify-content:center;padding:110px 150px 200px}
.q{font-family:${fontStack(appearance.fontFamily)};font-size:${fontSize}px;line-height:${lineHeight};text-wrap:pretty;max-width:100%}
.q.short{text-wrap:balance}
.author{margin-top:48px;font-family:'Segoe UI','Segoe UI Variable Text',system-ui,sans-serif;font-size:27px;letter-spacing:3px;text-transform:uppercase;color:${palette.muted}}
.rule{margin-top:20px;width:92px;height:2px;background:${palette.accent};opacity:.8}
.foot{position:absolute;z-index:2;left:150px;right:150px;bottom:88px;display:flex;justify-content:space-between;gap:24px;font-family:'Segoe UI','Segoe UI Variable Text',system-ui,sans-serif;font-size:19px;letter-spacing:3px;color:${palette.muted};text-transform:uppercase}
.layout-left .card{align-items:flex-start}
.layout-left .q{max-width:82%}
.layout-minimal .card{padding-bottom:110px}
.layout-minimal .author{margin-top:34px;font-size:24px;letter-spacing:2px}
.layout-editorial .card{padding:190px 150px 200px;justify-content:center}
.layout-editorial .q{max-width:84%}
.layout-editorial .author{margin-top:40px}
.big-mark{position:absolute;z-index:1;top:26px;left:104px;font-family:Georgia,'Times New Roman',serif;font-size:300px;line-height:1;color:${palette.accent};opacity:.16;pointer-events:none}
.layout-editorial .foot{left:150px;right:150px}
</style></head>
<body><div class="stage layout-${layout} frame-${frame}">
${layers.join('\n')}
${quoteMark}
<div class="card">
<div class="q${len <= 110 ? ' short' : ''}">${open}${esc(quote)}${close}</div>
${authorLine}
${rule}
</div>
${foot}
</div></body></html>`;
}
