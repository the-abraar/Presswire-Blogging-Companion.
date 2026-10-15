# I turned three CLAUDE.md rules into code

My Tipsoi CLAUDE.md has a line I've always found a little funny: the pre-commit hook that blocks commits on `live-prod` is "INERT wherever `core.hooksPath` is unset… YOU are the guard."

So the rule that matters most is enforced by asking Claude nicely.

Claude Code 2.1.287 added mods, and that line is what made me look at them. A mod is a TypeScript handler that runs inside Claude Code, so it can block a tool call, rewrite it, or draw something next to the prompt. I read Shadman Rahman's write-up of his seven, then asked Claude to read my dev folder and propose mods from my own CLAUDE.md files. It came back with nine. I built three.

## Why a mod and not a hook

Settings hooks run as separate scripts and talk back through JSON. A mod runs in the session, sees the tool call before it runs, and can change it. Every handler looks the same: `($, e, next)`. Call `next(e)` to pass the call through, `next({ ...e, command })` to rewrite it, or return `{ deny: "reason" }` to stop it.

The thing I actually care about is the third one. A rule in CLAUDE.md is a request. A deny is a check.

## branch-guard

The rules, from two projects: never commit on `live-prod`, `master` or `main`; never `git commit -a`; never `reset --hard`, `clean` or `checkout --` without `git stash -u` first; never delete a branch. TakaTalks adds that everything goes to `experimental`.

The mod hooks `Bash`, splits the command on `&&`, `||`, `;` and pipes, and finds the `git` segments. It asks git for the real current branch, then judges each one. A commit on a protected branch is denied. So is `git push origin HEAD:live-prod` from a feature branch, because the target is what matters, not where you're standing. `reset --hard` is allowed only if `git stash -u` comes earlier in the same command.

It also puts the branch in the status line, with `(protected)` next to `main`, `master` and `live-prod`.

It is the biggest of the three: 136 lines. Most of that is parsing, because `git -C ../x commit` and `FOO=1 git commit` are both commits.

One limit I know about: it asks for the branch in the session's working directory, so `git -C other-repo commit` is judged against the wrong branch.

## docs-sync-band

ThrottleIQ has a Stop hook that blocks Claude from stopping until it has updated `features.md`, `HANDOFF_Document.md` and the issues files. It works. It also costs a full extra turn every time, including the many times nothing doc-worthy happened.

The mod tracks which files Claude edits. Code files add to a list; editing one of the handoff docs clears it. If the list is non-empty and the model isn't working, a band appears above the prompt: "3 code files changed, Handoff docs not updated", with **Update docs** and **Dismiss**. Update docs submits the same instruction my Stop hook used. If I'm not in a repo with that docs folder, it never shows.

50 lines. I haven't removed the Stop hook yet. I want to see the band on screen first.

## presswire-meta

This one is for the pipeline this post sits in. Presswire numbers every post globally, `{N}_{topic}`, never reused, and each published post gets a `meta.json` with its platforms and URLs.

The mod denies writing `published/3_x.md` if there's no `working_rn/3_*` folder, or the slug doesn't match. When a post is written it creates the `meta.json` skeleton if it's missing: title from the first heading, today's date, empty platforms. It rejects a `meta.json` that is invalid JSON, has a `number` that disagrees with the filename, names a platform I don't use, or has a URL that doesn't start with `http`. And `/posts` opens a pane that lists each post as TODO if it hasn't been cross-posted anywhere.

123 lines, split between the handlers and a small pure `checkMeta` function I could test on its own.

## What broke

`claude plugin validate` failed on two of the three the first time. The state keys the band and the pane use have to be declared in a `types/index.d.ts`, and my file had only `export {}` before the `declare module`. The validator couldn't see the keys until I added an `export type` line, like the bundled example does. Then I broke `docs-sync-band` myself with a `sed` edit that dropped a parenthesis, and validate caught that too. I'd rather learn this from a validator than from a session that quietly runs without the guard.

Tests: 6 for `branch-guard`, 2 for `presswire-meta`. `docs-sync-band` has one placeholder smoke test, because what it does is draw a band and I can't check that from a test file.

## What I haven't checked

The mods are written, they validate, and the tests pass. That is all. The first load needs me to answer "Enable hot reloading for this session?", so I haven't watched the band or the pane draw, or seen `branch-guard` stop a real commit. I'll update this post when I have.

Mods also aren't sandboxed. They see your environment variables and every prompt you send. All three are short enough to read in a few minutes, and I'd want that to stay true.

## The takeaway

Go through your CLAUDE.md and mark every line that says "never" or "always." Those are the mods. The ones I picked are the ones where the file already admits it's relying on Claude to remember.

---

*Source for the idea: Shadman Rahman, "How to Mod Claude Code: The Seven Mods I Built in Four Days," Claude Code Guide, October 4, 2026.*
