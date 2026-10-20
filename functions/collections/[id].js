import { loadSite, collectionPage, notFound, html } from '../../lib/seo.js';

// GET /collections/:id — a real, indexable page for one series
export async function onRequestGet({ request, env, params }) {
  const origin = new URL(request.url).origin;
  const data = await loadSite(env, request);
  const s = data && (data.series || []).find(x => x.id === params.id);
  return s ? html(collectionPage(data, s, origin)) : html(notFound(origin), 404);
}
