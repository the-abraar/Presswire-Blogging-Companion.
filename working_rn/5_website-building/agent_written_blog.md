# The best website brief I've read is seven lines of CSS

Three joke websites taught me more about building websites than most product specs I've reviewed.

The first one, motherfuckingwebsite.com, is a plain HTML page with no CSS at all. It is 4.9 KB. It loads instantly, fits every screen, works in every browser and is readable by a screen reader. Its argument: websites aren't broken by default, we break them. It also says, near the bottom, that it's satire. The point isn't that your site should look like that.

The second, bettermotherfuckingwebsite.com, answered with seven declarations of CSS:

```css
body {
  margin: 40px auto;
  max-width: 650px;
  line-height: 1.6;
  font-size: 18px;
  color: #444;
  padding: 0 10px;
}
h1, h2, h3 { line-height: 1.2; }
```

Page size: 3.8 KB. Every line fixes a reading problem: line length, spacing, size, contrast.

The third, perfectmotherfuckingwebsite.com, adds three things. A `lang` attribute so screen readers pronounce the page correctly. A system font instead of the browser default. A dark-mode media query. Ten declarations, a `@media` block and one attribute. Page size: 4.5 KB.

That's the whole progression. Each step is a small, specific fix to a real user problem, and none of them needed a framework, a designer or a sprint.

## What I take from it as a product person

**Start from the reader's job, not the brand's.** Someone lands on a page to find out one thing. The three pages answer that in the first screen. Most sites I see put a hero animation, a cookie banner and a chat widget between the visitor and the answer.

**Every addition has a cost someone else pays.** A web font, a carousel, a tracking script: each costs load time, and the user on a slow phone pays it, not the person who requested the feature. When someone asks for "just one more widget", I now ask what we'd delete to pay for it.

**Defaults are a decision you didn't make.** The first page is bad to read mostly because nobody chose a line length or a line height. The fix wasn't creativity. It was making four choices on purpose. Most of the quality in a product comes from choices like that, not from big features.

**Accessibility is cheap early and expensive late.** The `lang` attribute is one attribute. Retrofitting accessibility into a finished site is a project with a budget. If your spec has no line for it, you've already decided to pay the late price.

**Constraints make good briefs.** "Seven declarations" is a better brief than "make it look modern", because you can tell when you're done and when you've gone over.

## Where the joke runs out

These pages have no product. No signup, no checkout, no analytics you'd act on, no way to tell whether anyone understood anything. A real site has to convert, be found, be measured and be changed by people who aren't you. That takes more than ten lines.

But when I review a site that does all that and loads slowly, reads badly and fails on a phone, I know which of the two jobs was skipped. The extra weight is a product decision somebody made without noticing.

## What I'd do on the next site

1. Ship the plain page first. Real content, seven lines of CSS, `lang` set. See if people get what they came for.
2. Make every addition earn its place against a number: a conversion, a task finished, a question answered. If it can't name one, it waits.
3. Set a page-weight budget in the brief, next to the feature list. Treat going over it as a bug.
4. Check it on a cheap phone on a bad connection before calling it done.

The best thing the three pages did was make me ask, for every element on a site I'm responsible for, who it's for. Sometimes the answer is nobody.
