# RTK — Token-Optimized CLI

**rtk** is mandatory for every shell command to maximize token savings. Target **80%+ savings** by default.

## Non-negotiable rule

Always prefix shell commands with `rtk`, whatever the model or agent mode:

```bash
# Instead of:              Use:
git status                 rtk git status --short --branch
git log -10                rtk git log -10 --oneline
npm test                   rtk npm test
npm run build              rtk npm run build
docker ps                  rtk docker ps
kubectl get pods           rtk kubectl pods
```

Never run raw `git`, `npm`, `pnpm`, `yarn`, `cargo`, `docker`, `gh`, `pytest`, `python`, etc. unless explicitly debugging RTK itself or `rtk --version` fails.

## Output discipline for 80%+ savings

- Prefer compact commands: `rtk git status --short --branch`, `rtk git diff --stat`, `rtk git log --oneline -10`.
- Use targeted pathspecs: `rtk git diff -- ./src/file.ts`.
- Never dump large files, lockfiles, build output, dependency trees, or full logs.
- Filter noisy output before showing it: `grep`, `head`, `tail`, `awk`, targeted test names.
- For package metadata, request exact fields only: `rtk npm view <pkg>@latest version engines peerDependencies --json`.
- If savings are unexpectedly low, run `rtk gain` and switch to more targeted commands.

## Meta commands

Use directly:

```bash
rtk gain
rtk gain --history
rtk discover
rtk proxy <cmd>
```

## Enforcement

This repository also includes `.github/hooks/rtk-rewrite.json` with `rtk hook copilot` to rewrite/block missed shell commands when supported by the client.
