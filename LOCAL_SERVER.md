# Local Server

Use this command to start or reuse the local portfolio server on port 4173:

```cmd
.\start-local.cmd 4173
```

Open:

```text
http://127.0.0.1:4173/
```

Notes for Codex runs:

- Run the command outside the sandbox when the server needs to stay alive after the command exits.
- The helper script cleans up the duplicated `Path`/`PATH` environment issue before calling `Start-Process`.
- If the server is already responding, the script exits quickly without starting another process.
