# First-time setup: SYSOP blog publisher

You only do this once.

## 1. Put the website on GitHub Pages

Repository: `forumdevfromhell/forumdevfromhell.github.io`

Push the contents of this folder to the repository root. In GitHub: **Settings -> Pages -> Deploy from a branch -> main -> / (root)**.

## 2. Install Node.js locally

On Debian/Ubuntu:

```bash
sudo apt update
sudo apt install -y nodejs npm
```

Check:

```bash
node --version
npm --version
```

## 3. Create a GitHub fine-grained token

On GitHub create a fine-grained personal access token restricted to only:

`forumdevfromhell/forumdevfromhell.github.io`

Repository permission needed: **Contents: Read and write**.

You will paste this into Cloudflare as a secret. Never put it in a file in the repository.

## 4. Deploy the Cloudflare Worker

Create a free Cloudflare account if needed, then locally:

```bash
cd worker
npm install
npx wrangler login
```

Your browser opens. Authorize Wrangler.

## 5. Generate the password verifier

Still inside `worker/`:

```bash
node make-password-hash.mjs
```

Type your admin password when prompted. The script prints two `wrangler secret put` commands. Run both of them.

This creates a random salt and a PBKDF2-SHA256 verifier using 600,000 iterations. The password itself is not written to disk or committed.

## 6. Add the GitHub token secret

```bash
npx wrangler secret put GITHUB_TOKEN
```

Paste the fine-grained GitHub token when Wrangler asks for it.

## 7. Deploy

```bash
npx wrangler deploy
```

Wrangler prints a URL similar to:

```text
https://forumdevfromhell-publisher.YOUR-SUBDOMAIN.workers.dev
```

Test it:

```bash
curl https://forumdevfromhell-publisher.YOUR-SUBDOMAIN.workers.dev/health
```

Expected:

```json
{"ok":true,"service":"forumdevfromhell-publisher"}
```

## 8. Tell the static site where the Worker lives

Edit `admin-config.js` in the website root:

```js
window.FDH_ADMIN_ENDPOINT = "https://forumdevfromhell-publisher.YOUR-SUBDOMAIN.workers.dev";
```

Commit and push that change to GitHub.

## 9. Publish a blog post

Open:

```text
https://forumdevfromhell.github.io/admin.html
```

Fill in title, summary, tags and body, enter the admin password, then hit **(P) PUBLISH**.

The Worker commits the post to `blog-data.js`. GitHub Pages normally updates shortly afterward. The two newest posts appear on the homepage automatically and every post remains in `blog.html`.

## Updating the password later

Run:

```bash
cd worker
node make-password-hash.mjs
```

Enter the new password and run the two new secret commands it prints. No website code changes are required.

## Local preview

The normal site can still be previewed without the Worker:

```bash
python3 -m http.server 8000
```

Then open `http://127.0.0.1:8000/`. Publishing from the local admin page is intentionally blocked by the Worker's production Origin restriction.

## Security notes

- The password is never stored in the static site.
- The GitHub token is never sent to the browser.
- Cloudflare stores the verifier and GitHub token as Worker secrets.
- The Worker only accepts publish requests whose browser Origin exactly matches the GitHub Pages site.
- GitHub Pages remains fully static. If the Worker is offline, the site and blog still work; only publishing is unavailable.
- `admin.html` is public, because static Pages cannot hide a file. Security is enforced by the Worker, not by hiding the console URL.
