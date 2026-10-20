// Server-rendered SEO pages for each painting and collection, built from the same data the admin edits
// (the JSON block inside index.html), so they never go out of date.
const DATA_RE = /<script type="application\/json" id="site-data">([\s\S]*?)<\/script>/;
export const SITE_NAME = 'Smirnovich';

export async function loadSite(env, request) {
  const res = await env.ASSETS.fetch(new URL('/', request.url));
  const m = (await res.text()).match(DATA_RE);
  return m ? JSON.parse(m[1]) : null;
}

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '$' + Number(n).toLocaleString('uk-UA').replace(/\u00a0/g, ' ');
const abs = (origin, p) => /^https?:/.test(p) ? p : origin + '/' + String(p || '').replace(/^\//, '');
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };
const isSale = (data, w) => (data.sales || []).includes(w.id) && w.sale > 0 && w.sale < w.p && w.st !== 's';
const current = (data, w) => isSale(data, w) ? w.sale : w.p;
const seriesOf = (data, id) => (data.series || []).find(s => s.id === id);

export function personLd(data, origin) {
  const c = data.contacts || {};
  const ig = String(c.instagram || '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '');
  return { '@type': 'Person', '@id': origin + '/#artist', name: SITE_NAME, jobTitle: 'Художник', url: origin + '/', image: origin + '/images/author.jpg',
    nationality: 'Україна', sameAs: ig ? ['https://www.instagram.com/' + ig + '/'] : [] };
}

function shell({ origin, path, title, description, image, ld, body }) {
  return `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(origin + path)}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:locale" content="uk_UA">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(origin + path)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#d6d5d2">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,400;0,500;0,600;1,400&family=Manrope:wght@400;500;600&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': ld }).replace(/</g, '\\u003c')}</script>
<style>
:root{--bg:#d6d5d2;--card:#fff;--ink:#151515;--ink-2:#5c5c5a;--ink-3:#8f8e8a;--line:#e6e5e1;--soft:#f4f3f0;--sale:#a8473a;--serif:"Cormorant",Georgia,serif;--sans:"Manrope",system-ui,sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font:400 16px/1.7 var(--sans);padding:16px}
a{color:inherit}
.wrap{max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:16px}
.card{background:var(--card);border-radius:22px;padding:clamp(20px,3vw,40px)}
.top{display:flex;justify-content:space-between;align-items:center;gap:12px;border-radius:999px;padding:14px 22px}
.logo{font:600 15px/1 var(--sans);letter-spacing:.32em;text-decoration:none}
.btn{display:inline-flex;align-items:center;gap:10px;padding:14px 24px;border-radius:999px;border:1px solid var(--ink);font:500 11px/1 var(--sans);letter-spacing:.2em;text-transform:uppercase;text-decoration:none}
.btn.dark{background:var(--ink);color:#fff}
nav.crumbs{font-size:13px;color:var(--ink-3)}
nav.crumbs a{color:var(--ink-2)}
.work{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:16px}
.stage{background:var(--soft);border-radius:16px;display:flex;align-items:center;justify-content:center;padding:clamp(16px,4vw,56px);min-height:320px}
.stage img{max-width:100%;max-height:78vh;height:auto;box-shadow:0 30px 60px -24px rgba(0,0,0,.5)}
h1{font:400 clamp(36px,4.4vw,64px)/1 var(--serif);margin:10px 0 18px}
h2{font:400 clamp(28px,3vw,42px)/1.05 var(--serif);margin-bottom:16px}
.eyebrow{font:500 11px/1 var(--sans);letter-spacing:.24em;text-transform:uppercase;color:var(--ink-3)}
.desc{font:400 20px/1.55 var(--serif);color:var(--ink-2);margin-bottom:20px}
dl{border-top:1px solid var(--line);margin-bottom:22px}
dl div{display:flex;justify-content:space-between;gap:16px;padding:11px 0;border-bottom:1px solid var(--line);font-size:14px}
dt{color:var(--ink-3);font-size:11px;letter-spacing:.12em;text-transform:uppercase}
.price{display:inline-flex;align-items:baseline;gap:10px;font:600 34px/1 var(--sans);letter-spacing:-.02em;font-variant-numeric:lining-nums tabular-nums;margin-bottom:22px}
.price s{font-size:.6em;font-weight:500;color:var(--ink-3)}.price.sale{color:var(--sale)}.price.sold{font:600 12px/1 var(--sans);letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3);padding:9px 12px;border:1px solid var(--line);border-radius:999px}
.actions{display:flex;flex-wrap:wrap;gap:10px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
.tile{display:flex;flex-direction:column;gap:8px;text-decoration:none;background:var(--card);border-radius:18px;padding:8px 8px 16px;border:1px solid var(--line)}
.tile .im{aspect-ratio:1;background:var(--soft);border-radius:12px;display:flex;align-items:center;justify-content:center;padding:14px}
.tile img{max-width:100%;max-height:100%;object-fit:contain}
.tile b{font:500 19px/1.15 var(--serif);padding:0 8px}.tile span{font-size:12px;color:var(--ink-3);padding:0 8px}
.lead{font:400 21px/1.5 var(--serif);color:var(--ink-2);max-width:760px}
footer{font-size:13px;color:var(--ink-3);display:flex;flex-wrap:wrap;gap:8px 20px;justify-content:space-between}
@media(max-width:860px){.work{grid-template-columns:1fr}.top .btn{display:none}}
</style>
</head>
<body><div class="wrap">
<header class="card top"><a class="logo" href="/">SMIRNOVICH</a><a class="btn dark" href="/#catalogue">Усі роботи</a></header>
${body}
<footer class="card"><span>© ${new Date().getFullYear()} ${SITE_NAME} — український художник-концептуаліст</span><a href="/">smirnovich.com</a></footer>
</div></body></html>`;
}

function tile(data, w) {
  const price = w.st === 's' ? 'Продано' : current(data, w) ? money(current(data, w)) : 'Ціна за запитом';
  return `<a class="tile" href="/works/${encodeURIComponent(w.id)}"><span class="im"><img src="/${esc(String(w.img).replace(/^\//, ''))}" alt="${esc(w.t + ' — ' + SITE_NAME)}" loading="lazy"></span><b>${esc(w.t)}</b><span>${esc([w.z, w.y].filter(Boolean).join(' · '))} · ${price}</span></a>`;
}

export function workPage(data, w, origin) {
  const s = seriesOf(data, w.s), path = '/works/' + encodeURIComponent(w.id), img = abs(origin, w.img);
  const price = current(data, w), sold = w.st === 's';
  const specs = [w.m, w.z, w.y].filter(Boolean).join(', ');
  const title = `«${w.t}» — ${SITE_NAME} | ${specs || 'оригінальна картина'}`;
  const description = clip(`${w.d} ${sold ? 'Робота продана, можна замовити подібну.' : price ? 'Ціна ' + money(price) + '.' : ''} Оригінал з підписом автора.`, 158);
  const dims = String(w.z || '').match(/(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)/);
  const artwork = { '@type': 'VisualArtwork', '@id': origin + path + '#artwork', name: w.t, url: origin + path, image: img, description: w.d,
    creator: { '@id': origin + '/#artist' }, artform: /пастел/i.test(w.m) ? 'Пастель' : 'Живопис', artMedium: w.m || undefined,
    dateCreated: w.y ? String(w.y) : undefined, inLanguage: 'uk',
    width: dims ? { '@type': 'Distance', name: dims[1] + ' см' } : undefined, height: dims ? { '@type': 'Distance', name: dims[2] + ' см' } : undefined,
    isPartOf: s ? { '@type': 'CreativeWorkSeries', name: s.t, url: origin + '/collections/' + s.id } : undefined };
  if (price || sold) artwork.offers = { '@type': 'Offer', url: origin + path, priceCurrency: 'USD', price: price || w.p || undefined,
    availability: sold ? 'https://schema.org/SoldOut' : w.st === 'r' ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock',
    seller: { '@id': origin + '/#artist' } };
  const crumbs = { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: SITE_NAME, item: origin + '/' }]
    .concat(s ? [{ '@type': 'ListItem', position: 2, name: s.t, item: origin + '/collections/' + s.id }] : [])
    .concat([{ '@type': 'ListItem', position: s ? 3 : 2, name: w.t, item: origin + path }]) };
  const similar = data.works.filter(x => x.id !== w.id && x.s === w.s).slice(0, 8);
  const priceHtml = sold ? '<span class="price sold">Продано</span>' : isSale(data, w) ? `<span class="price sale"><s>${money(w.p)}</s>${money(w.sale)}</span>` : price ? `<span class="price">${money(price)}</span>` : '<span class="price sold">Ціна за запитом</span>';
  const body = `<nav class="crumbs" aria-label="Навігація"><a href="/">${SITE_NAME}</a> › ${s ? `<a href="/collections/${esc(s.id)}">${esc(s.t)}</a> › ` : ''}${esc(w.t)}</nav>
<article class="work">
  <div class="card stage"><img src="${esc(img)}" alt="${esc(`${w.t} — ${SITE_NAME}, ${specs}`)}"></div>
  <div class="card">
    <div class="eyebrow">${s ? 'Колекція · ' + esc(s.t) : 'Оригінальна робота'}</div>
    <h1>${esc(w.t)}</h1>
    <p class="desc">${esc(w.d)}</p>
    <dl><div><dt>Техніка</dt><dd>${esc(w.m || '—')}</dd></div><div><dt>Розмір</dt><dd>${esc(w.z || '—')}</dd></div><div><dt>Рік</dt><dd>${esc(w.y || '—')}</dd></div><div><dt>Автор</dt><dd>${SITE_NAME}</dd></div></dl>
    ${priceHtml}
    <div class="actions"><a class="btn dark" href="/#w-${encodeURIComponent(w.id)}">${sold ? 'Замовити подібну' : 'Придбати / запитати'}</a>${s ? `<a class="btn" href="/collections/${esc(s.id)}">Уся колекція</a>` : ''}</div>
  </div>
</article>
${similar.length ? `<section class="card"><h2>Інші роботи з колекції${s ? ' «' + esc(s.t) + '»' : ''}</h2><div class="grid">${similar.map(x => tile(data, x)).join('')}</div></section>` : ''}`;
  return shell({ origin, path, title, description, image: img, ld: [personLd(data, origin), artwork, crumbs], body });
}

export function collectionPage(data, s, origin) {
  const works = data.works.filter(w => w.s === s.id), path = '/collections/' + s.id;
  const title = `${s.t} — серія робіт ${SITE_NAME} | ${works.length} картин`;
  const description = clip(s.text || `Серія робіт художника ${SITE_NAME}: ${works.map(w => w.t).join(', ')}.`, 158);
  const image = works[0] ? abs(origin, works[0].img) : origin + '/images/author.jpg';
  const ld = [personLd(data, origin), { '@type': 'CollectionPage', name: s.t, url: origin + path, description: s.text, about: { '@id': origin + '/#artist' },
    mainEntity: { '@type': 'ItemList', itemListElement: works.map((w, i) => ({ '@type': 'ListItem', position: i + 1, url: origin + '/works/' + encodeURIComponent(w.id), name: w.t })) } },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: SITE_NAME, item: origin + '/' }, { '@type': 'ListItem', position: 2, name: s.t, item: origin + path }] }];
  const others = (data.series || []).filter(x => x.id !== s.id && data.works.some(w => w.s === x.id));
  const body = `<nav class="crumbs" aria-label="Навігація"><a href="/">${SITE_NAME}</a> › ${esc(s.t)}</nav>
<section class="card"><div class="eyebrow">Колекція · ${works.length} робіт</div><h1>${esc(s.t)}</h1><p class="lead">${esc(s.text)}</p></section>
<section class="card"><div class="grid">${works.map(w => tile(data, w)).join('')}</div></section>
${others.length ? `<section class="card"><h2>Інші колекції</h2><div class="actions">${others.map(x => `<a class="btn" href="/collections/${esc(x.id)}">${esc(x.t)}</a>`).join('')}</div></section>` : ''}`;
  return shell({ origin, path, title, description, image, ld, body });
}

export function notFound(origin) {
  return shell({ origin, path: '/404', title: 'Сторінку не знайдено — ' + SITE_NAME, description: 'Такої сторінки немає.', image: origin + '/images/author.jpg', ld: [],
    body: '<section class="card"><h1>Сторінку не знайдено</h1><p class="lead">Можливо, роботу вже прибрали з каталогу.</p><p style="margin-top:20px"><a class="btn dark" href="/#catalogue">До всіх робіт</a></p></section>' });
}

export const html = (body, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
