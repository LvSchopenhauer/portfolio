# GitHub Push

Use this command to commit all current local changes and push the current branch to GitHub:

```cmd
.\push-github.cmd "Update portfolio"
```

The helper script:

- stages the current working tree with `git add -A`
- creates one commit using the message you pass in
- pushes the current branch to `origin`

For Codex runs, use this as the default fast path when the user asks to push the current version to GitHub.

## Cloudflare Pages checks

Cloudflare deploys this portfolio as a static site. Do not rely on `server.js` or local API routes being available in production.

Before pushing:

- Edit homepage structure in `templates/index.html`, styles in `css/`, and scripts in `js/`. Run `node scripts/build-site.cjs`; generated `index.html` embeds the same CSS and startup modules. The push helper runs this build automatically and stops on build errors.

- Check tracked files over Cloudflare's 25MB asset limit:

```cmd
git ls-files | powershell -NoProfile -Command "ForEach-Object { Get-Item $_ } | Where-Object { $_.Length -gt 25MB }"
```

- Large local source assets should stay ignored through `.gitignore` and `.assetsignore`.
- Project content must work from static `data/*.json` files when `/api/projects` returns the static HTML fallback.
- Rebuild after startup code or stylesheet changes so the generated HTML contains their current contents. The production homepage no longer depends on separate critical CSS or startup-script requests. Lazy editor modules still require their usual cache version when changed.

After pushing:

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
