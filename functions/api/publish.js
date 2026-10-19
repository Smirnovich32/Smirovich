// POST /api/publish  Authorization: Bearer <token from /api/login>
// body {data, base, images:[{path, b64}]} (images may include portfolio.pdf) -> one commit to main; Cloudflare Pages then redeploys the site.
const enc = new TextEncoder();
const REPO = 'Smirnovich32/Smirovich';
const BRANCH = 'main';
const DATA_RE = /(<script type="application\/json" id="site-data">)([\s\S]*?)(<\/script>)/;

async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function validToken(token, env) {
  const [exp, sig] = String(token || '').split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return sig === (await hmac(env.ADMIN_PASSWORD + env.GITHUB_TOKEN, 'admin.' + exp));
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD || !env.GITHUB_TOKEN) return json({ error: 'not_configured' }, 503);
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/, '');
  if (!(await validToken(token, env))) return json({ error: 'unauthorized' }, 401);

  let body;
  try { body = await request.json(); } catch (_) { return json({ error: 'bad_request' }, 400); }
  const { data, base, images = [] } = body || {};
  if (!data || !Array.isArray(data.works) || !Array.isArray(data.top) || !Array.isArray(data.sales)) return json({ error: 'bad_request' }, 400);
  // only new photos and the portfolio PDF may be written besides index.html
  for (const im of images) if (!/^(images\/[a-z0-9-]+\.jpg|portfolio\.pdf)$/i.test(im.path || '') || typeof im.b64 !== 'string') return json({ error: 'bad_request' }, 400);

  const gh = async (path, opt = {}) => {
    const r = await fetch('https://api.github.com/repos/' + REPO + path, {
      ...opt,
      headers: {
        Authorization: 'Bearer ' + env.GITHUB_TOKEN,
        Accept: opt.raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'smirnovich-admin',
        ...(opt.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    if (!r.ok) throw Object.assign(new Error('github ' + r.status + ' ' + path), { status: r.status });
    return opt.raw ? r.text() : r.json();
  };

  try {
    const head = (await gh('/git/ref/heads/' + BRANCH)).object.sha;
    const commit = await gh('/git/commits/' + head);
    const html = await gh('/contents/index.html?ref=' + head, { raw: true });
    const m = html.match(DATA_RE);
    if (!m) return json({ error: 'no_data_block' }, 500);
    if (base && JSON.stringify(JSON.parse(m[2])) !== JSON.stringify(base)) return json({ error: 'stale' }, 409);

    const tree = [];
    for (const im of images) {
      const blob = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: im.b64, encoding: 'base64' }) });
      tree.push({ path: im.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const page = html.replace(DATA_RE, (_, a, __, c) => a + JSON.stringify(data).replace(/</g, '\\u003c') + c);
    tree.push({ path: 'index.html', mode: '100644', type: 'blob', content: page });
    const t = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: commit.tree.sha, tree }) });
    const c = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message: 'Оновлення сайту з адмінки', tree: t.sha, parents: [head] }) });
    await gh('/git/refs/heads/' + BRANCH, { method: 'PATCH', body: JSON.stringify({ sha: c.sha }) });
    return json({ ok: true, commit: c.sha });
  } catch (e) {
    return json({ error: e.status === 401 || e.status === 403 || e.status === 404 ? 'github_token' : e.status === 422 ? 'conflict' : 'github_error' }, 502);
  }
}
