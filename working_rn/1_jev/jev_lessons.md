# Jev integration — lessons for next time

Written 2026-09-27, after fixing up the first Jev (typesafe.ai) intent-routing integration on
`abrar_dev_jev` (commit `8625b926f`). Read this before wiring in *any* new intent-classification
vendor to `classify-agent.ts`, Jev or otherwise — most of this generalizes.

## What shipped, and what didn't

- Code: `packages/ai-core/src/router/classify-agent.ts` + `jev-client.ts`. Tests:
  `classify-agent.jev.test.ts`, `jev-client.test.ts`. Wired into `apps/ai/app/api/route-intent/route.ts`.
  Typecheck + full test suite green (5360 tests; the only failures are pre-existing `packages/db`
  suites that need a Docker runtime this environment doesn't have — unrelated).
- **Still NOT enabled anywhere.** `TYPESAFE_API_KEY` is unset in every `.env*`, the dev script, and
  `docker-compose.yml`. Fixing the code made it *safe to merge*, not *safe to turn on* — see the open
  items at the bottom before anyone sets that key in a real environment.

## Bug #1 — `confidence || 0.9` silently defeated a fail-safe

The original inline code did:
```ts
const confidence = response.answers.agent.confidence || 0.9;
```
`0` is a real, meaningful answer here — `apps/tipsoi-web/app/components/ask-ai/useAskAiChat.ts:615-617`
explicitly treats confidence `0` (and anything below `CONFIDENCE_THRESHOLD = 0.6`) as "don't guess
Buddy on an ambiguous message, fall back to Helpdesk." Because `0` is falsy in JS, `||` silently
promoted a genuinely low-confidence Jev verdict to `0.9` — comfortably *above* the safety threshold.
**Lesson: never use `||` to guard a numeric field where `0` is a legitimate value. Use a `typeof`/
`Number.isFinite` check, or don't default at all or clamp with `Math.min/max` and let a real `0`
survive.** This exact `Math.min(1, Math.max(0, x))` pattern already existed six lines below, for the
Haiku path — the new code should have reused it from day one instead of writing a second, different
rule for confidence handling in the same function.

## Bug #2 (caught in review, never shipped) — the refactor almost dropped the message itself

While fixing bug #1 I refactored the inline `new TypeSafeClient()` + `process.env.TYPESAFE_API_KEY`
read into an injected dependency (see "the DI lesson" below). The *first* pass of that refactor wrote:
```ts
history: inConversation ? buildRouterMessages(message, history) : [],
```
— which is exactly what the original code did, but the original code got away with it because it
*also* sent a separate `latest_message: message` field that this refactor dropped. Net effect: on
every turn-1 classify (the common case — the web panel classifies once per conversation), Jev would
have received an **empty history and no message text at all**, and would have been forced to guess
blind. Caught by re-reading `buildRouterMessages`'s contract before writing the test, not by running
anything — the test I'd initially written (`expect(seen?.history).toEqual([])`) actively encoded the
bug as the "expected" behavior. Fixed by calling `buildRouterMessages(message, history ?? [])`
unconditionally — it already collapses to `[{role:'user', content: message}]` for empty history, so
`history` alone now carries the message in both modes and `latest_message` is gone entirely.
**Lesson: when a refactor drops a field, grep for what fed it (`latest_message`) and check every mode
the function has (turn-1 vs. in-conversation), not just the one you're looking at. And write the
"what does the model actually receive" test BEFORE trusting it — a test can assert the bug just as
easily as the fix.**

## The DI lesson — don't read `process.env` inside a shared package

The original code did `new TypeSafeClient()` and `process.env.TYPESAFE_API_KEY` directly inside
`ai-core`, which:
1. Made it untestable without mocking the whole `@typesafe-ai/sdk` module.
2. Went around this repo's own established pattern for exactly this problem —
   `packages/ai-core/src/buddy/anthropic-client.ts`'s `createAnthropicClient(usage, opts)`: build the
   real client **at the call site** (`apps/ai`), inject it as a plain function. `apps/ai`'s route
   already did this for Anthropic; the Jev code didn't follow suit.
3. Quietly reintroduced a second secret into `apps/ai`, which `docs/rules/architecture.md` documents
   as a **closed, SHIPPED** decision: "AI service... Holds ONLY `ANTHROPIC_API_KEY`."

Fix: `jev-client.ts` exports `createJevClassifier(opts?)`, returning `undefined` when unconfigured
(mirrors "not attempted" vs. "attempted and failed" — the caller only tries Jev, and only falls back
to Haiku on failure, when this returns a function). `classify-agent.ts` takes it as
`deps.classifyWithJev?`. Now `jev-client.test.ts` mocks the SDK **once**, in the one file allowed to
know its shape, and `classify-agent.jev.test.ts` tests the routing logic with a plain injected
function — no module mocking needed there at all.
**Lesson: before wiring a new vendor's SDK directly into a shared package, check whether an existing
factory (`createXClient`) already establishes the pattern for "how secrets get into this codebase" —
copy it. It buys testability and keeps the secret-partition invariant visible for free.**

## The benchmark was comparing to a straw man — and the honest fair re-run still favors Jev, but not for the reason assumed

`benchmark_jev.py`'s "Haiku" baseline used a one-line prompt with no forced tool schema, no
`ROUTING_RULES`, no conversation history — nothing like what `classify-agent.ts` actually runs
(forced `tool_choice`, the full worked-example rules text, model `claude-haiku-4-5`). A fair re-run
(`benchmark_jev_fair.py`, same 500-item dataset) copies that SYSTEM prompt and TOOL schema verbatim
for Haiku, and gives Jev the **full** `ROUTING_RULES` text via `state.routing_rules` (the original
benchmark passed Jev only a one-sentence paraphrase):

| | Jev 1.13 (via OpenRouter) | Haiku (real production prompt) |
|---|---|---|
| Success | 478/500 (4.4% transient failures — not diagnosed further, see caveat below) | 500/500 |
| Accuracy | 99.58% | 89.00% |
| Avg latency | 0.444s | 1.634s |
| Cost (500 reqs) | ~$0.003 | ~$0.028 |

Two things worth knowing, not just the headline:
- **Haiku's accuracy barely moved (90.0% → 89.0%) despite the much stronger prompt.** That's the
  opposite of what I expected going in ("the original benchmark was unfair to Haiku, a fairer one
  will close the gap"). It didn't close. The more likely explanation: this LLM-generated dataset
  doesn't contain the specific hard cases `ROUTING_RULES` was written for (the "tell me everything
  about me" bug, the "second half" continuation bug, leave how-to vs. imperative) — so giving Haiku
  the elaborate prompt bought nothing on *this* dataset. **That's a dataset problem, not proof the
  prompt engineering was wasted** — don't let a synthetic benchmark tell you the hard-won rules don't
  matter; they were written against real production incidents this dataset doesn't reproduce.
- **Haiku's latency roughly doubled (0.91s → 1.63s) once given the real prompt.** That's a genuine,
  not artifactual, cost of the production system prompt's length — if Jev's latency/cost edge holds
  up on harder data too, that's the actually interesting part of this comparison, not the accuracy
  number.

**Lesson: when someone hands you a benchmark favoring a new vendor, check what the *incumbent* side
of the comparison actually is before believing the delta. And when you fix the comparison, report
what changed AND what didn't — a benchmark that confirms your prior is exactly the one to double-check
hardest.**

## Still open — do not treat this as "ready to enable"

1. **No `TYPESAFE_API_KEY` was available to test against.** The benchmark re-run above still goes
   through OpenRouter's alpha decisions endpoint, not the shipped `@typesafe-ai/sdk` →
   `api.typesafe.ai` path `jev-client.ts` actually uses. Same model, different transport/auth — close,
   not identical. Get a real key and re-run through `createJevClassifier` itself before trusting any
   number for a go/no-go call.
2. **No data-vendor / PII sign-off exists.** Message text sent to Jev can include facts about a real
   employee (shift, roster, leave history, "my employee id", etc. — see `ROUTING_RULES` itself for the
   list). `docs/rules/ai-buddy.md` and `docs/rules/architecture.md` say nothing about a second LLM
   vendor seeing that text. Get an explicit owner ruling and update `architecture.md`'s "AI service
   holds ONLY `ANTHROPIC_API_KEY`" line before setting `TYPESAFE_API_KEY` anywhere but a sandboxed test.
3. **The 22/500 (4.4%) transient Jev failures** in the fair re-run weren't root-caused (a 40-request
   concurrency probe afterwards showed 0 failures, so it's likely intermittent, not systemic — but
   "likely" isn't "verified"). If this ever goes live, add the same kind of fallback-attribution
   logging `classify-agent.ts` already has for Haiku, and watch the real failure rate before trusting
   this number.
4. **Dataset.** `tipsoi_qa_dataset.json` is LLM-generated, not real traffic (real employee messages
   can't go in a benchmark file per this repo's own PII rule anyway). If a next attempt wants a
   dataset that actually stresses the router, it should be built from the SPECIFIC worked examples
   already sitting in `classify-agent.ts`'s comments (the incidents that shaped `ROUTING_RULES`), not
   another LLM-generated batch of plausible-sounding queries.

## Checklist for next time (any new routing/classification vendor here)

- [ ] Build the client via an injected factory (`createXClient`), never `new Client()` + `process.env`
      inside `ai-core` directly. Return `undefined` when unconfigured so "not attempted" and "attempted
      and failed" stay distinguishable.
- [ ] Grep every field the code you're replacing sent (e.g. `latest_message`) before deleting it —
      confirm where else that value is reconstructed, for every mode the function has.
- [ ] Never `||`-default a numeric confidence/probability field. `0` is data.
- [ ] Give the new vendor the SAME prompt content (full rules text, not a paraphrase) you'd compare
      it against — and give the *incumbent* the same treatment before trusting a benchmark's delta.
- [ ] Write the wiring tests (what does the model actually receive) before trusting a refactor,
      especially across a turn-1 vs. in-conversation split.
- [ ] Before enabling any new key in a real environment: check whether it collides with a documented
      "only holds X secret" architecture invariant, and get the PII/vendor conversation done — a
      working code path and an approved code path are two different milestones.
