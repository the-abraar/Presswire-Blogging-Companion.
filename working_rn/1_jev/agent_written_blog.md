# Jev isn't a chatbot. That's the whole point.

Every AI stack I've looked at this year has the same quiet problem: most of what it spends tokens
on isn't writing. It's deciding. Which agent should handle this? Is this email urgent? Does this
tool call need approval? Should the browser click here or there? None of that needs a paragraph.
It needs a yes/no, a category, or a score — and until recently, we were paying frontier-model
prices to get one.

That's the gap Jev is built for. It's a decision model from TypeSafe AI — you give it a state and
a bounded question, and it hands back a choice, a score, or a probability. No prose, no reasoning
trace, nothing to parse. According to TypeSafe, that narrower job is what lets it run 20–200x
faster and 40–400x cheaper than a general chat model on classification-shaped work, answering in
under 500ms with output tokens priced at zero.

I've been testing it, and reading through what other people are shipping with it. Here's what
actually holds up.

## The numbers, briefly

Testing one batch of 1,000 emails through Jev took about 6 seconds and 9 cents once parallelized.
The same classification job on a GPT-5.6-class model: roughly 5 minutes and 62 cents. Sorting
1,000 YouTube comments by type, reply-worthiness, and sentiment ran about 5 seconds for 5 cents.
Across one testing session, close to 20,000 requests went through for under a dollar total.

Other builders report similar shapes at larger scale: 724 live ads classified across six
dimensions in ~40 seconds for about 9 cents. 700 sales leads scored in ~40 seconds for a similar
price. A social-post scoring tool running 61 separate questions per draft at roughly $0.0004 and
one second per post. A fraud-detection pipeline that ran Jev first, escalated only the uncertain
14% of cases to a larger model, and landed at 96% final accuracy for about 7 cents total.

Worth saying plainly: most of these are builder-reported, not independently benchmarked. Treat
them as directional, not as a spec sheet.

## What it can't do

Jev has no reasoning step, no summarization, and a 64,000-token context window — small next to the
roughly 1-million-token windows GPT and Claude offer now. It's text-only: no images, no browsing,
no code generation, no open-ended writing. Ask it to draft a reply or explain a paper and you're
using the wrong tool. That's not a flaw, it's the design — the moment a task needs generation
instead of a bounded pick, hand it to a real model.

## The pattern that keeps showing up

Read enough Jev projects and the architecture is always some version of the same shape:

```
big model → Jev → code → Jev → tool → Jev → big model
```

The large model plans, writes, and reasons. Jev sits in the gaps, making the small repeated calls
that don't need any of that. A few concrete versions of it:

- **Model routing.** Jev judges how hard a request looks, then sends it to a cheap, medium, or
  frontier model accordingly — instead of defaulting every request to the most expensive option.
- **Guardrails.** Jev screens input before it reaches the main LLM (blocking injection attempts,
  toxic input, off-policy requests) and can screen the output before it reaches the user.
- **Tool-call gating.** An agent's tool call gets classified allow / ask / deny before it executes
  — a cheap second opinion sitting between intent and action.
- **Confidence gating.** Above a threshold, Jev's answer is trusted and the system acts. In a
  middle band, a human confirms. Below that, it escalates to a person. The classifier sets the
  thresholds, not the LLM.
- **Reranking and retrieval triage.** Given a query and a pile of documents, Jev scores relevance
  before a larger model reads anything — so the expensive read only happens on what's likely to
  matter.
- **Bulk labeling.** Map a classification over millions of rows — the kind of job that was never
  going to be cost-effective one LLM call at a time.
- **Real-time control loops.** State in, action out, every few hundred milliseconds — games, bots,
  trading loops, drones. One demo ran a browser agent through a full flight search in about 7
  seconds; another ran continuous decisions in a game loop at roughly $7/hour for ~10
  decisions/second.

## Where it's actually landing

Beyond the demos, a few use cases show up again and again in production-shaped systems:

1. **Inbox and ticket triage.** Classify urgency, owning team, and customer sentiment per message,
   then only hand the ones that need a written reply to a full model.
2. **Lead scoring.** Score fit, confidence, and mismatch across hundreds of leads before spending
   generation on outreach copy — write personalized messages only for the leads worth it.
3. **Content and research triage.** Score relevance across a firehose of posts, papers, or news
   before a larger model reads anything — one research-classification project ran 1,018 papers
   for about 8 cents.
4. **Contract and code review as a first pass.** Score risk or flag concerning clauses/diffs
   before routing the interesting subset to a human or a larger model — narrowing where expensive
   review time actually goes, not replacing the review.
5. **Skill/tool routing inside an agent.** As an agent accumulates more skills and workflows, Jev
   picks which one applies before the full instructions get loaded, instead of the agent inspecting
   everything up front.
6. **Context management.** Between turns, score which parts of a long conversation or tool-output
   history are safe to drop — without rewriting anything that survives, so paths, commands, and
   error messages don't get quietly paraphrased away.

## The honest caveats

A cheap decision isn't automatically a *good* one. Jev can make a trading signal fast; it can't
make a weak signal predictive. It can score a lead in milliseconds; it can't tell you your ICP is
wrong. The model is efficient at applying judgment — it doesn't manufacture judgment that wasn't
there in the underlying data or criteria.

It's also worth keeping the trust boundary straight: a classification is evidence that an action
looks appropriate, not permission to take it. "Allow" should still be a separate, deliberate step
from "decided," especially anywhere the action is irreversible — publishing, spending money,
messaging someone, changing durable state.

And it's currently hosted, not something you self-host — so if you're running anything with a
local-first or privacy-sensitive setup, be deliberate about what evidence actually crosses the
network. Send the minimum needed to make the call, not the whole document.

## Should you use it

If you have a queue of anything — emails, tickets, leads, comments, papers, diffs — and you're
currently paying a frontier model to make a small, repeated, structurally bounded judgment about
each one, that's the exact shape of problem this is for. If your bottleneck is instead generation
— writing, explaining, reasoning through something novel — this doesn't help, and reaching for it
anyway just adds a hop.

The mental model that's stuck with me: don't ask whether Jev can replace your chat model. Ask
whether your chat model was ever the right tool for the specific decision you're asking it to
make. A lot of the time, it wasn't — it was just the only thing available that returned an
answer.

---

*Reference: the infographic saved alongside this draft (`Top 9 places to Use.png`) is a good
one-page summary of the model-routing / guardrails / tool-gating / triage / reranking / eval /
bulk-labeling / real-time-control / confidence-gate patterns above — worth embedding in the
published version if the layout allows it.*
