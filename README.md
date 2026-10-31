# Cinematic Portfolio

一个受 FutureDeluxe 站点布局和动效语言启发的个人作品集模板。它没有复制对方品牌、素材或文案，而是使用原创生成视觉和可替换的个人项目内容。


## Run

```powershell
node server.js 4176
```

Then open:

```text
http://127.0.0.1:4176
```

## Edit Your Content

Use the local [project editor](http://127.0.0.1:4173/admin) for project copy, hero media and content blocks. Start with `start-local.cmd`; see [EDITOR.md](EDITOR.md) for drafts, revision history, recovery and verification.

- Homepage HTML source: `templates/index.html`
- Project names and descriptions: `templates/index.html` and `js/main.js`
- Email/social links: `templates/index.html`
- Hero image: `assets/hero.png`
- Project cover sheet: `assets/project-sheet.png`
- Visual system and responsive layout: `css/styles.css`

After editing HTML, CSS or startup JavaScript, run `node scripts/build-site.cjs` to refresh the generated `index.html` and diagnostic comparison page. The local launcher and Git push helper do this automatically. Production embeds the same styles and startup modules into the homepage to avoid additional blocking requests. Project JSON and editor saves do not require rebuilding.

Homepage covers use lossless WebP derivatives, verified against the visible original pixels; the originals remain available for project pages. Cover requests start near the viewport, and the existing video begins after its poster has had a chance to load. If autoplay is rejected, a play button provides a user-initiated fallback.

Detail pages use full-frame lossless cover derivatives, hide the previous image during a project switch, and lazy-load below-fold images and the Vimeo iframe. Previously embedded EQLZ/Supernova images are stored as independent files with unchanged encoded bytes so their JSON no longer blocks on image downloads.

Each main film retains its original Vimeo embed and adds a manual “备用播放” switch. Backup MP4s are hosted independently at `https://lvschopenhauer.github.io/portfolio/network-test/assets/films/<slug>.mp4`; no MP4 request starts before selection. These are existing public H.264 playback renditions (up to 1080p and 1920px wide), copied without re-encoding, not original masters. They are published on `gh-pages` rather than duplicated into Cloudflare's asset bundle. Leaving a page releases both players. Keep this media path available when changing hosting, and verify playback on the affected cellular network before claiming the access issue resolved.

## Production

361 currently uses the owner's Bilibili upload `BV1Pexe6uE9q` as its main embed, with autoplay and danmaku disabled. Bilibili projects hide the experimental MP4 backup switch. The editor accepts Bilibili video/player links, BV IDs and iframe snippets, normalizing them to a validated HTTPS player URL. Other project players retain their existing sources.

The production site is https://sphr.top/, hosted directly on GitHub Pages with DNS-only records at Cloudflare. Push `main` to `LvSchopenhauer/portfolio` to run `.github/workflows/deploy-pages.yml`. The workflow builds the same public files and explicit route entry points, verifies media copies, and deploys a Pages artifact; it does not publish local archives, server code or editor history. Production serves static project JSON; the editor's writable API runs locally. See [GITHUB_PUSH.md](GITHUB_PUSH.md) for release and rollback checks.

`scripts/build-github-pages.cjs` builds the public directory without changing visuals or encoding media. The six existing backup films are retained in `gh-pages/network-test/assets/films` and read by the workflow's second checkout. Earlier test-page bookmarks redirect to their canonical project routes; existing backup film paths remain available. Cloudflare's former Pages deployment is retained as a rollback origin.
