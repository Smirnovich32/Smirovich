import { loadSite, workPage, notFound, html } from '../../lib/seo.js';

// GET /works/:id — a real, indexable page for one painting
export async function onRequestGet({ request, env, params }) {
  const origin = new URL(request.url).origin;
  const data = await loadSite(env, request);
  const w = data && data.works.find(x => x.id === params.id);
  return w ? html(workPage(data, w, origin)) : html(notFound(origin), 404);
}
