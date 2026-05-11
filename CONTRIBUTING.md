# Contributing

Issues and PRs are welcome. Local-only build, no CI.

```bash
git clone https://github.com/baditaflorin/mesh-stretch-class.git
cd mesh-stretch-class
npm install
git config core.hooksPath .githooks
npm run dev
```

Commits must use Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `ops:`, `style:`, `perf:`). The `commit-msg` hook enforces this.

Before pushing, `pre-push` runs `prettier --check`, `tsc --noEmit`, and a build smoke test. Don't skip it.
