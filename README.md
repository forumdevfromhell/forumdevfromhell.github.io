# forumdevfromhell.github.io

Static GitHub Pages site for Forum Dev From Hell.

## Deployment

The repository is `forumdevfromhell/forumdevfromhell.github.io`. GitHub Pages should serve `main` from `/ (root)`.

The project showcase is automatic: `app.js` fetches the account's public repositories from GitHub, excludes the website repository, and renders newly uploaded public repos automatically.

## Blog

The homepage shows the two newest entries from `blog-data.js`. `blog.html` contains the complete archive and `post.html?id=...` renders individual posts.

## SYSOP post console

`admin.html` can publish posts directly to GitHub without Cloudflare or another backend.

The GitHub token is encrypted by `configure-admin.sh` with AES-256-GCM. The encryption key is derived from the SYSOP password with PBKDF2-SHA256 (600,000 iterations). The browser decrypts the token in memory only while publishing, then uses GitHub's Contents API to update `blog-data.js`.

See `SETUP-POST-CONSOLE.md` for setup and the important static-site security limitation.

## Existing checkout setup

```bash
cd /var/www/blogging
chmod +x configure-admin.sh
./configure-admin.sh
git push
```

No Cloudflare account, Worker, Apache, nginx, PHP, database, or always-running process is required for the production site.

## Local preview

```bash
cd /var/www/blogging
python3 -m http.server 8000
```

Then open `http://127.0.0.1:8000/`.
