# Blog publisher Worker

This Worker is the server-side half of the SYSOP post console. It authenticates the supplied password using PBKDF2-SHA256, then commits a new object into `blog-data.js` through GitHub's Contents API.

Secrets required:

- `ADMIN_PASSWORD_SALT`
- `ADMIN_PASSWORD_HASH`
- `GITHUB_TOKEN`

The GitHub token should be a fine-grained token limited to `forumdevfromhell/forumdevfromhell.github.io` with **Contents: Read and write**. Do not put the token in this repository.
