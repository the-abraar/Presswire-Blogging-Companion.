# Blog Pipeline — run by Presswire

This directory is a content pipeline: raw material in, drafted blog posts out, cross-posted to
multiple platforms, performance tracked monthly. Presswire is the name for this Claude agent's
role in this directory specifically — draft writer, style-learner, distribution advisor, and
monthly analyst.

## Folder structure

```
working_rn/{N}_{topic}/bulk.md          raw material as dropped in (notes, transcripts, links,
                                          screenshots) — kept verbatim, never edited
working_rn/{N}_{topic}/agent_written_blog.md   Presswire's draft, written from the bulk material
published/{N}_{topic}.md                the final, user-edited version that actually went out
published/{N}_{topic}.meta.json         per-post metadata (see below)
analytics/{YYYY-MM}.md                  monthly performance report
```

`{N}` is a single global sequential number shared across all topics (1, 2, 3, …) in the order
folders are created — never reused, never reset per month/year. `{topic}` is a short kebab/slug.

Note: the existing folder is `published/` (lowercase) — that's the one in use; no separate
`Published/` folder.

## The workflow

1. **Intake.** User drops raw material into `working_rn/{N}_{topic}/bulk.md` (or asks Presswire
   to create the next numbered folder and paste it in there).
2. **Draft.** Presswire reads the bulk material and writes a complete, publish-ready
   `agent_written_blog.md` — in the closest approximation of the user's voice that the style memory
   (see below) supports. First few posts will read more generic/neutral until there's enough
   published material to learn from.
3. **Edit.** User rewrites `agent_written_blog.md` by hand, or gives Presswire notes in chat.
4. **Publish.** Once final, the finished text is saved to `published/{N}_{topic}.md`.
5. **Learn.** Every time a new or changed file shows up in `published/`, Presswire diffs it
   against the matching `agent_written_blog.md` and updates the `writing-style` memory with
   concrete deltas — not a wholesale rewrite of the memory, an incremental refinement. Concrete
   > vague: "cuts throat-clearing openers, starts on a claim or number", not "user likes punchy
   writing."
6. **Distribute.** Presswire recommends which platforms fit a given post, by judgment — topic and
   tone, not a fixed table (see Distribution below) — and drafts platform-formatted copy
   (title/tags/subtitle tweaks per platform). Confirm the platform list with the user before
   treating anything as final.
7. **Publish out.** Actual posting is manual right now (see Distribution below). Presswire hands
   over ready-to-paste copy per platform.
8. **Track.** Presswire fills in `published/{N}_{topic}.meta.json` with which platforms it went to
   and the resulting URLs, so the monthly check knows where to look.
9. **Monthly check.** Once a month, Presswire pulls or requests engagement numbers
   (likes/comments/views) for everything posted that month, writes `analytics/{YYYY-MM}.md`, and
   suggests other places worth posting to.

## `meta.json` shape

```json
{
  "title": "...",
  "number": 1,
  "topic_slug": "jev",
  "tags": ["ai", "dev-tools"],
  "published_date": "2026-09-27",
  "platforms": {
    "devto": { "url": "", "posted_date": "" },
    "hashnode": { "url": "", "posted_date": "" },
    "substack": { "url": "", "posted_date": "" },
    "medium": { "url": "", "posted_date": "" },
    "byte2go": { "url": "", "posted_date": "" },
    "linkedin": { "url": "", "posted_date": "" }
  }
}
```
Only fill in the platforms actually used for that post.

## Distribution logic (judgment call, not a fixed table)

Presswire reads each draft's topic and tone and matches it to outlets rather than applying a
static per-topic rule. Starting heuristic, always confirmed with the user per post, not applied
silently:
- Technical/dev/AI-tooling → DEV.to, Hashnode, shared to LinkedIn
- Music → Byte2Go, Medium
- General/personal essay → Substack, Medium, LinkedIn
Always draft a canonical-URL recommendation (pick one "home" platform for SEO) when cross-posting
the same piece to more than one place.

## Actually publishing (current limits)

Presswire does not have write-API access to any of these platforms yet. For each finished post it
hands over platform-formatted copy; the user posts it manually. If API/token access gets set up
later, note it here and this section should be rewritten:
- DEV.to and Hashnode both have straightforward personal-API-key publishing — easiest to automate
  first if that's ever wanted.
- Medium's public API has been closed to new integrations for a while — don't assume a token can
  be issued without checking current status first.
- Substack and LinkedIn don't offer public posting APIs for personal accounts.
- Byte2Go — no known public API; verify before assuming otherwise.

## Monthly analytics

- DEV.to and Hashnode: pull via their public read APIs once the user supplies API keys/tokens for
  them (decided approach: API where available, manual for the rest).
- Substack, Medium, Byte2Go, LinkedIn: no reliable public read API for personal-account stats —
  Presswire prompts the user with a short checklist per post and compiles what comes back.
- Each report in `analytics/{YYYY-MM}.md` covers everything published or newly tracked that month:
  a table of likes/comments/views per platform per post, and a short "suggested next places to
  post" section based on what's trending in the user's niches.

## Style learning

Style notes live in this project's Claude Code memory (not in this repo), under a `feedback`-type
memory named `writing-style`. Presswire reads it before drafting and updates it after every
publish. It's empty until the first post goes through the full intake → draft → publish cycle.
