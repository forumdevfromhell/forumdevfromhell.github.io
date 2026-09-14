(() => {
  const cfg = window.FDH_ADMIN || {};
  const secret = window.FDH_ADMIN_SECRET;
  const form = document.querySelector('#postForm');
  const status = document.querySelector('#postStatus');
  const publish = document.querySelector('#publish');
  const date = document.querySelector('#date');
  date.value = new Date().toISOString().slice(0, 10);

  const enc = new TextEncoder();
  const dec = new TextDecoder();

  function say(lines) {
    status.textContent = Array.isArray(lines) ? lines.join('\n') : String(lines);
  }

  function fromB64(value) {
    const raw = atob(value);
    return Uint8Array.from(raw, c => c.charCodeAt(0));
  }

  async function decryptToken(password) {
    if (!secret || !secret.salt || !secret.iv || !secret.ciphertext) {
      throw new Error('ADMIN NOT CONFIGURED. Run ./configure-admin.sh first.');
    }

    const baseKey = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey({
      name: 'PBKDF2',
      salt: fromB64(secret.salt),
      iterations: Number(secret.iterations || cfg.pbkdf2Iterations || 600000),
      hash: 'SHA-256'
    }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);

    try {
      const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromB64(secret.iv) },
        key,
        fromB64(secret.ciphertext)
      );
      return dec.decode(plaintext);
    } catch (_) {
      throw new Error('BAD PASSWORD. TOKEN DECRYPTION FAILED.');
    }
  }

  async function gh(token, url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || `GitHub HTTP ${response.status}`);
    }
    return data;
  }

  function parsePosts(source) {
    const match = source.match(/window\.FDH_BLOG_POSTS\s*=\s*(\[[\s\S]*\])\s*;?\s*$/);
    if (!match) throw new Error('Could not parse blog-data.js');
    return JSON.parse(match[1]);
  }

  function slugify(text) {
    return text.toLowerCase()
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 70) || `post-${Date.now()}`;
  }

  function uniqueId(posts, title, postDate) {
    const base = slugify(title);
    let id = base;
    let n = 2;
    while (posts.some(p => p.id === id)) id = `${base}-${n++}`;
    return id || `${postDate}-${Date.now()}`;
  }

  document.querySelector('#clearForm').addEventListener('click', () => {
    form.reset();
    date.value = new Date().toISOString().slice(0, 10);
    say('FORM CLEARED.\nNO EVIDENCE REMAINS IN THIS TERMINAL.');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const passwordInput = document.querySelector('#password');
    const password = passwordInput.value;
    if (!password) return;

    publish.disabled = true;
    say(['DECRYPTING KEY........', 'CONTACTING GITHUB.....', 'LOADING BLOG DATABASE.']);

    let token = '';
    try {
      token = await decryptToken(password);
      passwordInput.value = '';

      const owner = cfg.owner;
      const repo = cfg.repo;
      const branch = cfg.branch || 'main';
      const path = cfg.blogPath || 'blog-data.js';
      if (!owner || !repo) throw new Error('admin-config.js is incomplete.');

      const api = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}?ref=${encodeURIComponent(branch)}`;
      const current = await gh(token, api);
      const source = dec.decode(Uint8Array.from(atob(current.content.replace(/\n/g, '')), c => c.charCodeAt(0)));
      const posts = parsePosts(source);

      const title = document.querySelector('#title').value.trim();
      const postDate = date.value;
      const post = {
        id: uniqueId(posts, title, postDate),
        title,
        date: postDate,
        readTime: document.querySelector('#readTime').value.trim() || '3 MIN READ',
        tags: document.querySelector('#tags').value.split(',').map(v => v.trim()).filter(Boolean),
        summary: document.querySelector('#summary').value.trim(),
        body: document.querySelector('#body').value.trim().split(/\n\s*\n/).map(v => v.trim()).filter(Boolean)
      };
      posts.push(post);

      const updated = `window.FDH_BLOG_POSTS = ${JSON.stringify(posts, null, 2)};\n`;
      const bytes = enc.encode(updated);
      let binary = '';
      bytes.forEach(b => { binary += String.fromCharCode(b); });
      const content = btoa(binary);

      say(['DECRYPTING KEY........ OK', 'CONTACTING GITHUB..... OK', 'LOADING BLOG DATABASE. OK', 'COMMITTING TRANSMISSION']);

      const result = await gh(token, `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Blog: ${title}`,
          content,
          sha: current.sha,
          branch
        })
      });

      say([
        'DECRYPTING KEY........ OK',
        'CONTACTING GITHUB..... OK',
        'LOADING BLOG DATABASE. OK',
        'COMMITTING TRANSMISSION OK',
        '',
        'TRANSMISSION ACCEPTED.',
        `POST ID: ${post.id}`,
        result.commit?.sha ? `COMMIT: ${result.commit.sha.slice(0, 12)}` : '',
        '',
        'GitHub Pages will publish after the commit lands.'
      ].filter(Boolean));
      form.reset();
      date.value = new Date().toISOString().slice(0, 10);
    } catch (error) {
      passwordInput.value = '';
      say(`TRANSMISSION REJECTED.\n${error.message}`);
    } finally {
      token = '';
      publish.disabled = false;
    }
  });
})();
