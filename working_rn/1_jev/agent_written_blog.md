# Jev isn't a chatbot. That's the whole point.

Every AI stack I've looked at this year has the same quiet problem: most of what it spends tokens
on isn't writing. It's deciding. Which agent should handle this? Is this email urgent? Does this
tool call need approval? Should the browser click here or there? None of that needs a paragraph.
It needs a yes/no, a category, or a score — and until recently, we were paying frontier-model
prices to get one.

That's the gap Jev is built for.

## What Jev actually is

Jev is a decision model from TypeSafe AI, a company that came out of stealth on September 15,
2026 with a $40 million seed round. It was co-founded by Diogo Almeida, who spent about four years
at OpenAI helping build ChatGPT — which makes the pitch land differently: this isn't an outsider
guessing at what's missing from chat models, it's someone who helped build one deciding a big
chunk of what they're used for shouldn't need one at all.

TypeSafe calls Jev a "System One" model, after Daniel Kahneman's *Thinking, Fast and Slow*. System
One is fast, automatic judgment — knowing 2 + 2 is 4 without working through it. System Two is
slow and deliberate — the kind of reasoning Claude or ChatGPT do when they think through a
response. Jev is built purely for the System One half: it doesn't write, it decides.

Every call has two parts: a **state** (a ticket, an email, a document, a log line — structured or
plain text) and one or more **questions**, each of a fixed type:

- **Choice** — pick one option from a list you define, with a probability for every option.
- **Score** — rate the state on an ordered scale you define.
- **Noul** — a yes/no question, returned as a probability of "yes."

Send Jev a support ticket that reads "my card was charged twice," ask it a Choice question over
`billing / technical / sales`, and it comes back with something like
`{"billing": 0.08, "technical": 0.85, "sales": 0.07}` plus an overall confidence — no explanation,
no prose, just a typed answer your code can branch on directly. TypeSafe's docs recommend sending
every question you might need in one request, including speculative ones, since questions in a
single call are evaluated in parallel and mostly don't add latency.

## The pattern: confidence-gated action

Nearly every real use case reduces to one design: **act when Jev is sure, escalate when it isn't.**
Armin Ronacher, CTO of Earendil, put it to TechCrunch about as plainly as it gets — the model
"delegates the hallucination problem a little bit to the user." A 50% answer is a coin toss and
should be treated like one. A 95% answer is worth acting on.

The shape shows up everywhere: high confidence → code acts (route, approve, block, rank) directly.
Middle confidence → send it to an LLM for a slower, deeper look. Low confidence → put it in front
of a human. The thresholds aren't fixed — TypeSafe's own voice-banking example sets a 0.6 floor
for checking a balance but wants north of 0.85 before approving a transfer. The model doesn't set
the bar. You do, per action, based on what a wrong answer costs.

## The numbers — and which ones to actually trust

Three tiers of evidence are floating around, and they're not equally solid.

**Vendor-reported:** TypeSafe's own benchmarks claim Jev is 193.6x faster and 444.6x cheaper than
the frontier models it was tested against, at $0.042 per million input tokens with output priced
at zero, responding in roughly 70–500ms. Worth knowing before you repeat these: TypeSafe built the
benchmark workflows itself and scored Jev against the *average* of two external models, not a
ground-truth answer key — and the company itself says real-world gains likely sit below that high
end.

**Independently tested:** One outside team ran Jev through OpenRouter and measured a median latency
of 0.33 seconds across 791 calls (slowest: 1.42s) — closer to the vendor's range than you might
expect from a third party. The same team ran an 8-way routing task and found that keeping only
answers at 90%+ confidence lifted accuracy from 83.8% to 95.5%, while still answering 70% of the
items outright. That's the kind of number worth actually citing — it's someone else's data, on
their own task, not TypeSafe's.

**Builder-reported, take with a grain of salt:** the viral tweets — 724 ads classified across 37
brands in 40 seconds for 9 cents, 700 leads scored in 40 seconds for the same price, a 586-page
site's internal-link map rebuilt in 45 seconds for 21 cents, a fraud-detection pipeline hitting 96%
accuracy after escalating just 31 of 100 emails to a larger model. None of these are audited. All
of them are directionally consistent with each other, which counts for something, but they're
still one builder's numbers on their own data.

## What it can't do

Jev has no reasoning step, no summarization, and a 64,000-token context window — small next to the
roughly 1-million-token windows GPT and Claude offer now. It's text-only: no images, no browsing,
no code generation, no open-ended writing, and critically, **no explanation** — it returns a
probability, not a reason why. Paul Chada of Doozer AI made the sharpest version of this point to
InfoWorld: a confidence score tells you how sure the model was, not why, and that gap matters the
moment you have to defend a decision to a regulator or a customer.

## Where it's actually landing

Strip away the demos and the same architecture keeps repeating:

```
big model → Jev → code → Jev → tool → Jev → big model
```

The large model plans, writes, and reasons. Jev handles the small, repeated, bounded calls in
between. Concrete versions people have actually shipped:

- **Inbox and ticket triage.** Classify urgency, owning team, and sentiment per message, then only
  hand what needs a written reply to a full model — one builder went from a full inbox to "nearly
  inbox zero" this way, using Jev only to archive and label, never to write.
- **A self-organizing second brain.** A private Slack channel captures every stray idea; Jev
  classifies each one by type, area, and priority; a full model files it into the right Notion
  page. No sorting later, because the sorting already happened.
- **Model and skill routing.** Jev scores how hard a prompt looks and sends it to a cheap, medium,
  or frontier model accordingly — or, inside an agent with many skills, picks which one applies
  before the full instructions get loaded.
- **Guardrails and tool-call gating.** Screen input before it reaches the main LLM (jailbreaks,
  injection attempts, off-policy requests), or gate a tool call as allow / ask / deny before it
  executes. Pranit Sharma, an engineer at Vercel, told TechCrunch his team replaced an
  OpenAI-based safety reviewer with Jev and got results 5–18x faster with better accuracy —
  secondhand, one team, one workload, but a real production swap.
- **Reranking and retrieval triage.** Score relevance across a pile of documents before a larger
  model reads anything. TypeSafe's own legal-search cookbook reported top-1 accuracy rising from
  5% to 18% (and top-10 from 38% to 62%) after reranking a BM25 shortlist — a small, single-domain
  test, worth replicating before trusting.
- **Semantic linting in CI.** Define a check that needs meaning, not just a regex — "does this
  error message tell the user what to do next?" — and fail the build only when confidence is high.
- **Contract and code review as a first pass.** Score risk per clause or per diff, and route only
  the flagged, uncertain subset to a human or a larger model, instead of reviewing everything at
  the same depth.
- **Bulk classification.** Map a yes/no or category question over hundreds of thousands of rows —
  the kind of job that was never going to be worth an LLM call per row.
- **Inside the product, not just behind it.** Browser extensions like Unclutter use Jev to
  recognize and hide ads, cookie banners, and low-quality content on the fly; recommendation tools
  use it to score and rank options against a user's answers; live-monitoring apps use it to decide
  which price move or news item actually deserves an alert.

## The honest caveats

A cheap decision isn't automatically a good one. David Linthicum's comparison, via InfoWorld, is
the right one: using a general LLM for every small decision is like using a full enterprise
service bus to answer a yes/no routing question — but the fix is matching the tool to the
decision, not assuming the cheap tool is always right. A few things worth sitting with before you
build on it:

- **It's hosted, not self-hostable.** No public model weights exist yet, so anything privacy- or
  local-first needs to be deliberate about what evidence actually crosses the network — send the
  minimum needed to make the call, not the whole document.
- **It's a young, single-vendor dependency.** Advait Patel, an SRE at Broadcom, points out Jev
  runs in a single region from an early-stage vendor — real security, data-residency, and
  service-level questions for anything production-critical.
- **Confidence isn't authority.** A high-confidence classification is evidence an action looks
  appropriate, not permission to take it automatically — especially anywhere the action is
  irreversible: publishing, spending money, messaging someone, changing durable state.
- **Access is still limited.** As of mid-to-late September 2026, TypeSafe runs a waitlist for
  direct API access; it's also available through OpenRouter, Vercel's AI Gateway, and Cloudflare
  Workers AI in the meantime.
- **Typed doesn't mean true.** A Choice or Score answer can't come back malformed — but it can
  absolutely come back wrong. Structure is not the same guarantee as correctness.

## If you want to actually try it

The sanest way in, borrowed from people who've piloted it inside real workflows rather than demos:

1. Pick one decision you already make thousands of times a month — ticket routing is the classic
   starting point.
2. Write the question, the allowed answers, and the escalation path *before* touching the API.
   Specifying thresholds and escalation rules in advance is most of the actual work.
3. Run it in shadow mode next to your current process first. Check that a stated 90% confidence
   actually means about 90% right on *your* data, not TypeSafe's.
4. Only let it act automatically above a threshold you've measured yourself.

## Should you use it

If you have a queue of anything — emails, tickets, leads, comments, papers, diffs — and you're
currently paying a frontier model to make a small, repeated, structurally bounded judgment about
each one, that's the exact shape of problem this is for. If your bottleneck is generation —
writing, explaining, reasoning through something novel — this doesn't help, and reaching for it
anyway just adds a hop.

The mental model that's stuck with me: don't ask whether Jev can replace your chat model. Ask
whether your chat model was ever the right tool for the specific decision you're asking it to
make. A lot of the time, it wasn't — it was just the only thing available that returned an answer.

---

*Reference: the infographic saved alongside this draft (`Top 9 places to Use.png`) is a good
one-page summary of the model-routing / guardrails / tool-gating / triage / reranking / eval /
bulk-labeling / real-time-control / confidence-gate patterns above — worth embedding in the
published version if the layout allows it.*
