(() => {
  const endpoint = String(window.FDH_ADMIN_ENDPOINT || '').replace(/\/$/, '');
  const form = document.querySelector('#postForm');
  const status = document.querySelector('#postStatus');
  const publish = document.querySelector('#publish');
  const date = document.querySelector('#date');
  date.value = new Date().toISOString().slice(0, 10);

  function say(lines) {
    status.textContent = Array.isArray(lines) ? lines.join('\n') : String(lines);
  }

  document.querySelector('#clearForm').addEventListener('click', () => {
    form.reset();
    date.value = new Date().toISOString().slice(0, 10);
    say('FORM CLEARED.\nNO EVIDENCE REMAINS IN THIS TERMINAL.');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!endpoint || endpoint.includes('YOUR-WORKER')) {
      say('CONFIG ERROR.\nSet FDH_ADMIN_ENDPOINT in admin-config.js first.');
      return;
    }

    const bodyText = document.querySelector('#body').value.trim();
    const payload = {
      title: document.querySelector('#title').value.trim(),
      summary: document.querySelector('#summary').value.trim(),
      date: date.value,
      readTime: document.querySelector('#readTime').value.trim() || '3 MIN READ',
      tags: document.querySelector('#tags').value.split(',').map(v => v.trim()).filter(Boolean),
      body: bodyText.split(/\n\s*\n/).map(v => v.trim()).filter(Boolean),
      password: document.querySelector('#password').value
    };

    publish.disabled = true;
    say([
      'AUTHENTICATING........',
      'VALIDATING POST.......',
      'CONTACTING GITHUB.....'
    ]);

    try {
      const response = await fetch(`${endpoint}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);

      document.querySelector('#password').value = '';
      say([
        'AUTHENTICATING........ OK',
        'VALIDATING POST....... OK',
        'COMMITTING TO GITHUB.. OK',
        '',
        'TRANSMISSION ACCEPTED.',
        `POST ID: ${result.id}`,
        result.commit ? `COMMIT: ${result.commit.slice(0, 12)}` : '',
        '',
        'GitHub Pages will publish after the repository updates.'
      ].filter(Boolean));
    } catch (error) {
      document.querySelector('#password').value = '';
      say(`TRANSMISSION REJECTED.\n${error.message}`);
    } finally {
      publish.disabled = false;
    }
  });
})();
