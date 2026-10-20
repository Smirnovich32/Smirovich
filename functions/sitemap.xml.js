import { loadSite } from '../lib/seo.js';

// GET /sitemap.xml — every painting and collection, always in sync with the admin's data
export async function onRequestGet({ request, env }) {
  const origin = new URL(request.url).origin;
  const data = await loadSite(env, request);
  const day = new Date().toISOString().slice(0, 10);
  const url = (loc, pri, img) => `<url><loc>${loc}</loc><lastmod>${day}</lastmod><priority>${pri}</priority>${img ? `<image:image><image:loc>${img}</image:loc></image:image>` : ''}</url>`;
  const abs = p => /^https?:/.test(p) ? p : origin + '/' + String(p).replace(/^\//, '');
  const urls = [url(origin + '/', '1.0', origin + '/images/author.jpg')]
    .concat((data?.series || []).filter(s => data.works.some(w => w.s === s.id)).map(s => url(origin + '/collections/' + s.id, '0.8')))
    .concat((data?.works || []).map(w => url(origin + '/works/' + encodeURIComponent(w.id), w.st === 's' ? '0.5' : '0.7', abs(w.img).replace(/&/g, '&amp;'))));
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls.join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=600' } });
}
