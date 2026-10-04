// Spike integration: wraps the prerenderer to expand internal static paths into
// localized external paths, and rewrites the request back to the internal route.
const LOCALES = ['en', 'fr'];

const PATHS = {
  '/': '/',
  '/about': {fr: '/a-propos'},
  '/blog/[slug]': {fr: '/articles/[slug]'}
};

const SEG = /\[(\.\.\.)?([^\]]+)\]/g;

function templateFor(internal, locale) {
  const per = PATHS[internal];
  if (per == null) return null;
  const external = typeof per === 'string' ? per : per[locale] ?? internal;
  const internals = [...internal.matchAll(SEG)].map((m) => m[0]);
  const externals = [...external.matchAll(SEG)].map((m) => m[0]);
  let out = external;
  externals.forEach((ext, i) => {
    const int = internals[i];
    if (int && int !== ext) out = out.replace(ext, int);
  });
  return out;
}

/** internal concrete path -> external concrete path for a locale */
function localize(pathname, locale) {
  const parts = pathname.split('/').filter(Boolean);
  let best = null;
  let bestLen = -1;
  for (const internal of Object.keys(PATHS)) {
    const ip = internal.split('/').filter(Boolean);
    let shapeOk = true;
    ip.forEach((seg, i) => {
      const m = /^\[(\.\.\.)?[^\]]+\]$/.exec(seg);
      if (m) {
        if (seg.startsWith('[...') && i !== parts.length - 1) shapeOk = false;
      } else if (seg !== parts[i]) shapeOk = false;
    });
    if (shapeOk && ip.length > bestLen) {
      best = internal;
      bestLen = ip.length;
    }
  }
  if (best === null) return null;
  const external = templateFor(best, locale);
  const ip = best.split('/').filter(Boolean);
  const ep = external.split('/').filter(Boolean);
  const concrete = [];
  ip.forEach((seg, i) => {
    const m = /^(\[(\.\.\.)?[^\]]+\])$/.exec(seg);
    if (!m) concrete.push(ep[i]);
    else concrete.push(m[2] ? parts.slice(i).join('/') : parts[i]);
  });
  return '/' + concrete.join('/');
}

function toInternal(pathname, base = '') {
  if (base && base !== '/' && pathname.startsWith(base)) {
    pathname = '/' + pathname.slice(base.length).replace(/^\/+/, '');
  }
  if (pathname.endsWith('.html')) pathname = pathname.slice(0, -5) || '/';
  const m = /^\/(en|fr)(\/.*)?$/.exec(pathname);
  if (!m) return {locale: null, internal: pathname};
  const locale = m[1];
  const rest = m[2] || '/';
  let internal = rest;
  internal = internal.replace(/^\/a-propos(?=\/|$)/, '/about');
  internal = internal.replace(/^\/articles(?=\/|$)/, '/blog');
  return {locale, internal};
}

function log(tag, data) {
  if (process.env.SPIKE_LOG) console.error('[spike]', tag, JSON.stringify(data));
}

let BASE = process.env.SPIKE_BASE || '';

export default function intl() {
  return {
    name: 'spike-intl',
    hooks: {
      'astro:config:setup'({config}) {
        BASE = config.base && config.base !== '/' ? config.base : '';
      },
      'astro:build:start'({setPrerenderer}) {
        setPrerenderer((def) => ({
          name: 'spike-intl-prerenderer',
          async setup() {
            return def.setup?.();
          },
          async getStaticPaths() {
            const base = await def.getStaticPaths();
            const out = [];
            for (const entry of base) {
              for (const locale of LOCALES) {
                const ext = localize(entry.pathname, locale);
                if (ext == null) continue;
                out.push({pathname: locale === 'en' ? ext : `/${locale}${ext}`, route: entry.route});
              }
            }
            log('staticPaths', out.map((o) => o.pathname));
            return out;
          },
          async render(request, opts) {
            const url = new URL(request.url);
            const {locale, internal} = toInternal(url.pathname, BASE);
            log('render', [url.pathname, internal, locale]);
            const headers = new Headers({'x-astro-intl-locale': locale || 'none'});
            return def.render(
              new Request(new URL(internal, url), {method: request.method, headers}),
              opts
            );
          },
          async teardown() {
            return def.teardown?.();
          }
        }));
      }
    }
  };
}