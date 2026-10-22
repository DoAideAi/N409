-- The article library, part 4: the two how-to pieces the funnel was missing.
--
-- The library (0142–0147) answers what a 409A is, what it costs, and every
-- instrument-level question a founder asks after they have decided to buy.
-- What it never answers is the query typed by the founder who has just been
-- told by counsel to "get a 409A": *how* to get one. That founder is the
-- single most valuable reader the blog can have — past the education, before
-- the vendor choice — and the library sent them to a methodology piece.
--
-- The second piece exists because "free 409A valuation" is a real query with
-- a real answer this site can give honestly: the free tools estimate and
-- check, and the thing a free number can never carry is the safe harbor. The
-- piece says so plainly and routes the reader to /free-tools either way.
--
-- Same conventions as 0142: dollar-quoted bodies, staggered published_at so
-- the index does not show a bulk load, ON CONFLICT DO NOTHING so a hand-edited
-- post is never overwritten by a redeploy.

INSERT INTO blog_posts (id, slug, title, excerpt, category, keywords, author, published, published_at, body_html)
VALUES
(
  '01N409B4GPST00000000000001',
  'how-to-get-a-409a-valuation-for-your-startup',
  'How to get a 409A valuation for your startup',
  $x$The whole process, start to finish: what to gather, who to choose, what the provider does with it, what the board has to do, and how long each step takes. Written for the founder doing this for the first time.$x$,
  '409A Basics',
  '409a valuation how to get startup process steps provider board approval timeline first option grant',
  'The N409 team',
  true,
  now() - interval '11 days',
  $x$<p>You have offers out, an option pool approved, and counsel has told you the grants need a 409A valuation behind them. This is the whole process, in order, for a founder doing it for the first time.</p>
<h2>Step 1: Confirm you actually need one now</h2>
<p>You need a 409A valuation before the board approves your first option grant, and a fresh one after any priced round or other material event, and at least every twelve months while you are granting. If none of those apply yet — no grants planned for months, no round in flight — you can wait. If any apply, start now: the clock on an offer letter is usually tighter than the clock on a valuation. The <a href="/when-do-you-need-a-409a">timing guide</a> covers the trigger events in detail, and the <a href="/tools/409a-compliance-checker">compliance checker</a> will tell you in five questions whether an existing valuation still covers you.</p>
<h2>Step 2: Gather the inputs</h2>
<p>Every provider asks for roughly the same records. Having them ready is the difference between a draft in days and an engagement that stalls on week-old email threads:</p>
<ul>
<li>Your capitalisation table — every share class, every option grant, every SAFE or convertible note with its cap and discount</li>
<li>Historical financials — profit and loss and balance sheet, even if they are three spreadsheets and a bank export</li>
<li>A forward forecast, however rough — the provider needs your view of the next 12–24 months, not a board-grade model</li>
<li>Your articles of incorporation and the terms of any preferred stock</li>
<li>The last round's documents, if there was one — the price per share and the preferences attached to it</li>
<li>Anything that bears on value: a term sheet in hand, a large contract signed or lost, a secondary sale of your stock</li>
</ul>
<p>The <a href="/blog/what-a-valuation-provider-needs-from-your-cap-table">cap-table piece</a> goes deeper on the first item, which is the one that causes most of the back-and-forth.</p>
<h2>Step 3: Choose a provider</h2>
<p>The safe harbor requires an independent, qualified appraiser — which rules out doing it yourself and rules out your own CFO. Within that constraint you are choosing between Big 4 and national firms, boutique valuation shops, cap-table platforms that bundle a valuation into a subscription, and AI-native providers that price per report. They differ on price by an order of magnitude, and they differ on turnaround, on audit support, and on whether you are buying one report or an annual subscription. The <a href="/409a-valuation-cost-comparison">provider comparison</a> lays the four types side by side, and <a href="/how-much-does-a-409a-cost">the cost guide</a> covers what moves the price within each.</p>
<p>Whatever you choose, ask three questions before you sign: who signs the report and what credential they hold, what audit support costs when your auditor has questions in two years, and what a refresh costs after your next round — because there will be one.</p>
<h2>Step 4: The valuation itself</h2>
<p>The provider establishes your company's equity value, allocates it across the share classes, and discounts the common for lack of marketability. For a company with a recent priced round, the usual route is a backsolve: the round price implies the enterprise value, and an option pricing model allocates it down to the common. Earlier than that, asset- and market-based approaches carry more of the weight. You do not need to referee the methodology, but you should recognise it in the report — <a href="/409a-valuation-methods">the methods guide</a> is a reader's version. Expect clarifying questions during the draft; a provider that asks none is not reading your cap table closely.</p>
<h2>Step 5: Review the draft</h2>
<p>Read the draft for facts, not for the number. The share counts, the preference stack, the forecast the income approach rests on, the description of the business — those are yours to verify. If something material is wrong, say so during the draft cycle; revisions after delivery reopen the engagement. What you should not do is negotiate the conclusion. A valuation moved down on request stops being independent, and independence is the thing you are paying for.</p>
<h2>Step 6: Board approval</h2>
<p>The valuation does not set your strike price — the board does, relying on the report. The resolution approving the grants should reference the report, its valuation date, and the per-share conclusion, and it should be minuted before the grants are dated. This is the step companies skip when offers are already out, and it is the first document diligence asks for. <a href="/blog/board-approval-and-the-409a-paper-trail">The paper-trail piece</a> covers what the minutes need to say.</p>
<h2>Step 7: Grant, and diarise the refresh</h2>
<p>Grant at or above the concluded fair market value, keep the report with the minutes, and put two dates in the calendar: eleven months out, for the routine refresh, and "the day the next round prices", because a closed round invalidates the report immediately regardless of the anniversary.</p>
<h2>How long all of this takes</h2>
<p>With documents ready: an AI-native provider delivers a first draft in about 24 hours and a signed final inside a week; boutiques typically run one to three weeks; larger firms four to six. Add your own board's scheduling to every one of those numbers — the valuation is rarely the critical path, the resolution is.</p>
<p>If you want to see what you are buying before you start, the <a href="/sample-report">sample report</a> is the full document with every exhibit, no email gate. And if you only need a sense of the range first, the <a href="/tools/409a-valuation-calculator">free calculator</a> gives you one in a minute.</p>$x$
),
(
  '01N409B4GPST00000000000002',
  'free-409a-valuation-tools-what-they-can-and-cannot-do',
  'Free 409A valuation tools: what they can and cannot do',
  $x$Free calculators and checkers answer real questions — what range to expect, whether your valuation is still current, what a provider will charge. The one thing no free tool can produce is the safe harbor itself. Where the line sits.$x$,
  '409A Basics',
  'free 409a valuation tools calculator estimate safe harbor compliance checker cost comparison',
  'The N409 team',
  true,
  now() - interval '2 days',
  $x$<p>Search for a free 409A valuation and you will find two kinds of result: tools that genuinely answer a question for nothing, and pages using the word "free" to collect your email. This piece is about what the honest version of free can and cannot do.</p>
<h2>What a free tool can actually answer</h2>
<p>A surprising amount of the 409A process is arithmetic on facts you already have, and arithmetic is free:</p>
<ul>
<li><strong>What range should I expect?</strong> A <a href="/tools/409a-valuation-calculator">409A calculator</a> takes your last round, capital raised, or revenue and returns a defensible range for the common stock. It will not be your number, but it tells you whether a provider's conclusion is in the right neighbourhood.</li>
<li><strong>Is my current valuation still good?</strong> The twelve-month rule and the material-event rule are checkable in five questions — that is the whole of the <a href="/tools/409a-compliance-checker">compliance checker</a>.</li>
<li><strong>Am I ready to start?</strong> A <a href="/tools/readiness-checker">readiness checker</a> turns the provider document list into a score and tells you what is missing before an engagement stalls on it.</li>
<li><strong>What will I pay?</strong> Provider pricing varies by an order of magnitude for the same safe harbor; a <a href="/tools/cost-comparison">cost comparison</a> shows the bands before any sales call does.</li>
<li><strong>What is the tax shape of my options?</strong> An <a href="/tools/stock-option-tax-calculator">option tax calculator</a> answers the employee-side question — ISO versus NSO, AMT exposure, the cost of exercising — that the 409A number feeds into.</li>
</ul>
<p>All of these exist on our <a href="/free-tools">free tools page</a>, none of them behind an email gate, because the answers above are the orientation a founder needs before they are a customer at all.</p>
<h2>The thing no free tool can do</h2>
<p>The 409A safe harbor — the presumption that shifts the burden of proof onto the IRS — attaches to <em>an independent appraisal by a qualified appraiser</em>, not to a number. A calculator's output can be exactly right and still carry no protection, for the same reason a correct self-diagnosis is not a prescription: the regulation names who must have done the work. A founder-built model, a spreadsheet from an adviser with a stake in the outcome, or a free calculator result pasted into a board deck all share the same status — they are unprotected numbers, and if the IRS asks, you carry the burden of proving each one, years later. The <a href="/409a-valuation-guide">409A guide</a> covers what the safe harbor is worth; the short version is that it is the entire product.</p>
<h2>Where "free 409A valuation" offers actually land</h2>
<p>Genuinely free independent appraisals do not exist at any scale, because the appraisal is labour by a credentialed human who signs it. What the phrase usually means in the market:</p>
<ul>
<li><strong>Bundled into a subscription</strong> — cap-table platforms include a valuation in an annual plan. Not free: the subscription is the price, and leaving the platform usually means losing the valuation history.</li>
<li><strong>Free first draft, paid final</strong> — the signed report, which is the only document that matters, is the paid part.</li>
<li><strong>Lead capture</strong> — a form that returns a number by email is a sales pipeline, and the number has the same legal status as the calculator's: none.</li>
</ul>
<h2>The honest division of labour</h2>
<p>Use free tools for everything before the engagement: the expected range, the compliance check on your current report, the document list, the price you should pay. Spend money on exactly one thing — the independent appraisal itself — and spend it with whoever answers the audit-support question convincingly. Orientation is free. The safe harbor is not, and anyone pricing it at zero is charging you somewhere you have not looked yet.</p>
<p>Start with the <a href="/tools/409a-valuation-calculator">calculator</a> if you want the range, or the <a href="/sample-report">sample report</a> if you want to see what the paid document actually contains.</p>$x$
)
ON CONFLICT (slug) DO NOTHING;
