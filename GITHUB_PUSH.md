# GitHub Push

## Current recovery state — 2026-10-31

The custom-domain GitHub Pages cutover failed for the user's Wi-Fi connection and was rolled back. Formal DNS is restored to proxied `portfolio-t0w.pages.dev` for both apex and www. The independent GitHub snapshot is served from `gh-pages` at `https://lvschopenhauer.github.io/portfolio/`, with no GitHub custom-domain binding. The original `/portfolio/network-test/` snapshot remains untouched as a fallback; this path-only change does not involve DNS. The canonical-root workflow is disabled and manual-only; do not enable it or attach the formal domain until a new migration is explicitly authorized and tested on the affected network. Main pushes still update the original Cloudflare Pages project. The prepared migration instructions below describe the paused workflow, not the active hosting path.

Use this command to commit all current local changes and push the current branch to GitHub:

```cmd
.\push-github.cmd "Update portfolio"
```

The helper script:

- stages the current working tree with `git add -A`
- creates one commit using the message you pass in
- pushes the current branch to `origin`

For Codex runs, use this as the default fast path when the user asks to push the current version to GitHub.

## Prepared GitHub Pages checks (paused)

GitHub Pages deploys this portfolio as a static site through `.github/workflows/deploy-pages.yml` on pushes to `main`. Do not rely on `server.js` or local API routes being available in production. Cloudflare provides DNS only for `sphr.top` and `www.sphr.top`; its proxy must stay disabled for these two records so requests reach GitHub directly.

Before pushing:

- Edit homepage structure in `templates/index.html`, styles in `css/`, and scripts in `js/`. Run `node scripts/build-site.cjs`; generated `index.html` embeds the same CSS and startup modules. The push helper runs this build automatically and stops on build errors.

- The Pages workflow runs the relevant tests, builds the public directory, and checks copied media hashes. The complete published site must stay below GitHub Pages' 1 GB limit. Existing backup MP4s are read from the frozen `gh-pages/network-test/assets/films` media directory; do not remove that media source.

- Check large tracked files before publishing (GitHub rejects individual Git files over 100 MiB):

```cmd
git ls-files | powershell -NoProfile -Command "ForEach-Object { Get-Item $_ } | Where-Object { $_.Length -gt 100MB }"
```

- Large unreferenced source assets stay local. `.pages-build`, `.pages-media`, `outputs`, editor history and local tooling are excluded from the public build. If the old Cloudflare origin is used for rollback, its separate 25 MiB per-file limit still applies.
- Project content must work from static `data/*.json` files when `/api/projects` returns the static HTML fallback.
- Rebuild after startup code or stylesheet changes so the generated HTML contains their current contents. The production homepage no longer depends on separate critical CSS or startup-script requests. Lazy editor modules still require their usual cache version when changed.

After pushing:

- Confirm the `Deploy portfolio to GitHub Pages` Actions run succeeds. Push success alone does not prove publication.

- Open the production route with Playwright and verify the rendered content, not only GitHub push success:

```cmd
playwright-cli open --headed --persistent https://sphr.top/eqlz
playwright-cli eval "() => ({ script: [...document.scripts].map(s => s.src).find(src => src.includes('/js/main.js')), blocks: document.querySelectorAll('[data-project-blocks] > *').length, hasMaterial: document.body.innerText.includes('Material & Growth') })"
```

- If production still shows old content, clear the persistent browser data and reopen:

```cmd
playwright-cli delete-data
playwright-cli open --headed --persistent https://sphr.top/eqlz
```

## Domain rollback

The former origin is `portfolio-t0w.pages.dev`. Restore the backed-up `sphr.top` and `www.sphr.top` CNAME records to that target with Cloudflare proxy enabled to roll back the hosting path. Do not edit `verse`, `video`, `preview-video` or R2 records. Exact pre-cutover snapshots are retained locally in `outputs/domain-cutover-20261031/`; they are not published. DNS and certificate propagation require separate live verification, and desktop checks do not establish cellular reliability.
