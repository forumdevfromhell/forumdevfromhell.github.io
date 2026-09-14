const encoder = new TextEncoder();

function json(data, status = 200, origin = '') {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  };
  if (origin) {
    headers['access-control-allow-origin'] = origin;
    headers['vary'] = 'Origin';
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function b64ToBytes(value) {
  const raw = atob(value);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

function bytesToB64(bytes) {
  let raw = '';
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function passwordHash(password, saltB64, iterations) {
  const material = await crypto.subtle.importKey(
    'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt: b64ToBytes(saltB64),
    iterations
  }, material, 256);
  return new Uint8Array(bits);
}

function slugify(title) {
  const base = title.toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'transmission';
  return `${base}-${Date.now().toString(36)}`;
}

function validatePost(p) {
  if (!p || typeof p !== 'object') return 'Invalid payload.';
  if (!p.title || p.title.length > 140) return 'Title is required and must be <= 140 chars.';
  if (!p.summary || p.summary.length > 300) return 'Summary is required and must be <= 300 chars.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date || '')) return 'Date must be YYYY-MM-DD.';
  if (!Array.isArray(p.body) || !p.body.length) return 'Body requires at least one paragraph.';
  if (p.body.some(x => typeof x !== 'string' || x.length > 12000)) return 'Body paragraph invalid or too long.';
  if (!Array.isArray(p.tags) || p.tags.length > 10 || p.tags.some(x => typeof x !== 'string' || x.length > 40)) return 'Tags are invalid.';
  if (String(p.readTime || '').length > 30) return 'Read time too long.';
  return null;
}

function appendPost(source, post) {
  const marker = '\n];';
  const at = source.lastIndexOf(marker);
  if (at < 0) throw new Error('blog-data.js format not recognized');
  const prefix = source.slice(0, at).replace(/\s+$/, '');
  const needsComma = !prefix.endsWith('[');
  const serialized = JSON.stringify(post, null, 2)
    .split('\n')
    .map(line => '  ' + line)
    .join('\n');
  return `${prefix}${needsComma ? ',' : ''}\n${serialized}\n];\n`;
}

function decodeGithubContent(content) {
  return decodeURIComponent(escape(atob(content.replace(/\n/g, ''))));
}

function encodeGithubContent(text) {
  const bytes = encoder.encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function github(env, path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      'accept': 'application/vnd.github+json',
      'authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'x-github-api-version': '2022-11-28',
      'user-agent': 'forumdevfromhell-publisher',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `GitHub HTTP ${response.status}`);
  return data;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://forumdevfromhell.github.io';
    const corsOrigin = origin === allowedOrigin ? origin : '';

    if (request.method === 'OPTIONS') {
      if (!corsOrigin) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': corsOrigin,
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
          'access-control-max-age': '86400',
          'vary': 'Origin'
        }
      });
    }

    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ ok: true, service: 'forumdevfromhell-publisher' });
    }

    if (url.pathname !== '/publish' || request.method !== 'POST') {
      return json({ error: 'Not found.' }, 404, corsOrigin);
    }
    if (!corsOrigin) return json({ error: 'Origin rejected.' }, 403);
    if (!env.ADMIN_PASSWORD_HASH || !env.ADMIN_PASSWORD_SALT || !env.GITHUB_TOKEN) {
      return json({ error: 'Worker secrets are not configured.' }, 500, corsOrigin);
    }

    let payload;
    try { payload = await request.json(); }
    catch { return json({ error: 'Invalid JSON.' }, 400, corsOrigin); }

    const suppliedPassword = String(payload.password || '');
    delete payload.password;
    if (!suppliedPassword || suppliedPassword.length > 256) {
      return json({ error: 'Authentication failed.' }, 401, corsOrigin);
    }

    const iterations = Number(env.PBKDF2_ITERATIONS || 600000);
    const actual = await passwordHash(suppliedPassword, env.ADMIN_PASSWORD_SALT, iterations);
    const expected = b64ToBytes(env.ADMIN_PASSWORD_HASH);
    if (!timingSafeEqual(actual, expected)) {
      return json({ error: 'Authentication failed.' }, 401, corsOrigin);
    }

    const problem = validatePost(payload);
    if (problem) return json({ error: problem }, 400, corsOrigin);

    const owner = env.GITHUB_OWNER || 'forumdevfromhell';
    const repo = env.GITHUB_REPO || 'forumdevfromhell.github.io';
    const branch = env.GITHUB_BRANCH || 'main';
    const path = 'blog-data.js';
    const file = await github(env, `/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`);
    const source = decodeGithubContent(file.content);
    const id = slugify(payload.title);
    const post = {
      id,
      title: payload.title,
      date: payload.date,
      readTime: payload.readTime || '3 MIN READ',
      tags: payload.tags,
      summary: payload.summary,
      body: payload.body
    };
    const updated = appendPost(source, post);
    const commit = await github(env, `/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: `blog: publish ${id}`,
        content: encodeGithubContent(updated),
        sha: file.sha,
        branch
      })
    });

    return json({ ok: true, id, commit: commit.commit?.sha || '' }, 200, corsOrigin);
  }
};
