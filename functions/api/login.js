// POST /api/login {password} -> {token}. Password and GitHub token live in Cloudflare secrets, never in the site.
const enc = new TextEncoder();

async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD || !env.GITHUB_TOKEN) return json({ error: 'not_configured' }, 503);
  let password = '';
  try { password = String((await request.json()).password || ''); } catch (_) {}
  // compare HMACs, not the strings, so timing reveals nothing
  const ok = (await hmac('cmp', password)) === (await hmac('cmp', env.ADMIN_PASSWORD));
  if (!ok) {
    await new Promise(r => setTimeout(r, 1000)); // slows down guessing
    return json({ error: 'wrong_password' }, 401);
  }
  const exp = Date.now() + 30 * 24 * 3600 * 1000;
  const token = exp + '.' + (await hmac(env.ADMIN_PASSWORD + env.GITHUB_TOKEN, 'admin.' + exp));
  return json({ token });
}
