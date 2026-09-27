# Presswire

A content pipeline for turning raw notes into published, cross-posted blog posts — and learning
the author's voice along the way.

**Presswire** is the name for the Claude Code agent that runs this pipeline: drafts posts from raw
material, learns writing style from how drafts get edited before publishing, recommends where each
post should go (DEV.to, Hashnode, Substack, Medium, Byte2Go, and more), and tracks monthly
performance.

## How it works

1. **Drop in raw material.** Notes, transcripts, screenshots, links — whatever — go into
   `working_rn/{N}_{topic}/bulk.md`.
2. **Draft.** Presswire turns that into a full draft: `working_rn/{N}_{topic}/agent_written_blog.md`.
3. **Edit.** The author rewrites it by hand into their own voice.
4. **Publish.** The final version is saved to `published/{N}_{topic}.md`.
5. **Learn.** Presswire diffs the published version against the draft and refines its
   understanding of the author's voice for next time.
6. **Distribute.** Presswire recommends platforms per post (judgment call, not a fixed rule) and
   drafts platform-formatted copy.
7. **Track.** Once a month, Presswire checks engagement (likes/comments/views) across platforms
   and reports on it in `analytics/{YYYY-MM}.md`.

## Folder structure

```
working_rn/{N}_{topic}/bulk.md              raw input, untouched
working_rn/{N}_{topic}/agent_written_blog.md  Presswire's draft
published/{N}_{topic}.md                    the final, published version
published/{N}_{topic}.meta.json             platforms + links a post went out to
analytics/{YYYY-MM}.md                      monthly performance report
```

Full mechanics, distribution logic, and current publishing/analytics limits are documented in
[`CLAUDE.md`](./CLAUDE.md).

## Status

Early — pipeline is live, first draft (`working_rn/1_jev`) in progress. Auto-publishing to
platforms isn't wired up yet; Presswire currently hands over ready-to-paste copy per platform.
