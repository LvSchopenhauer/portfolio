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
