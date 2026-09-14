# SYSOP POST CONSOLE - NO CLOUDFLARE

This version needs no Cloudflare Worker, server process, database, or API backend.

The static browser console talks directly to the GitHub Contents API.

## How authentication works

`configure-admin.sh` asks for:

- a fine-grained GitHub token restricted to `forumdevfromhell/forumdevfromhell.github.io`
- your SYSOP password

It derives an AES-256-GCM key from the password using PBKDF2-SHA256 with 600,000 iterations, encrypts the GitHub token, and writes only the salt, IV, iteration count, and ciphertext to `admin-secret.js`.

When you publish, `admin.html` asks for the password, decrypts the token in browser memory, downloads `blog-data.js` from GitHub, appends the post, and commits the new file through the GitHub API.

## Important security limitation

This is a static site. The encrypted token blob is public. Anyone may download it and attempt password guesses offline. That is unavoidable without a server-side secret store.

Use a strong unique password and a fine-grained GitHub token that can modify ONLY this repository. Do not grant account-wide access. If the token ever leaks or you suspect the password was guessed, revoke the token in GitHub immediately and generate a new one.

## GitHub token

GitHub -> Settings -> Developer settings -> Personal access tokens -> Fine-grained tokens.

Repository access: only `forumdevfromhell.github.io`.

Repository permissions: `Contents: Read and write`.

No other permission is required by the publisher.

## Configure on the existing working copy

If your site is already in `/var/www/blogging`:

```bash
cd /var/www/blogging
chmod +x configure-admin.sh
./configure-admin.sh
```

Then push the generated commit:

```bash
git push
```

Open:

`https://forumdevfromhell.github.io/admin.html`

Enter a post and the SYSOP password. The token is decrypted only for that publishing attempt and is not stored in localStorage or sessionStorage.
