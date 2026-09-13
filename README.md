# forumdevfromhell.github.io

Static GitHub Pages site for Forum Dev From Hell.

## Deploy

Create or use the repository:

`forumdevfromhell/forumdevfromhell.github.io`

Put these files in the repository root and push to the default branch. In GitHub repository Settings > Pages, set the source to **Deploy from a branch**, then select the default branch and `/ (root)`.

## Automatic project showcase

`app.js` requests the public GitHub repositories for `forumdevfromhell` in the visitor's browser. Public non-fork repositories appear automatically, so adding a new public repository requires no website edit. Results are cached in localStorage for 15 minutes to reduce API calls.

The website repository itself is excluded from the showcase.

## Local preview

Because the project feed uses GitHub's API, serve the directory rather than opening `index.html` directly:

```bash
python3 -m http.server 8000
```

Open http://127.0.0.1:8000/
