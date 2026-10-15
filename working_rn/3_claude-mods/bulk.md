# Raw material: Claude Code mods (2026-10-06)

Source article read: "How to Mod Claude Code: The Seven Mods I Built in Four Days" (Claude Code Guide, Oct 4 2026, by Shadman Rahman, Principal PM). Not copied; credit it.
- Claude Code 2.1.287 added mods: TypeScript handlers that run INSIDE Claude Code. Can rewrite tool calls, draw panes/bands, put a line in the status bar.
- Settings hooks / skills / MCP run outside Claude Code. A mod "runs inside".
- Mod = plugin: .claude-plugin/plugin.json, hooks/hooks.json ({"modules":["./register.tsx"]}), hooks/register.tsx.
- Handler shape: ($, e, next). next(e) passes through, next({...e, x}) rewrites, return {deny} blocks.
- Article's example: em-dash-fixer rewrites Write/Edit content instead of a hook blocking and forcing a retry.
- Warning from the docs: mods are NOT sandboxed. They see env vars and every prompt.

What I did (this session, Claude Code 2.1.291, Sonnet 5.5):
- Asked Claude to read my dev folder and suggest mods from the CLAUDE.md files. It found rules that were enforced only by prose or by a half-working hook.
- Tipsoi CLAUDE.md: never commit on live-prod/master/main; pre-commit hook is "INERT wherever core.hooksPath is unset... YOU are the guard"; never commit -a; never reset --hard / clean / checkout -- without git stash -u; never delete a branch.
- TakaTalks CLAUDE.md: main protected, all work to `experimental`.
- ThrottleIQ .claude/settings.json: a Stop hook that BLOCKS stopping to make Claude update features.md / HANDOFF_Document.md / issues_open.md. Costs an extra turn every time.
- Presswire: global sequential {N}_{topic}, never reused; meta.json per published post.
- Picked three: branch-guard, docs-sync-band, presswire-meta.
- Built them with the plugin-authoring skill into a folder outside the repos (~/.claude-work/dev-mods/<session>/<mod>/).
- Checks: `claude plugin validate <mod>`, `claude plugin test <mod>`.
- Results: branch-guard 6 tests pass; docs-sync-band 1 (placeholder smoke test only); presswire-meta 2. Validation passes (warning: no author field).
- Sizes: branch-guard 136 lines (95 rules.ts + 41 register), docs-sync-band 50, presswire-meta 123 (98 + 25).
- First validate FAILED on two mods: "docs-sync-band.pending is not declared: the manifest's types contract must name it". Fix: types/index.d.ts needs an `export type` line before `declare module 'claude-code'`; with only `export {}` the keys weren't read.
- I also broke docs-sync-band myself with a sed edit (`.catch($, e, next)` missing a paren); validate caught it, fixed by hand.
- Not yet verified in a live session: hot reload needs the person to answer "Enable hot reloading for this session?". The band and pane are untested on screen.

Design notes:
- branch-guard: Bash tool.call; splits on && || ; | newline; parses git (skips -C/-c, env assigns, sudo); gets the real branch via `git branch --show-current`; denies commit on protected, commit -a, push to protected or HEAD:protected or --delete, branch -d/-D, reset --hard / clean -f / checkout -- unless `git stash -u` earlier in same command. Status line shows branch, "(protected)" for main/master/live-prod. Limit: uses the session cwd, ignores `git -C <dir>` for the branch lookup. Guard is `.catch`-wrapped: if it throws, command is held, not let through.
- docs-sync-band: tracks Edit/Write paths; "code" = not under DOCS/.claude/build, not .md/.html/png. Editing a handoff doc clears it. Band above prompt: "N code files changed, Handoff docs not updated" with Update docs / Dismiss; hidden while model is working. Replaces the blocking Stop hook (not removed yet).
- presswire-meta: deny writing published/N_slug.md if no working_rn/N_* folder or slug mismatch; auto-create meta.json skeleton (title from first heading, today's date, empty platforms); deny meta.json writes that are invalid JSON, wrong number vs filename, unknown platform, or non-http url; /posts pane lists TODO (not cross-posted) vs done.

Opinion / angle: mods are best where you already wrote a rule in CLAUDE.md that Claude can "forget". Prose rules are requests; a mod is a check. Also, same lesson as the article: "every control needs a case that FAILS" (Tipsoi rule) maps directly onto the tests.
