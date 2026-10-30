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

- Brand/title: `index.html`
- Project names and descriptions: `index.html` and `js/main.js`
- Email/social links: `index.html`
- Hero image: `assets/hero.png`
- Project cover sheet: `assets/project-sheet.png`
- Visual system and responsive layout: `css/styles.css`

## Production

The production site is https://sphr.top/. Push `main` to `LvSchopenhauer/portfolio` to trigger the existing Cloudflare Pages deployment. Production serves static project JSON; the editor's writable API runs locally. See [GITHUB_PUSH.md](GITHUB_PUSH.md) for release checks. Local archives and QA evidence in `outputs/` are excluded from Git and deployment.
