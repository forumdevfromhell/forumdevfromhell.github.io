(() => {
  const GH_USER = 'forumdevfromhell';
  const API = `https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=updated`;
  const grid = document.querySelector('#projectsGrid');
  const status = document.querySelector('#repoStatus');
  const repoCount = document.querySelector('#repoCount');
  const cmdForm = document.querySelector('#commandForm');
  const cmdInput = document.querySelector('#commandInput');
  const cmdOutput = document.querySelector('#commandOutput');
  const started = Date.now();
  let repos = [];

  const special = [
    [/folderum.?3/i, 'PROOF NOBODY REQUESTED'],
    [/ftforum/i, 'BELOVED PROBLEM CHILD'],
    [/tscum|typeforum/i, 'SPITE DRIVEN DEVELOPMENT'],
    [/errorum/i, 'COMPILATION FAILURE AS INFRASTRUCTURE']
  ];

  function esc(s='') {
    return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function card(repo) {
    const tag = special.find(([rx]) => rx.test(repo.name));
    const featured = Boolean(tag);
    const desc = repo.description || 'No description. The evidence speaks for itself.';
    return `<a class="project-card${featured ? ' featured' : ''}" href="${esc(repo.html_url)}" target="_blank" rel="noreferrer">
      <div class="code">[${esc(tag ? tag[1] : 'PUBLIC REPOSITORY')}]</div>
      <h3>${esc(repo.name)}</h3>
      <p>${esc(desc)}</p>
      <div class="meta">
        <span>${esc(repo.language || 'UNKNOWN')}</span>
        <span>★ ${repo.stargazers_count}</span>
        <span>UPDATED ${new Date(repo.updated_at).toISOString().slice(0,10)}</span>
      </div>
    </a>`;
  }

  async function loadRepos() {
    try {
      const cache = JSON.parse(localStorage.getItem('fdh-repos') || 'null');
      if (cache && Date.now() - cache.time < 15 * 60 * 1000 && Array.isArray(cache.data)) {
        repos = cache.data;
      } else {
        const r = await fetch(API, { headers: { Accept: 'application/vnd.github+json' } });
        if (!r.ok) throw new Error(`GitHub replied ${r.status}`);
        repos = await r.json();
        localStorage.setItem('fdh-repos', JSON.stringify({ time: Date.now(), data: repos }));
      }
      repos = repos.filter(r => !r.fork && r.name.toLowerCase() !== `${GH_USER}.github.io`);
      repos.sort((a,b) => {
        const af = special.some(([rx]) => rx.test(a.name));
        const bf = special.some(([rx]) => rx.test(b.name));
        return Number(bf) - Number(af) || new Date(b.updated_at) - new Date(a.updated_at);
      });
      repoCount.textContent = repos.length;
      grid.innerHTML = repos.map(card).join('');
      status.textContent = `${repos.length} public atrocities loaded. New public repos appear automatically.`;
    } catch (err) {
      repoCount.textContent = '???';
      status.innerHTML = `GitHub feed unavailable: ${esc(err.message)}. <a href="https://github.com/${GH_USER}" target="_blank" rel="noreferrer">Open GitHub directly.</a>`;
      grid.innerHTML = '';
    }
  }

  const commands = {
    HELP: () => 'ABOUT  PROJECTS  QUOTES  RANDOM  GITHUB  TOP  CLEAR',
    ABOUT: () => (location.hash = '#about', 'Opening manifesto...'),
    PROJECTS: () => (location.hash = '#projects', `${repos.length || '???'} atrocities currently indexed.`),
    QUOTES: () => (location.hash = '#quotes', 'Loading questionable wisdom...'),
    GITHUB: () => (window.open(`https://github.com/${GH_USER}`, '_blank', 'noopener'), 'Opening GitHub...'),
    TOP: () => (location.hash = '#top', 'Returning to main menu...'),
    CLEAR: () => '',
    RANDOM: () => {
      if (!repos.length) return 'No atrocities loaded yet.';
      const repo = repos[Math.floor(Math.random() * repos.length)];
      window.open(repo.html_url, '_blank', 'noopener');
      return `Opening ${repo.name}...`;
    }
  };

  function runCommand(raw) {
    const cmd = raw.trim().toUpperCase();
    if (!cmd) return;
    cmdOutput.textContent = commands[cmd] ? commands[cmd]() : `Bad command or file name: ${cmd}\nType HELP.`;
  }

  cmdForm.addEventListener('submit', e => {
    e.preventDefault();
    runCommand(cmdInput.value);
    cmdInput.value = '';
  });

  document.querySelectorAll('[data-command]').forEach(el => el.addEventListener('click', () => runCommand(el.dataset.command)));

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      cmdInput.focus();
      runCommand('HELP');
    }
  });

  setInterval(() => {
    const s = Math.floor((Date.now() - started) / 1000);
    const h = String(Math.floor(s / 3600)).padStart(2,'0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2,'0');
    const sec = String(s % 60).padStart(2,'0');
    document.querySelector('#clock').textContent = `Connected: ${h}:${m}:${sec}`;
  }, 1000);

  loadRepos();
})();
