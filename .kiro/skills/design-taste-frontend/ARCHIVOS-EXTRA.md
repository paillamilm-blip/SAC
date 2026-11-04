# Archivos extra de `design-taste-frontend`

No caben en el paquete de Kiro (máx. 25 archivos por skill).
- **Documentación** (✅ incluida): su contenido completo está más abajo en este archivo.
- **Datos / código / binarios** (⬇️): descárgalos a la ruta indicada solo si la tarea los necesita:

```bash
mkdir -p "$(dirname <archivo>)" && curl -fsSL <enlace> -o <archivo>
```

| Archivo | Estado | Enlace |
|---------|--------|--------|
| `README.md` | ✅ incluida abajo | https://raw.githubusercontent.com/paillamilm-blip/mis-skills/main/kiro-skills/03-diseno/design-taste-frontend/README.md |
| `references/app-screens.md` | ✅ incluida abajo | https://raw.githubusercontent.com/paillamilm-blip/mis-skills/main/kiro-skills/03-diseno/design-taste-frontend/references/app-screens.md |
| `references/colour.md` | ✅ incluida abajo | https://raw.githubusercontent.com/paillamilm-blip/mis-skills/main/kiro-skills/03-diseno/design-taste-frontend/references/colour.md |
| `references/copy.md` | ✅ incluida abajo | https://raw.githubusercontent.com/paillamilm-blip/mis-skills/main/kiro-skills/03-diseno/design-taste-frontend/references/copy.md |
| `references/critique.md` | ✅ incluida abajo | https://raw.githubusercontent.com/paillamilm-blip/mis-skills/main/kiro-skills/03-diseno/design-taste-frontend/references/critique.md |
| `references/imagery.md` | ✅ incluida abajo | https://raw.githubusercontent.com/paillamilm-blip/mis-skills/main/kiro-skills/03-diseno/design-taste-frontend/references/imagery.md |
| `references/layout.md` | ✅ incluida abajo | https://raw.githubusercontent.com/paillamilm-blip/mis-skills/main/kiro-skills/03-diseno/design-taste-frontend/references/layout.md |
| `references/motion.md` | ✅ incluida abajo | https://raw.githubusercontent.com/paillamilm-blip/mis-skills/main/kiro-skills/03-diseno/design-taste-frontend/references/motion.md |
| `references/research.md` | ✅ incluida abajo | https://raw.githubusercontent.com/paillamilm-blip/mis-skills/main/kiro-skills/03-diseno/design-taste-frontend/references/research.md |
| `references/scenes.md` | ✅ incluida abajo | https://raw.githubusercontent.com/paillamilm-blip/mis-skills/main/kiro-skills/03-diseno/design-taste-frontend/references/scenes.md |
| `references/tells.md` | ✅ incluida abajo | https://raw.githubusercontent.com/paillamilm-blip/mis-skills/main/kiro-skills/03-diseno/design-taste-frontend/references/tells.md |
| `references/type.md` | ✅ incluida abajo | https://raw.githubusercontent.com/paillamilm-blip/mis-skills/main/kiro-skills/03-diseno/design-taste-frontend/references/type.md |
| `scripts/lib/app-draw.mjs` | ⬇️ descargar | https://raw.githubusercontent.com/paillamilm-blip/mis-skills/main/kiro-skills/03-diseno/design-taste-frontend/scripts/lib/app-draw.mjs |
| `scripts/lib/probe.mjs` | ⬇️ descargar | https://raw.githubusercontent.com/paillamilm-blip/mis-skills/main/kiro-skills/03-diseno/design-taste-frontend/scripts/lib/probe.mjs |
| `scripts/lib/rules.mjs` | ⬇️ descargar | https://raw.githubusercontent.com/paillamilm-blip/mis-skills/main/kiro-skills/03-diseno/design-taste-frontend/scripts/lib/rules.mjs |

---

## 📄 `README.md`

# tasteskill v2 (`design-taste-frontend`)

A design skill for coding agents, built from a study of 247 curated sites (One Page Love and Awwwards
Sites of the Day, October 2026). It gives an agent an art direction instead of letting it fall back on
the average landing page, holds it to a strict no-ornament house style, and makes it look at its own
render before calling the work done.

## How it works

1. **Inventory.** The agent lists what only this client has: the name and what it means, the street,
   the numbers, the one constraint, the materials, the hours.
2. **Draw.** `scripts/draw.mjs` deals three of 20 directions (each an idea engine seen on the
   strongest studied sites); the agent picks the one that can carry something from the inventory, and
   the script deals the rest: a hero composition, section compositions, a type system of real free
   fonts, a palette, photographs, a motion, studied references, and under every blueprint a list of
   where it disagrees with the house rules. Recent draws are remembered so projects do not repeat.
3. **Idea and live thing.** One sentence tying the client's own material to the direction's device,
   checked against the nearest competitor, and one thing the visitor can do on the page.
4. **Build** from the sheet, words first, full content. When the project has no photographs of its
   own, `scripts/assets.mjs` finds real pictures of the subject's world in open collections (its
   street in old postcards, old maps, its materials, engravings of its trade, museum objects of its
   kind), downloads them into the project and records their credits; the subject is drawn in code
   only where no honest picture exists.
5. **Gate.** `scripts/lint.mjs` (source) and `scripts/inspect.mjs` (real browser, 1440 / 768 / 390)
   measure the house rules: headlines of two lines or fewer, no eyebrow labels, no monospace, no
   01/02/03, no thin rules, no gradients, no resting shadows, no cream-and-terracotta, no violet, and
   the faults blind jurors punished: no focal point, empty screens, text covered or cut, long pins,
   sideways rows, faded text.
6. **Look.** The inspector saves screenshots; the agent critiques them with an Awwwards-weighted
   rubric, fixes the top three problems and repeats, at most three rounds.

Five rounds of blind tests against a no-skill baseline and another design skill are recorded in
`references/research.md` §11.

## Contents

```
SKILL.md                 the run, the house rules, the laws
references/              copy, type, colour, layout, imagery, motion, critique, tells, research
scripts/draw.mjs         deal options / a direction / reprint / redraw; --alternatives, --photos, --site
scripts/assets.mjs       search open image collections (Openverse, Wikimedia Commons, Art Institute of
                         Chicago, the Met) and, with --video, real footage (Wikimedia Commons, Internet
                         Archive, NASA); --get downloads with the credit, --credits prints them
scripts/lint.mjs         static scan for banned patterns and stock phrases
scripts/inspect.mjs      render, measure, photograph
scripts/lib/             zero-dependency Chrome DevTools client, the in-page probe, the rules
library/                 directions (20), heroes, sections, type systems, palettes, photographs,
                         studied sites, motions
assets/base.css, base.js an optional neutral foundation
evals/evals.json         six briefs for testing the skill against a no-skill baseline
```

## Requirements

Node 22 or newer and an installed Chrome, Edge or Chromium for `inspect.mjs` (it drives the browser
over the DevTools protocol with Node's built-in WebSocket; nothing is installed). `draw.mjs`,
`lint.mjs` and `assets.mjs` run on Node 18+; `assets.mjs` needs network access and no API keys. Set
`CHROME_PATH` if the browser is somewhere unusual.

## Install

Copy this folder to your skills directory, for example `~/.claude/skills/design-taste-frontend/`, or keep it in
a repository under `.claude/skills/`.

## Notes

- Photographs in the library are served by Lorem Picsum from Unsplash, under the Unsplash licence.
  They are placeholders for atmosphere; replace them with the project's own pictures.
- Pictures found with `assets.mjs` keep their own licences. By default it offers only CC0, public
  domain, CC BY and CC BY-SA, and `--get` records the title, creator, licence and source of every
  download in `assets/credits.json`. The page must carry the credits (`--credits` prints them).
- `assets.mjs --video` finds short clips of the subject's world, takes a 720p-or-smaller rendition,
  refuses files over 25 MB unless `--max-mb` is passed, and saves a poster frame with each clip; how
  to use one on a page (muted loop, poster, stopped under reduced motion) is in
  `references/imagery.md` §11.
- Fonts are loaded from Google Fonts and Fontshare. Check each face's licence for your use.
- The scores in `references/research.md` are model judgements from screenshots, not Awwwards scores.
- The draw history lives in `~/.taste-skill/history.json` (set `TASTE_SKILL_HISTORY` to move it).
  Delete it to reset.
- A build takes an agent roughly 30–45 minutes and a few hundred thousand tokens with the full
  look-and-fix loop; most of that is finding or drawing pictures when a project has no photographs.

---

## 📄 `references/app-screens.md`

# App screens

Dashboards, admin, analytics, settings, inboxes, wallets and builders: the screens people work in.
Read this file whole before you start one. The page run in `SKILL.md` does not apply to them.

A generated dashboard is the average of every dashboard template: a dark or tinted sidebar with a
coloured pill on the active item, "Welcome back" and a waving hand, four KPI cards each with an icon
in a tinted circle, a green "+12.5%" and a sparkline, a gradient area chart, a zebra table under
uppercase headers. Nothing in it is wrong and none of it was decided.

This chapter is distilled from a study of 23 real product screens chosen by the owner: 17 products,
17 light screens and 6 dark, all at desktop width (1440 or 1512px). Each screen was measured from its
pixels and noted for what works and what fails; the numbers below are those measurements and their
medians. The products are not named. What separates these screens from the generated kind, in order
of how much it shows:

1. **Colour goes on data, not chrome.** The median screen has about 3% coloured pixels; 17 of 23 stay
   at 5% or less. 12 have no filled primary button at all.
2. **KPIs are type, not tiles.** No screen puts an icon in a coloured circle on a KPI, and none draws a
   sparkline on one.
3. **Surfaces are flat.** 17 of 23 give their cards no shadow; separation is a 1px line or one tone
   step.
4. **There is no hero header.** 9 screens have no heading over 16px; where there is one, its median is
   24px.
5. **Charts carry almost no chrome.** A single series has no legend; gridlines are 3-7 faint lines or
   none.
6. **Navigation recedes.** The active item is a neutral grey pill or a change of text colour; a
   coloured left bar appears once.
7. **Tables are rules and alignment.** No zebra striping, no header bands, numbers right-aligned.
8. **Data states are honest.** Zeros print as zeros, missing values as a grey dash, and an empty
   section keeps its frame.

Taking the template's devices away is half the job, as it is on a page. The other half is substance:
the product's real data, a screen that answers its one question first, and a grid whose arithmetic
closes.

**A warning learned in testing.** In the first blind round, screens built with this chapter were
clean, quiet and correct, and they lost to richer screens built without it. The judges' reasons were
the same every time, and each is now a rule below:

- **The first screen was thin.** One large chart of a flat line filled it, and half the blocks the
  brief asked for started below the fold. On a 1440×900 screen, every block the brief names shows its
  header and its first rows (§2.2).
- **The product was missing.** No name, no workspace, no mark: the screen could have belonged to
  anyone. The shell names the product and the scope (§3.2).
- **Restraint hid meaning.** A latency rise and a request rise were the same grey. Colour on a change
  says good or bad, not up or down (§5).
- **There was nothing to do.** No control for the job the screen exists for. The most frequent job is
  one click from the first screen (§2.2).
- **Rows ended ragged** and **a style's move was over-applied** (a tray around every card, an icon
  rail where people needed labels). Keep the move to where it carries meaning.

Quiet is the starting point, not the goal. A screen that a person would trust shows more of the
product than a template does: its people, its objects, its numbers and the one thing to do next.

**Give the product a face.** After four rounds the judges' top complaint was the same on most
screens: "a well-applied kit, not a product with its own identity" (stock Geist or Inter, a #f8f8f8
ground, white 12px cards, lime on black). The style's tokens make a screen correct; these make it
this product's, and choosing them is a step of the run, not a finish (§2.3):

- **One face from the sheet, chosen before you build.** Each style lists two or three ways it takes a
  face from the brief: a ground tinted from the product's world, a figure face with character, the
  brand's hue on the main data element. Choose one, write it in your notes next to the screen's
  question, and check that it shows on the first screenshot.
- **The dealt typeface, really loaded.** A build that fell back to the default face landed on the
  default look; the inspector now fails it.
- **The product's mark and name** at the top of the shell, drawn for this product (a simple
  monogram or symbol in the accent, from its name or its object), never a black square with a letter.
- **One element only this product has**, built from its own things: an energy home's power flow, a
  bakery's sell-out strip, a leave planner's cover against the minimum, the pace groups of a running
  club as a unit chart, the couple as three lanes, a deploy's commit as the hero of the overview. The
  sheet lists the library's signature elements whose words appear in the brief; otherwise invent one.
  Name it in your notes next to the screen's question.
- **The one chart hue on the main data element**: today's line, the booked bars, the current period,
  the margin that breaks. A screen whose only hue is a delta reads as a kit, and the inspector warns
  when a screen with charts carries no hue on its data (`no-data-hue`).
- **Its people and objects as themselves**: each person gets a stable initial and a pale tint of their
  own hue, with people listed next to each other at least 60 degrees apart. These tints are identity,
  not data: they stay pale and out of the chart legends. Products show their thumbnails, cover art
  shows the cover.
- **Words of the trade** in labels and empty states ("Waiting on the customer", "Off sick", "Due
  on the 28th"), never the generic noun of a template ("Items", "Records", "Status").

**Calendars and timelines** (house rule, from testing; the study has none). People down the left on a
fixed 160-220px column, grouped under a team subheader rather than repeating the team on every row;
days across with faint 1px day lines, weekends one tone step darker, and today marked by a 1px line
in the one data hue with its date in ink. Bars are 20-24px tall at radius 4. One-line names sit on a
32px pitch; a name with a subline (team, office) needs 40-44px, or the subline touches the next name.
**Every kind of booking has its own mark**, so sickness reads apart from a holiday at a glance:
holiday a pale fill, off sick a 1px diagonal hatch, long leave a darker grey step, working away an
outline, a pending request a dashed outline. A style with a hue budget may add a 3px left edge in the
hue for the kind the screen is about. Full colour is only for what needs a decision (a request that
breaks cover). A label sits inside its bar; a bar too short for it shows the kind's code inside and
the full label in its tooltip, or the label after the bar's end, never over the days before it.
Holiday markers name their office in a multi-office product. Every swatch in the legend is the mark
itself, scaled down, and lists only kinds on screen: `Charts.timeline(el, rows, kinds)` draws the bars
and returns that legend from the same kinds map.

## Contents

1. When this applies
2. The run for an app screen
3. The shell
4. The canvas and the page title
5. KPIs
6. Charts
7. Tables and lists
8. Forms and settings
9. Type and colour
10. Density
11. Empty, zero, loading and error states
12. The phone
13. House rules for app screens
14. Tells of generated dashboards

## 1. When this applies

An app screen is worked in rather than read. This chapter covers:

- dashboards and overviews: a seller's day, a project's health, a publication's growth;
- admin and back office: members, orders, events, a catalogue;
- analytics and reports, including a generated report with no app around it;
- settings and billing;
- list screens to work through: inboxes, queues, tables with filters;
- wallets and finance homes;
- builders and editors: flow, form and page builders, canvases;
- the detail page of one object: an event, a deployment, a customer.

A product site that shows its interface is a page; the interface fragments on it follow these rules
for their insides (mark each fragment's root with `data-ui`). When a request holds both, build each
with its own run and share one palette and one typeface.

The study is 23 desktop screens. It has no phone screens, no loading or error states, one settings
page, no inbox and no dense operations table (the densest screen shows about 120 data points). Where a
rule below goes past the study, it says **house rule**.

## 2. The run for an app screen

Do these in order. The first three steps decide whether the screen is any good.

### 2.1 Inventory the data and the jobs

The page run inventories the subject's world; an app screen inventories its data. Write in your notes,
in 8 to 12 lines:

- **the objects** the screen shows (deployments, invoices, members, events, conversations) and their
  fields, with units;
- **realistic magnitudes**: how many objects, a typical amount, the range of a rate, how values move
  over a day, a month, a year, and for a new account how small they really are;
- **the people**: who opens this screen, how often (a glance once a day, or an eight-hour session),
  on what device;
- **the jobs**: what they do next from here (approve, reply, pay, ship, invite), and which job comes
  up most;
- **the product's own things**: its name and mark, the workspace or account it is scoped to, the people
  in it (two partners, a team of six, the club's members), and the objects people recognise by sight
  (product photographs in a shop, cover art in a media tool, a map of the route). These are what make
  a screen belong to this product instead of to a template; plan where each one appears.

Then write the data itself: a small dataset in a JSON or JS file that the screen renders from, with
believable names, amounts that add up to their totals, dates in order and a unit on every figure.
Totals are computed from the rows, never typed in separately. Small numbers stay small: the studied
screens show new accounts with 1, 6 or 9 of something, drawn honestly at their real size. Write the
figures that must agree as assertions in the data file (`console.assert(sold - cancelled === rsvps)`,
the bins sum to the total, the parts to the whole) and read the console: in testing, a ticket table
that did not reconcile with its own KPI cost a judge's trust in the whole screen. Checks that need
computed values (allowance after a request, cover per day) go in the script that computes them.

**Data that tells the truth** (house rules, from testing; judges checked every one of these):

- **A fact shown twice is one variable.** A time window, a total or a state that appears in two cards
  (the battery full 13:30-16:30 in the KPI label, the shaded span and the battery card) is one value in
  the data file, and the copy and the chart annotation are both built from it. Two cards that
  disagree by half an hour cost more trust than a missing card.
- **Totals and deltas come from the parts as shown.** Sum the rounded pennies the screen displays,
  never round the unrounded total separately: £21.68 + £8.34 − £3.81 is £26.21, and a screen that
  says £26.22 is caught. A change is the difference of the two values on screen (£5.28 against
  £5.22 is +£0.06, not +£0.07).
- **Every relative figure names its baseline** in the same phrase: "3 h 40 m before close", "45 m
  earlier than last Sunday", "+5 on the usual Monday". "Early", "up" or a bare "+5" next to another
  time or figure reads as measured against that one.
- **One name per time.** Shops close at 15:00 and the tills are cashed up at 15:12; the header and
  the card use the same words for the same moment, and an error state rewrites the status line.
- **If a caption has to say which bars are which, encode it in the chart instead**: a marked period in
  a second tone with its own legend entry, a signed axis, a label on the mark.

### 2.2 Name the screen's one question

Every screen answers one question first: "Did today's sales come in?", "Which deploy broke?", "Who is
waiting for a reply?", "How much of this month's plan is left?". Write it in one line. It decides
three things:

- **what is biggest.** In the study the largest block is always the one that carries the screen's
  question, whatever form it takes (a chart, a plan, a ring, a list). The same holds for figures:
  the largest figure on the screen answers the question the title row's sentence answers. In testing,
  an 88% sun ratio at 32px out-shouted the 24px charging window the title led with;
- **what comes first** in the reading order;
- **what is left out.** The studied settings page shows three usage numbers and links to the
  analytics screen instead of drawing a chart; four screens draw no chart at all because a few
  numbers say it.

Then name the screen's **one finding**: the fact in today's data that most needs attention ("9 no-shows
while 8 people waited for a place", "the 23:28 deploy doubled the error rate", "eating out is £36 over").
Put it where it is read first, as the line under the title or the subline of the headline figure,
next to the action it drives. In testing, the finding that mattered sat in a 14px caption at the
bottom of a card and the screen read as flat.

**Do not rebuild a studied screen.** When the product is of the same kind as a screen in the study (a
finance home, a deploy overview), its arrangement is the trap: judges recognised the copies at once.
Take the structure from the product's own things instead: for a couple's budget, Mia, Joint and Tom
as three columns running through accounts, plan and bills; for a running club, the pace groups.

Then list the screen's blocks as the answers to its next questions, one line each, the way the page
run lists claims. A block with no question is deleted. This is how you avoid the stock order of KPI
row, big chart, two small charts, table.

Three more lines, each tested:

- **Everything the brief names is on the first screen.** At 1440×900, every block the brief asks for
  shows its header and its first rows or its figure. Size the headline block to the question (about
  200-360px tall), cap long lists at 4-6 rows with "View all", and put time-sensitive blocks (bills
  due, SLAs running out, a failed deploy) before long tables. A chart whose line is flat for most of
  the window does not get the full width: give it two-thirds and put the next answer beside it.
- **The most frequent job is one click away.** Name it ("pack the orders due today", "reply to the
  oldest breach", "redeploy the failed build") and put its control where the answer shows: a primary
  button in the title row, an action on the row that needs it, a "View logs" on the failed item. A
  screen with no control for its main job reads as a report, not as a tool.
- **Show the evidence beside the answer.** A judge trusts "Error rate 0.28%" more with its spike
  annotated ("peaked at 3.9% after the 23:28 deploy, reverted") than with the number alone. One line
  of explanation on the event that matters is worth more than a second chart.

### 2.3 Choose a style

```bash
node <skill>/scripts/draw.mjs --app --kind <kind> --brief "<one line about the product>" \
  --screens <screens> [--theme light|dark] [--keep palette,type] --options 3
```

This deals up to three styles from `library/app.json` (fewer when only two suit the kind and the
theme). `draw.mjs --app --list kinds` (or `styles`, `screens` or `signatures`) prints the choices; the
screens are `overview`, `analytics`, `list`, `detail`, `settings`, `wallet`,
`builder`, `inbox`, `home` and `report`. The library holds seven styles, each distilled from the
studied screens that share its move:

| Style | Theme | For | The move |
| --- | --- | --- | --- |
| `achromatic-ledger` | light | money homes, reports, settings with usage | No colour in the chrome; charts in ink; one small signal where a figure changed |
| `framed-sheet` | light | B2B analytics, developer platforms, builders | One tinted L-frame; the page on a white sheet inset 8px, no shadow |
| `accent-ladder` | light | creator and small-business admin with plans | The full hue on small marks only; its pale tints on every area |
| `editorial-greeting` | light | team and personal homes | The greeting as the h1 in a centred 12-column column; every figure at regular weight |
| `pastel-consumer` | light | wallets, budgeting | Pale same-hue tiles under one large radius; quiet money polarity |
| `true-black-flat` | dark | community, events, media | Elevation by lightness alone; colour only on data |
| `data-terminal` | dark | markets, monitoring | Every selection is the same 1px accent line; signs, not colour, on numbers |

Choose by how the product is used (long sessions or a quick look, money or media, a team or one
person, day or night), not by what is most familiar, and write one line on why. Then deal the sheet:

```bash
node <skill>/scripts/draw.mjs --app <the same arguments, without --options> --style <id>
```

The sheet gives the style's tokens and type, its shell and one pattern for each screen you named.
Keep the style's one move intact and take every other value from the defaults in this file. Redraw
(`--redraw style | shell | screen:<name>`) only for a reason you can state: it contradicts the brand,
or the product is used in a way the style does not suit. With an existing brand, pass
`--keep palette,type`, map its colours onto the roles in §9 and keep the style's colour budget.

**Then choose its face, before any markup.** The sheet's "Its face" list gives two or three ways this
style takes a face from the brief, and "Signature elements" lists the library's elements whose words
appear in the brief (a power flow for an energy home, a sell-out strip for a bakery, a cover matrix
and a kind-encoded timeline for a leave planner). Write in your notes, next to the screen's question:
the face you chose, the signature element (from the sheet, or your own built from the product's
things), and where each appears on the first screen. A style dealt to two products must not give them
the same face: in four rounds, the screens that skipped this step were scored as the same kit.

### 2.4 Build the shell

Build the frame first, empty: the sidebar or rail, the top bar if the shell has one, the canvas with
its gutters, the title row (§3 and §4). `<skill>/assets/app.css` is a neutral start for all of it:
copy it into the project and put the sheet's tokens in its `:root`. Look at it at 1440 and at 390 before any data goes in. Do the
grid arithmetic now and write it in a comment: the column count, the gutter, and the sum that proves
the cards land on the canvas edges.

### 2.5 Put in the data

Render every block from the dataset; draw the charts from it too, with `<skill>/assets/charts.js`
(`Charts.line`, `Charts.bars`, `Charts.diverging`, `Charts.ring`, `Charts.barList`, `Charts.plan`,
`Charts.bullet`, `Charts.timeline`, `Charts.matrix`, `Charts.timeStrip`; the file's header lists their
options) or your own SVG to the rules of §6, never a chart library's defaults and never a picture of a
chart. The newer helpers return `{ svg, legend }`: put that legend in the card's header rather than
drawing your own, so each swatch is the mark it explains. Format every figure by §7.4: separators, fixed decimals per
metric, a sign on every change, units as smaller grey suffixes, tabular figures, right alignment in
columns. Use the product's own words for labels. No placeholder data: the inspector fails lorem ipsum,
Acme, John Doe and their kind. Proof is not invented here either: no vanity totals, no "+12%" on an
account that is a week old.

### 2.6 Build the states

For every block, build its empty, zero, loading and error state (§11); for every row and control, its
hover, selected, focus and disabled state. Look at each one in the browser. A screen that only works
with full data is half built.

### 2.7 The check

```bash
node <skill>/scripts/lint.mjs --app <source files or folder>
node <skill>/scripts/inspect.mjs --app <url or path/to/index.html>
```

A sheet dealt with `--app` switches both tools to the app rules by itself. The inspector opens the
screen at 1440, 768 and 390 and measures what this chapter asks for: an h1 (and reports it as the
screen's hero); a sidebar that folds on the phone; the canvas used to its right edge; panel shadows
and borders; the number of corner radii; cards in one row that end apart, where a column of cards
stacked with the gutter counts as one block (`ragged-row`); a blank band inside a card of over 40px,
or over 64px before a new section's heading (`panel-void`); icons in tinted squares; numeric alignment and tabular figures; chart hues; colour
share, and a screen with charts but no hue on its data (`no-data-hue`); placeholder data; text under
11px; and the page rules that still hold (contrast, gradients, the banned palettes, emoji). Fix every
`FAIL`. Treat each `WARN` as wrong unless you can defend it to a designer in one sentence.

Then look at the screenshots, every width, and answer these in writing. This is the critique for an
app screen: the caps in `critique.md` for pictures, motion and the page's live element are page rules
and do not apply here.

1. Is the screen's question answered by the biggest thing on it, and is that read first? Is the
   largest figure the one that answers the title row's sentence?
2. Does every block share the screen's edges? Is there a dead strip on one side, a card stopping
   short, an orphan cell, a stretched card with a blank band (a legend pinned to its foot, four rows
   in a card kept at its neighbour's height)?
3. Is colour only on data, on status and on the one primary action, and does the main data element
   carry the one hue? Does the face you chose show on the first screen?
4. Do the numbers add up, and do they line up digit for digit? List every fact that appears twice
   and check that the copies agree; recompute each total and change from the values as displayed;
   check that every relative figure names what it is against.
5. Does every zero look like a zero and every missing value like a dash? Does every count badge sit
   on a queue that needs action, with its noun clear from the label?
6. Does every legend swatch match the mark it explains, and does any caption have to say which bars
   are which (then encode it in the chart)? Does any label collide with a line or another label?
7. On the phone, is the navigation folded away, and does each block still answer its question?

Fix the worst three, inspect again, look again. Three rounds at most. Judge the pictures: if a problem
shows in a screenshot, it is real, whatever the code says.

### 2.8 Report

Tell the user, briefly: the style dealt (name and seed) and any redraws with their reasons; the face
you chose and the signature element; each screen's one question; any check you allowed and why (for example `--allow icon-chips` for node-type
tiles in a builder); and the sample data that must be replaced with real data, listed so it can be
found.

App screens have no motion floor. Motion is feedback: press, hover, focus, a menu or a sheet opening,
a row arriving. Nothing on the screen performs an entrance (house rule).

## 3. The shell

### 3.1 Five archetypes

| Shell | In the study | What it is |
| --- | --- | --- |
| **Open plane** | 5 screens | A labelled sidebar on the page ground (or within 1-2% of it), separated by nothing or by one 1px hairline. No top bar: the header and the cards sit on the ground. The canvas is fluid with a 24-64px gutter, or a centred column. |
| **Tinted frame, white sheet** | 8 screens | Sidebar and top bar share one tinted ground (#f6f6f6-#f9fbfc) with no rule between them; the page sits on a white sheet inset 8px from the window's right and bottom edges, radius 10-16 (median 16), a 1px #eaeaea-#ededed edge and no shadow. Variants: a flush L-frame, the inset sheet, and floating panels inset 8-12px with a 12px gap. |
| **Ruled T-frame** | 4 screens | A 210-240px sidebar and a 64px top bar on one ground, divided only by 1px rules. The workspace switcher sits at the top bar's right end behind a full-height divider. Three of the four are dark. |
| **Icon rail** | 3 screens | An unlabelled rail 50-60px wide (median 55); 15-18px icons on a 34-49px pitch; the active item marked by colour or by a 2% tint band; groups split by 20px hairlines. It saves about 180px of width. |
| **No sidebar** | 3 screens | A 46-48px top bar over a centred 1088-1208px column with 152-212px gutters; the logo sits on the column's left edge. For reports, viewers and products with few destinations. |

All six dark screens use one ground everywhere, divided by 1px rules of #161616-#232323 or by nothing.
No screen in the study puts a dark or saturated sidebar against a light canvas (0 of 17).

### 3.2 Sidebar

- **Width.** Labelled sidebars run 210-292px; the median is 230 and most sit at 224-240. One floating
  sidebar card appears (280px wide, 40px in from the window edge).
- **Rows.** A 32px hit area on a 34px pitch is the mode (7 screens); the roomy versions run 40-52px on
  a 42-60px pitch. Icons are 14-20px, median 16, outline at about 1.5px stroke on 14 of 16 screens.
  Labels are 14px at 400 on 12 of 16, in ink or in a grey of #4b4d4f-#63666e, about 8-10px after the
  icon, with the label column at x 36-48.
- **Active item.** A neutral grey pill with the label unchanged, on 8 screens: radius 4-16 (median 8),
  inset 8-14px from the sidebar's edges, a fill of about #e9e9e9-#ededed. On dark, brightness alone:
  the label goes from #bbb to #fff (3 screens). Colour alone on the icon or label (3, all of them
  rails or a floating card). A tinted accent fill (3). A left accent bar once in 23. The weight
  changes on 2. Default: the grey pill on light, brightness on dark.
- **Groups.** Sentence-case grey labels at 12-13px, never uppercase (9 screens), with 22-56px of air
  above and 13-33px to the first item; or hairlines instead (4). Utilities such as settings and help
  pushed to the bottom (5).
- **Top and bottom.** The workspace or account switcher at the top of the sidebar (7 screens), at its
  bottom (2), or in the top bar. The bottom holds a user row (8) or one upsell (8); one of those
  upsells is a filled accent button.
- **The product is named** (house rule, from testing). The product's mark and name sit at the top of
  the sidebar or rail, and the scope (workspace, team, project, account) is shown as a switcher or a
  breadcrumb. A screen whose product cannot be named from the screenshot reads as a template.
- **Counts on nav items** (house rule, from testing). A count appears only on a queue that needs
  action, and its noun is clear from the label: "Requests 5", "Price changes 3". A bare "Range and
  prices 9" left the judge asking nine of what.
- **Labels by default.** A labelled sidebar unless the product has five destinations or fewer and the
  screen needs the width (a research or monitoring view); an icon rail always carries the product's
  mark at the top, a tooltip and an accessible name on every icon. Nav items are other screens, never
  anchors into the current page (a sidebar that scroll-spies one long page was marked down twice).

### 3.3 Top bar

14 of 23 screens have one; the default is none. Heights fall into two groups: 44-51px (median about
48) on light chrome, and 64px, usually with a 1px rule. A top bar must hold something real: search,
the workspace switcher, or the page or object name. Search sits centred on the window at 548x32 with
a shortcut hint (2 screens), or at 457-537x36 in a no-sidebar bar. The right cluster is inset 24-46px
from the edge. Two screens leave about 1070px of their top bar blank; both are flagged for it.

### 3.4 Right rail and pinned columns

One screen has a right rail: a fixed 384px column in a `1fr 384px` grid with a 24px gap, starting
level with the first card rather than with the title, its section headings outside the cards and 8px
above each. Use one only for a stable secondary stream: recent items, the details of the selected
object, share links. A pinned left column appears once: a 306px accounts card at the viewport height
minus 72px, so net worth stays in view while the rest of the screen scrolls.

Five screens float a button (24-56px), and one of those buttons covers the content it sits on and is
flagged. House rule: no floating button unless it is the screen's one primary action and covers
nothing at any width.

## 4. The canvas and the page title

### 4.1 Width and gutters

- **Fluid** (14 screens): side padding 17-64px, median 29, with 24 and 36-40 the common values;
  content 1120-1312px wide, median about 1204.
- **Centred** (8 screens): 624, 864, 1088, 1100, 1152, about 1190 and 1208px; median about 1126.
  Data pages land at 1100-1250 either way. Only two personal homes go narrow (624 and 864), and both
  are flagged for wasting the width.
- **Top offset**, from the canvas top to the title: 20-88px, median about 36. Tools sit at 20-36;
  greeting homes at 50-88.
- **One gutter.** Use one gap value horizontally and vertically. Mixed gutters (12 against 16, 20
  against 24, 16 against 12) are flagged on 8 screens.

### 4.2 One left edge, one right edge

The strongest screens run a single left edge from the header to the last row. One indents its page
header by the cards' 24px padding, so the title, the card titles, the numbers and the chart all start
on one line. Row rules may bleed 7-8px past the text column while the text stays on it.

The grid's arithmetic closes: 3 x 372 + 2 x 17 = 2 x 568 + 16 = 1152; 12 x 77 + 11 x 16 = 1100;
4 x 144 + 3 x 16 = 624; a second-row card exactly as wide as the two cards above it
(251 + 24 + 515). Write your sum down.

Failures to avoid, all from the study: cards stopping 120px short of the sheet's right edge; a 0px
right gutter against a 40px left one; a column centred on the window instead of on the area beside
the sidebar (204px on its left, 444px on its right); a medallion 108px off the column's axis. The
inspector warns when the content stops well short of the right edge.

**Dead space from a grid that does not fit the data** is the commonest failure in the study (10
screens): four KPI tiles in a three-column grid, orphaning the fourth; one card alone in a
three-column row beside 810px of nothing; a card stretched to its neighbour's height with 250px of
blank under its legend. Choose the column count from the number of items, let a lone card span, and
do not stretch a card's frame over empty space.

**Cards that share a row share a bottom edge.** In testing, rows whose cards stopped 26-190px apart
were marked down every time, by judges and by the inspector (`ragged-row`). Balance the row by its
content first: move a list's rows so the two columns hold the same number, cap both lists at the same
count, or pair blocks of similar height. Two cards stacked in one column beside a tall card count as
one block: they balance when the column ends level. Only when the contents cannot balance, stack the
two blocks, or let the shorter card fill the row height with its content top-aligned and the footer
action (a "View all", a total) pinned to its bottom so the extra height is not a hole.

**A stretched card stretches only when it has content to fill.** Only an action or a total may be
pinned to a stretched card's foot; a legend or a note stays directly under its chart. In testing, a
cover card stretched to its neighbour with its legend pinned to the bottom left 60px of blank under
the last row, and a sell-out card left 45px above its links. When the content is short, let the card
keep its own height (`align-items: start` on the row), move its footer link into its header, or give
the row a block of similar height. A filtered block shrinks to its rows, or keeps a fixed number of
rows with one sentence in the empty ones; four rows over 270px of empty card is a hole. The inspector
warns on a blank band of over 40px inside a card (`panel-void`).

**Narrow blocks do not span the canvas.** A table of five columns or fewer, or a list of six rows or
fewer, runs to about 760px at 1440 and pairs with the next block; stretched to 1300px it leaves
400-600px voids between a name and its first figure.

### 4.3 The title

- **Every screen has one h1**; the inspector fails a screen without one. 14 screens set it in the
  canvas at 18-48px, median and mode 24, at 600-700 (700 on 8). The rest have nothing over 16px: a
  breadcrumb or the top bar names the page. Then the breadcrumb's last item is the h1, at 16px, and
  the screen's name is still the first thing read.
- **A noun, not a greeting**: "Analytics", "Overview", the project's or the object's name. 3 of 23
  greet, and one adds an emoji, which goes. A greeting suits a personal or team home only.
- **An optional second line**: one 14-16px grey sentence about the data or the object (the finding,
  the period, the scope), never about the interface ("the filters narrow every block…", "this page
  shows…" read as instructions, not a product), or a 12px line
  naming the data's source.
- **Right of the title**: actions only when they are real (10 screens); otherwise nothing. A freshness
  stamp ("Updated Jul 27, 4:09 PM", with a refresh button) on 6.
- **The primary action.** 12 of 23 have no filled primary button; 5 make it near-black (#1d1f20,
  #1f2937) or inverted white on dark; 4 fill it with the brand hue. One primary per screen.

### 4.4 Tabs, filters and the date range

- **The date range** at page level (7 screens) or on each card (7), never both. A card that states its
  own period puts it in its header, right-aligned, in grey.
- **Underline tabs** (8 screens) always sit on a full-width 1px rule; the indicator is 1-4px (median
  2), as wide as the label or running 8-11px past it.
- **A segmented track** once: 48px, #f3f4f6, a white 36px active pill, and the date select inside its
  right end, so tabs and range read as one row. A segmented control is as wide as its options, and full
  width only below about 480px: three options spread across a 680px tablet card read as a progress bar.
- **Control height** in title and filter rows: 28-40px, median 34, clustering at 32 and 36.
- **Order**: scope on the left (the date first, then the filters), utility and refresh on the right.
- **Compound filters** that read as a sentence ("Date | Jun 14 - Jul 13 | Daily"), 28px tall and 8px
  apart, once.
- **To the first card**: 13-64px, median 24.

## 5. KPIs

- **No tile of its own.** 11 of the 20 screens with headline numbers give a KPI no tile: bare text on
  the page or on a card (5), or one container split by 1px hairlines (6). 9 use one card per KPI,
  61-147px tall (median about 108). The default is one container split by 1px dividers into equal
  columns. 7 screens have no KPI row at all and put each headline number in the card that explains
  it, which is often better.
- **Count.** 1-6 per row, median 3-4. The count matches the grid: four KPIs get four columns.
- **Size.** Values 16-40px, median 26, mode 24. Values in their own tile run larger (median 30) than
  in a shared strip (median 24). Nothing at 48px or over. Labels 12-16px, median 14; the value is
  about 1.7 times the label.
- **Weight.** An even split: 400 on 8 screens, 600 on 6, 700-800 on 6. A large number at regular
  weight under a semibold label is the common pattern. Bold for money only.
- **Order.** Label above the value on 14 screens; labels grey (#6b6b6b-#aaa) on 13; sentence case.
- **Nothing else.** No icon in a coloured circle (0 of 23), no sparkline (0 of 23), no tinted tile.
  An info icon beside the label is fine (5 screens). Units are a smaller grey suffix: "5 mins" at 24
  over 14, "2 m 24 s", "5 /10".
- **The answer figure leads.** When one figure is the screen's answer (a balance, net worth, the
  portfolio's value), it is 30-36px and at least 1.3 times its sibling figures (those at 18-24px). In
  testing, a 24px portfolio value beside two 24px figures left the screen without a lead. No other
  figure on the screen is larger: the biggest number answers the title row's sentence, so a
  secondary ratio in another card stays at the siblings' size.
- **One figure, one place.** A figure shown in the strip is not repeated in a legend beside it, and a
  KPI strip whose every cell names a panel below (RSVPs, then an RSVPs panel) is dropped: lead each
  panel with its own number instead.
- **A second job.** KPIs may be the chart's series tabs or the list's type filter (the selected card
  takes a 1.5px border). As tabs, the selected one carries a 2px rule or the active fill and an ink
  label; the others keep a grey label and their value in ink, at 400 against the selected one's 500.
  A grey value reads as disabled: in testing, three shops' takings set in grey because they were tabs
  read as secondary, though they were the brief's first ask. When the tabs are the per-entity
  breakdown the brief asks for, grey nothing and let the rule alone mark the selection. On a phone the
  tabs become a 2-up grid with the selected cell filled, or a row that scrolls sideways; never an
  underline floating inside the grid (`app.css` does both).

### Deltas

- Optional: 9 of the 20 KPI screens show one; 11 do not.
- 10-15px (median 14), never larger than the label. Text or a small glyph on 6 screens; a pale pill
  on 3.
- **The window in words**: "vs prior 30 days", "in the last 90 days", "from 0 (last 4 weeks)" (7 of
  the 9).
- **Colour only the number**, or set the whole delta in grey.
- **Colour says good or bad, not up or down** (house rule, from testing). Every metric has a good
  direction: latency, error rate, cost, churn and time-to-reply are better when they fall. A change
  in the bad direction puts `--negative` on the number (or a small down-pointing glyph in that
  colour); a change in the good direction is `--positive` or grey. A judge read a 2.5× rise in errors
  set in the same grey as a rise in visits as hiding the screen's only bad news.
- **Zero or undefined change is grey.** The study's commonest KPI failure is a zero or undefined change
  shown as a signal: three identical green "up 100%" pills grown from zero, a ">999%", a bold red
  "0.00%", a green "+0". When the prior period was zero, write "+4 (new)"; when there is nothing to
  compare, a short grey dash where the delta would be.

## 6. Charts

### 6.1 Which chart for which question

| Question | Form | In the study |
| --- | --- | --- |
| Is it moving over time? | One line; an area only with a fill of 15% or less | 9 screens |
| How much per period? | Columns with square corners | 3 |
| How is it distributed? | A histogram with equal bins | 1 (its unequal bins are flagged) |
| Who ranks? | A sorted horizontal bar list, or the row's fill as the bar in a one-figure list | 3 |
| What share? | A thin ring, or a 100% stacked bar with 2px seams; five parts at most | 5 |
| How far to the target? | A progress bar, both ends labelled, the fill the true ratio | 4 |
| How much of the plan is used? | A track as long as the plan, the spent part filled, what is already committed as a lighter segment, an overrun past the track's end in the negative colour (`Charts.plan`) | house rule |
| Has it drifted from its target? | One row per part: the current share as a bar with a 1px tick at the target (`Charts.bullet`); never two stacked bars to compare | house rule |
| Where? | A map with a list beside it; the list carries the magnitudes | 1 |
| Per period, and the running total? | The two side by side at equal width, with the same dates | 1 |
| Which way did it flow, and how much? | Columns above and below one zero line on one scale, the axis signed and captioned on each side ("Sold" above, "Bought" below), a marked period in a second tone with its own legend entry (`Charts.diverging`) | house rule |
| Who is away when? | A timeline of people by day, each kind of booking its own mark (`Charts.timeline`) | house rule |
| Is there enough cover? | A team-by-day matrix of slack against the minimum (+2, +1, 0, −1), one hue ramping toward the negative colour, the headcount on hover (`Charts.matrix`) | house rule |
| When in the day, against last time? | One row per item on a shared opening-to-closing axis: a 2px grey track, an ink dot for today, a hollow tick for the comparison day (`Charts.timeStrip`) | house rule |

Three more, from testing:

- **The pair of per-period bars and the running total is used once per screen**, and only when the
  total crosses a line that matters (capacity, a target). Three such pairs in six charts read as one
  pattern stamped out.
- **A series that is flat except for one event** gets at most two-thirds of the width and about 140px of
  height, or a range capped at about twice its reference line with the off-scale peak labelled
  (`Charts.line({ max })`). A full-width plot that is 85% empty was the biggest block on a first
  screen and was marked down.
- **A forecast is not a fact**: after today the line is dashed and the end value is labelled
  (`Charts.line({ today, endLabel })`), with the gap to the target bracketed when there is one.
- **What the brief asks to see over time is drawn on the first screen.** KPI cells may switch the chart
  only between metrics the brief did not name.

When there are only a few numbers, draw no chart: four screens skip it, and the settings page links
to the analytics screen with "View more".

### 6.2 One question, one series

One series per chart is the norm; three is the most any screen draws. To show another metric, switch
it with a control (a segmented control, a dropdown, the KPIs as tabs) instead of overlaying lines.
Plots run 112-264px tall (median about 195) and 316-1136px wide (median about 570), an aspect of 1.8
to 5.2.

### 6.3 Axes and gridlines

- **Gridlines** run horizontally only on 7 of the 12 cartesian charts, both ways on 3, and not at all
  on 2. Use 3-5 (the study runs 3-7, median 4-5): 1px, solid, about #e5e5e5 on light (range
  #cfcfd2-#f2f2f2), #2b2b2b on #111. Dashed lines are allowed in chart grids (4 screens: 3/3, 4/4,
  3/2.5) and nowhere else on the screen.
- **No y-axis line.** The baseline is the one heavier line (2px on two screens, 1px on one); full axes
  on one.
- **Y ticks**: 4-7, median 5, at 11-16px (median 12) in grey (#5f5f5f-#6c6c6c), on the left (8
  screens) or the right (2). Round, even steps (0/5/10/15%; 0-600 by 150), the top tick above the
  maximum, integers for counts, and zero as the baseline for bars and counts.
- **Never without a scale.** Two screens draw no y-scale and show magnitude only on hover; both are
  flagged. So are uneven ticks (0/3/6/10), a 0.8 tick on a count, a top tick equal to the maximum so
  the line hits the plot's edge, and a cumulative axis that starts at 1.
- **Axis text no larger than the data.** 15-16px ticks beside 14px values are flagged as louder than
  the numbers.
- **X labels**: 4-8 per chart, flat, never rotated (40 degrees is flagged), the first and last pulled
  inside the plot, on one step all the way: a forced closing label after 14:00 on a 90-minute step
  left a short last gap that a judge measured. Choose a step that lands on the end (hourly from 08:00
  to 15:00) or leave the end unlabelled. Labelling only the two ends hides when things happened. Irregular dates on a
  categorical axis are flagged: time goes on a time scale.

### 6.4 Marks

- **Lines** 1-3px, median 2, in straight segments. Four screens smooth their lines, and one smoothed
  curve invents values between daily totals (flagged), so draw straight segments. No point markers,
  except a hover dot (8px on one screen).
- **Fill**: none on 7 of 10 time charts. At most a flat tint of about 14%, or a fade from the line to
  transparent over 150-200px.
- **Bars** have square corners (4 screens), or at most a 4px top radius with a square bottom on the
  baseline. Stacked segments are split by a 1-2px seam.
- **Colour.** One hue per chart. The accent touches only data on 8 screens, and data ink is under 3%
  of the pixels on most. Neutral series are fine and often better: a near-black line that turns pale
  grey after the cursor; a white line against a red one; signs instead of colour ("+$24,000,000").
  But the one hue, when the style has one, goes on the screen's main data element (today's series,
  the booked bars, the current period, the margin that breaks), not on a secondary chart or a delta:
  in testing, an all-ink screen with no hue on any of its data read as a kit.
  One subject keeps one hue across the screen: the same subscribers drawn pink in one chart and indigo
  in the next is flagged. Unrelated hues on one screen (three, five) are flagged every time. Status
  colours are for status. The inspector warns over four hues and fails over six.
- **Legends.** None for a single series (9 charts): the title or the dropdown names it. Otherwise five
  items at most, as a 5-8px dot with a 12-14px grey label in the card's header, or as a small table
  (dot, name, value, change) that makes the legend carry data. Never list a series that has no data
  (flagged). Every swatch is the mark it explains, scaled down: the legend dot is the line's colour,
  a hatched bar's swatch is hatched. A swatch drawn separately from the mark drifted from it in testing
  (a black outline with a red edge explaining a red outline); the helpers return the legend built from
  the same style object as the marks.
- **Rings** only for three to five parts of a whole that are not already listed beside them (a ring
  redrawing the spent, due and left figures of the tile next to it was marked redundant). Never
  labelled on the slices; the total sits in the centre or beside the ring. The
  screens noted for their rings use thin strokes: 3-5px on a 90-154px ring, 8px on 182px. Two others
  use 28 and 37px.
- **Progress bars** are 4-24px tall (median 8), fully rounded, with both ends labelled ("Skilled 200"
  and "Expert 2,000"); the fill is the true ratio, so 303 on that scale fills 22px of 392. A zero has
  no stub (a 6px stub at zero is flagged).
- **Tooltips** are bare text or a plain box without an arrow: label and value on one line.
- **Annotate the event that matters.** A step or a spike more than about three times the usual change
  gets a 1px marker and a 12px label naming its cause ("Deploy a3f09c1", "Newsletter featured");
  reference lines (a budget, an SLO, a start time) are 1px dashed with their label at the end. In
  testing, an unexplained jump was the first thing a judge asked about. `Charts.line`,
  `Charts.bars` and `Charts.diverging` take `annotations` and `reference`.
- **Labels never collide.** Annotation labels sit in rows above the plot, each beside the top of its
  own leader line, and no leader line runs through another label; the rows are reserved only when a
  label exists, so a chart without one has no dead band above it. The "Now" label of a forecast goes
  on whichever side of its line the series does not cross. Lay labels out after the fonts load, or
  the label set changes between loads (it did in testing). The helpers do all of this; give a label
  that may not fit a `short` form.
- **Use the helper, then extend it.** Draw charts with `assets/charts.js` and add what a chart needs to
  it, rather than writing new axis code: in testing, every chart written from scratch on a phone put
  its y labels on top of its line.
- **Short and empty histories are drawn honestly**: a flat zero line with one spike, missing bars for
  empty periods, no padded y-range, no "No data" picture. Do not give one point the screen's largest
  plot, though: a lone dot in a full-size grid reads as barren (flagged once).

## 7. Tables and lists

### 7.1 Rows

- Single-line data rows: 36-53px, median 45.
- Two-line rows with media: 56-92px, median 72. The pitch is the media's height plus 24-32px
  (48 + 24, 48 + 32, 50 + 30).
- Key-value and legend rows inside cards: 21-32px.
- In a two-line cell, line 2 sits about 21px below line 1 (19-23), one size smaller (12-14px) and
  grey. Two-line labels need a 40-44px pitch at least: on a 32px pitch a subline nearly touched the
  next row's name and the list ran together (house rule, from testing).
- Overview lists show 2-5 rows.

### 7.2 Header

- 11-14px, median 12, mostly regular weight, grey, sentence case (9 of the 11 headed tables). The one
  uppercase header in the study is flagged as louder than the data.
- **No fill band** (0 of 11) and **no rule under it** on 8 of 11. Where there is a rule, it is the
  strongest line in the table (#e5e7eb over #f3f4f6 row rules).
- Header row 36-40px.
- Numeric headers are right-aligned and flush with their values; a header that stops 15px short of
  its column is flagged. A header over a control aligns with the control it labels (centred over a
  column of steppers), and a delta beside a stepper gets its own narrow unlabelled column; three
  alignments in one header row were flagged.
- A sort glyph on the active column only.

### 7.3 Dividers

- **No zebra striping** (0 of 23).
- No row dividers on about half the lists; they rely on a 61-92px pitch or on 2-8px gaps between
  filled rows.
- When present: 1px, 3-7% darker than the surface (#ededed-#f4f4f4 on white; #161616 on #000,
  #1b1a1f on #131217).
- Extent: bleeding 8-9px past the text edge; starting at the text column and skipping the media; or
  the full inner width. Pick one per screen.

### 7.4 Figures and alignment

- **Numbers right-aligned**, in tabular figures or a monospace. Every left-aligned numeric column and
  every column of proportional digits in the study is flagged (durations "00:00:12" and "00:00:04"
  that jitter, cents that drift).
- **Fixed decimals per metric**: money 2, percentages 1 or 2, counts none. Thousands separators
  everywhere ("$16,531.54"); abbreviate only in a capacity line ("12.7k of 20.0k"). A sign on every
  change ("-$0.09", "+10,100 (+0.20%)"). No space after the currency sign (one screen's "$ 89.00"
  beside "$15.00" is flagged).
- **The identity column gets the most width**, about a third to a half of the table, and it is never
  the one cut off at desktop width: shorten names editorially first (drop the issuer every row
  shares, the share class, "Ltd") and use the same short name at every width.
- **One right edge per row or card**: every right-aligned figure inside a card or row ends on the same
  padding line (a days-in-stage figure 18px short of the value above it reads as a second edge).
- **Two measures stack in one cell** rather than taking two columns: a count over its 12px grey
  percentage, a date over its time, a money value over the amount in units, both lines on one right
  edge.
- **Dates** in ISO form and right-aligned where rows are compared ("2024-02-15"); in words for
  recency ("Today", "Yesterday", "6 days").
- **IDs** in a monospace at body size, truncated to about 8 characters with an ellipsis and a copy
  icon 12px after.
- Truncate to one line with an ellipsis; never break inside a word.
- **A breakdown in a narrow card** ("Headingley 6 · Chapel Allerton 5 · Meanwood 3") goes in fixed
  mini-columns, or each item is `nowrap` with its separator attached to the next item, so no line ends
  on a dangling "·".
- **An edited cell shows that it changed** (house rule, from testing). In an editable grid a changed
  value carries a mark (a dot, a tinted border), and the column header or a caption names the
  baseline ("vs the usual Monday"); a bare grey "+5" beside a stepper was read as noise.

### 7.5 Ink inside rows

- Only the identity and the key number get the primary ink; everything else is grey ("5" in ink,
  " /10" in grey).
- A missing value is a grey dash; a real zero is printed ("$0", "0.00%", "0% (0)").
- The sign lives in the text, not in the colour: income green with a "+", expenses in ink, no red on
  every negative.
- Link colour on the name cell only, with no underline.

### 7.6 Status pills

- 15-28px tall (median 20), text 9-14px in the study (median 12) at 500; nothing under 11px here. A
  full pill or a 3-5px tag.
- A pale tint with dark text of the same hue, optionally a 1px border one step darker: #dcfae5 with
  #04250e, #ffedea with #831c1e.
- Neutral states are monochrome chips with a glyph ("Public" with a globe).
- A state machine uses one hue at three intensities: grey for off, the full hue for the call to
  action, a dark tint for running. A saturated fill with white text only for that one call to action,
  and only while it is rare: when more than about a fifth of the visible rows carry it, it becomes a
  stripe of black blobs louder than the data (marked down in testing); use the pale pair or a 6px dot
  with an ink label instead.
- **One status mark per row.** A tag and a badge that say the same thing are flagged.
- **A chip is never squeezed.** Tags and pills are `flex: none; white-space: nowrap`: in testing a
  table column collapsed an environment chip to a 12px box with its word spilling out.

### 7.7 Media

16px logos in dense rows; 24-32px avatars; 48-50px in two-line rows. Circles for people, tokens and
companies; a 2-3px radius for artwork and flags; 8px for photographs. One fixed media slot down the
list so the text starts on one edge (a 50px slot with the text 16px after it). Media-to-text gap
10-16px, median 12.

### 7.8 Actions and paging

- **No pagination on an overview** (0 of 23). Cap the rows and link out: "View all" in the section
  header, a 30px outlined button under the list, a full-width 32px bar. State the total ("3 tracks").
- Row actions: none on 9 screens; otherwise one kebab at the far right. Reserve a trailing action
  column only when most rows carry the action; otherwise the action is an ink text action on the
  row's second line and the figures stay flush to the card edge. When a row needs doing
  (a bill to pay, an order to pack, a failed deploy), its action is a visible ghost button or an ink
  text action in one fixed trailing column, at the same pitch for every row; never muted grey text,
  and never stacked under the amount so the rows change height.
- Checkboxes only where bulk actions exist (one screen: 18px, 2px stroke, 3px radius).
- Hover and selected: a 1px outline at 6px radius overhanging the panel by 1px, or a darker border
  with a 1px ring. No hover that changes the fill was seen. In a list that drives a detail pane (an
  inbox, a queue), the selected row takes the `--active` fill of the nav pill instead, so it cannot be
  mistaken for a focus ring or a hover (house rule, from testing).
- Toolbar: one search, 30-36px tall (256x30, 252x36, 316x32).
- **A full list screen** (house rule; the study has none): state the total above the table, keep the
  header row in view while scrolling, and page or load more at the end with the range shown
  ("1-50 of 1,284").

### 7.9 Lists that carry data

- **The row fill is the bar**: the row's rounded background (radius 8) as wide as its share of the
  largest share; 44px rows, 2px gaps. Only in a one-figure ranking list (a label and one value): in a
  row with several columns or two lines, the fill's edge cuts through the words (failed in testing).
  Planned against spent is a separate 6-8px track under the label (`Charts.plan`).
- **Bar list**: a 64px pitch, a label line, then a 10px pill bar with the value 5px after its end; the
  longest bar about 88% of the width; one colour, no track.
- **Inline bars in a list are thin and grey** unless they are the screen's main series: 2-3px at
  most. A ranked list of money in a narrow card carries a 2px proportional bar under each label, grey
  with the top item in ink (`Charts.barList(el, rows, { thin: true })`), so "most costly first" is
  seen and not only read. In testing, six 4px black bars were the loudest marks on the screen.
- **A timeline draws its comparison.** When the brief asks "against last Sunday", the comparison is a
  mark on the same axis (`Charts.timeStrip`: an ink dot for today, a hollow tick for the comparison
  day), not only a line of text.
- **Legend as table**: dot, name, pill, value and change on a 57px pitch.
- **Key-value well**: a tinted well, radius 8, 32px rows, label left, figure right.
- **Feed as row cards**: 63px tall, 8px gaps, radius 14, a fill one step lighter and a border one step
  darker than the panel, a relative date on the right.
- **Tree**: no dividers, 8px of indent per level, ink against grey by level, a pitch of about 30px,
  about 45px between groups.

## 8. Forms and settings

The study holds forms on three screens and one settings page, so this section rests on little. It is
enough for the defaults.

### 8.1 Fields

- **Label above the field**, 14px at 500, 8-10px gap. No floating labels and no placeholder standing
  in for a label.
- **Inputs** 38-40px in forms (radius 8-10); toolbar and filter controls 28-40px, median 32. One
  control height per context.
- Inputs stay white with a 1px #e5e7eb-#e8e8e8 border even on a grey panel; filter and select
  controls take a border one step darker (#cdcfcf-#d1d5db).
- A leading icon at 14px, 13px in from the edge, with the text starting at 38px.
- **Spacing**: 24px from a description to the first label, 16px between fields, 16px to the Save
  button.
- **A joined input and action** (a read-only link and its Copy button) share a border and square
  their inner corners.
- **Toggles** 28x16 to 33x20. The on colour is a semantic green or near-black, not the brand accent.
- **Disabled** controls stay legible and say why they are disabled: the study's disabled Save
  (#cecece on #f4f4f4, about 1.4:1) and its plan-locked panel at 30% opacity are flagged as
  unreadable.

### 8.2 Settings layout

- Each section is a row: a label column (about 450px: a 16/500 title and a 14px grey description)
  beside a panel (about 700px, #fafafa, radius 16, padding 16, no border, no shadow). The title's cap
  top aligns with the panel's first line, 6-8px below the panel's top.
- Sections are split by a full-width 1px rule with 32px above and below.
- A switch row: a 14/500 title, a status badge 8px after it, a 14px grey description, and the toggle
  on the right, 16px from the edge and centred on the title line.
- A plan-gated feature: a 48px tinted strip with a 32px button directly above the locked panel; the
  panel stays readable.
- Narrow containers stack: label, 10px, field, then 26px to the next pair.
- Do not leave the label column empty beside a tall panel (a 250px void is flagged): put the section's
  help or a summary of its current values there, or narrow the column.
- **Destructive actions** (house rule; none in the study) go last, in a section of their own, as a
  text or outlined button in the negative colour, with the consequence in words and a confirmation
  that names the object.
- **One view per area** (house rule, from testing). When settings span several areas (general,
  members, billing, notifications), each sidebar item opens its own view (a hash route is enough in
  a static build), with the area's name as the h1. One long page of every area, with the sidebar
  scrolling to anchors, put the first area the brief named four screens down and was marked down.
- **One save model per view**: every control saves itself and shows a quiet "Saved" stamp, or one
  Save per panel at the panel's bottom right. Never a mix of both on one view.
- **Show what the setting produces.** Beside the control that changes it, a small preview of the
  result (the invite email, the notification as it will arrive, the plan's next invoice) is the
  product-specific substance a settings screen otherwise lacks.
- A settings view opens with a usage strip only when usage is its question (a plan or quota view),
  and its figures stay smaller than its h1.

### 8.3 Buttons

Controls run 27-40px tall (median 34; 32 is the commonest), with a 6-8px radius in the tight styles
and full pills in the soft ones. One filled primary per screen, usually near-black; a secondary is
white with a 1px border; a tertiary is text. The controls in one row share one height.

## 9. Type and colour

### 9.1 Type

- **One grotesk.** All 23 screens use a neo-grotesk, and 14 use that one family alone. A second face
  always has one job: a monospace for every number or for IDs only, a serif for one greeting, a brand
  face kept to the wordmark or the switcher. Never three. Axis ticks, chart notes and labels stay in
  the text face even when IDs are in a monospace.
- **App type is not display type.** The h1 stays at 18-32px and no figure reaches 48px: in testing, a
  50px serif title and a 76px balance made a budgeting screen read as a landing page (the inspector
  warns at 34px and 48px).
- **Sizes**:

| Role | Range in the study | Median |
| --- | --- | --- |
| Page title | 14-48 | 24 |
| KPI value | 16-40 | 24 |
| Card title (500-600) | 14-24 | 16 |
| Body, nav, cells | 13-16 | 14 |
| Labels, meta | 11-14 | 12 |
| Axis ticks | 11-16 | 12 |
| Pills, badges | 9-14 | 11-12 (house floor 11) |

  A screen uses 4-9 sizes, median 6. The cleanest scales in the study are 12/14/18/24, 12/14/16/30
  and 12/14/16/24.
- **Weights**: a median of 3 per screen; 10 of 23 never go above 600; 700 does one job per screen
  (money, the greeting or the title).
- **Figures**: tabular on every number in a table, in a KPI, or anywhere it updates. Check that the
  face really has tabular figures: `font-variant-numeric: tabular-nums` must change its digit widths;
  if it does not, take another face.
- **Case**: sentence case on about 19 of 23; uppercase content labels on 4 only. Tracking 0, and
  negative only on large type (-0.02em at 32px). Line height 20px for 14px text, 24px for 16px.
- **Dark** screens set body at 13px on three, and titles at 18-20/600 or 26-28/700.

### 9.2 Colour on light screens

- **Ground models**: white cards on an off-white ground (10 screens; #f3f5f7 to #fdfdfd, median
  #f9f9f9-#f9fafb); grey panels on white (6); a framed sheet (7).
- **The sidebar is never dark or saturated** (0 of 17): it matches the page, sits 1-3 levels off it,
  or is white on a grey page.
- **Lines in three steps.** Card edges median #eaeaea, the working band #e5e7eb-#ededed (about 1.2:1 on
  white). Row rules one step lighter, #efefef-#f4f4f4. Control borders one step darker, median
  #d1d5db. #cbcecd on cards reads heavy; #f5f5f5 disappears.
- **Text in three tiers.** Primary about #111 (range #000 to a tinted #272446). Secondary about #606060
  (#3a3b3b-#8e8e8e). Tertiary in the study runs #969696-#9f9d9b and placeholders #9ca3af-#b0b2b6,
  which is 2.5-3:1 on white and under the house floor. House rule: every tier that carries words
  reaches 4.5:1 on the surface it sits on, placeholders included; #6b6b6b is about the lightest grey
  that holds on white and on #f9fafb.
- **Accent placement**: on data only with greyscale chrome (4 screens), on actions only (2), or no
  accent at all (2). The primary button is usually near-black. Every screen with more than one accent
  family is flagged.
- **Status**: positive greens in the study run #16a34a-#40a670, which is under 4.5:1 as text; use a
  darker green such as #247b50 (5.2:1) for text, and the pale pairs for pills: positive #dcfae5 with
  #04250e, negative #ffedea with #831c1e, a notice #fffbeb with a #fde68a border and #92400e text, a
  count badge #c4242a-#dc3532.

### 9.3 Colour on dark screens

- **Ground**: #000 (3 screens), #111 (2), #171719 (1). No navy and no slate.
- **Surfaces**, three ways: a lighter step with no border (#111 on #000, nested panels at
  #222-#2a2a2a); the ground's own fill with a 1px line (#2e2e2e on #111); darker than the ground with
  a soft shadow (once: #131217 on #171719 with 0 12px 28px rgba(0,0,0,.2)).
- **Lines**: structural lines 22-31 levels above the ground (#1a1a1a on #000, #2e2e2e on #111,
  #222224 on #171719); interactive outlines brighter, #373737-#4c4c4c, so an outlined button reads as
  clickable without a fill.
- **Text**: #fff; secondary about #aaa (#82848a-#bbb); tertiary about #888. #4c4c4f (about 2:1) is
  flagged. The house floor of 4.5:1 holds here too. Two greys at most, and far enough apart to read
  as two: about #b4b4b4 for secondary text and #949494 for meta (in testing, #aaaaaa, #969696 and
  #bbbbbb on one screen read as one grey used three ways).
- **Accent** on data only, or on one selected state. Active nav by brightness. Emphasis without
  colour: an inverted white pill, a grey-filled button (#212121), an outline.
- **Status** as a hue on a dark tint of itself: #3fc07a on #172a1d; #44a282 on #1b2828. **When the
  accent is green or yellow-green, `--positive` is the accent** (a lime accent: lime on a dark lime
  tint), or the sign carries the meaning in neutral ink; a mint "+£3.81" beside a lime "Sold" read as
  two greens. The same holds on light screens.
- **Colour share** at or under 3% on all six.

### 9.4 Surfaces, radius, icons, spacing

- **Edges.** A 1px border separates surfaces on 12 of the 17 light screens; three use a fill step
  alone and one a shadow alone. A border or a shadow, never both. The shadows that exist are faint
  (alpha .06 or less at 0 2px 8px; once 0 1px 4px at .12). Real shadows are for what floats: a menu,
  a popover, a tooltip, a composer.
- **Radius is bimodal**: tight, 4-8px (9 screens, plus square cards on one), or soft, 16-24px (10);
  11-12px on only 3. Controls follow the cards: 6px with tight cards, full pills with soft ones.
  Nested radii step down (20, 10, 8, 5, 4). The inspector warns over three panel radii.
- **Group, don't box.** A set of KPIs is one card split by 1px dividers, or a bare strip with 48-52px
  vertical dividers.
- **Icons**: outline on 22 of 23; nav icons 14-20px (median 16) at about 1.5px; inline icons 12-14px;
  about 10px to the label; grey (#454545-#73737f in a light nav, white or #81858a-#999 on dark). Never
  in a saturated circle (0 of 23). A container, if any, is neutral (a #f0f0f0 disc) or codes a node
  type in a builder.
- **Spacing** on a 4px base: card gap 6-24px (median 16); card padding 12-34px (median 20); section
  gap 24-64px; control height 27-40px (median 34).

### 9.5 Default tokens

Each style in `library/app.json` carries its own tokens. These are the study's medians for anything a
style does not set, with the greys moved to pass 4.5:1.

The names match the sheet `draw.mjs --app` prints and `assets/app.css`, a neutral start set to these
defaults (shell, title row, panels, the divided KPI strip, tables, pills, controls, tabs, empty states
and the phone fold). `assets/charts.js` draws the charts of §6 in SVG from your data (line, bars,
diverging columns, ring, bar list, plan, bullet, timeline, cover matrix and time strip), with these
rules built in and its colours read from these tokens.

```css
:root {
  /* light */
  --ground: #f9fafb;  --surface: #ffffff;  --raised: #f9f9f9;  --active: #eeeeee;
  --border: #e8e8e8;  --rule: #f2f2f2;     --control: #d1d5db;
  --text: #111111;    --muted: #5f6368;    --faint: #6b6b6b;    /* placeholders use --faint */
  --primary: #1d1f20;                      /* near-black fill, white label */
  --accent: /* one hue, about 3% of pixels: the data, plus at most one control */;
  --positive: #247b50;  --pill-positive-bg: #dcfae5;  --pill-positive-ink: #04250e;
  --negative: #c4242a;  --pill-negative-bg: #ffedea;  --pill-negative-ink: #831c1e;
  --pill-warning-bg: #fffbeb;  --pill-warning-ink: #92400e;  /* notice border #fde68a */
  --grid: #e5e5e5;  --chart-span: 0.06;  /* the opacity of a shaded span in a chart */

  --radius-card: 8px;  --radius-control: 6px;  --radius-chip: 4px;  /* soft styles: 20 / 14 / 999 */
  --gap: 16px;  --card-pad: 20px;  --pad: 24px;
  --nav-row: 34px;  --control-height: 32px;  --row-height: 48px;
  --font: "Inter", system-ui, sans-serif;                            /* one grotesk */
  --fs-title: 24px;  --fs-section: 16px;  --fs-kpi: 24px;  --fs-body: 14px;  --fs-small: 12px;
}
:root[data-theme="dark"] {
  --ground: #000000;  --surface: #111111;  --raised: #222222;  --active: #222222;
  --border: #1a1a1a;  --rule: #161616;     --control: #444444;  /* on a #111 ground the border is #2e2e2e */
  --text: #ffffff;    --muted: #b4b4b4;    --faint: #949494;  /* two greys that read apart */
  --primary: #ffffff;                      /* inverted: white fill, black label */
  --positive: #3fc07a;  --pill-positive-bg: #172a1d;  --pill-positive-ink: #3fc07a;  /* a green accent replaces these */
  --negative: #e5566f;  --pill-negative-bg: #2c1a20;  --pill-negative-ink: #e5566f;  /* the study's #d4405d, lifted for 4.5:1 */
  --grid: #2b2b2b;  --chart-span: 0.12;
}
.num { font-variant-numeric: tabular-nums; }
td.num, th.num { text-align: right; }
```

## 10. Density

- The studied screens hold 6 to about 120 data points, median about 25.
  - **Sparse** (6-25): homes, settings, a single object. Card padding 20-24px, rows 56-92px, body
    14-16px.
  - **Medium** (25-50): analytics overviews, finance homes, list screens. Rows 44-56px, padding
    16-24px.
  - **Dense** (about 120, one screen): research and monitoring, read in long sessions. A 13px body,
    28px list rows and 42px table rows, framed with generous air: 100px gutters, 64px between bands,
    32px of card padding.
- Density is three settings moved together: row pitch, padding and type size. Do not shrink the type
  and keep the padding.
- **Placed space reads as calm; leftover space reads as unfinished.** In the study, emptiness looks
  deliberate when it comes from a fixed grid and repeated gaps, and accidental when it comes from a
  grid that does not fit the data, a column that is empty in every row (a 300px dead band), a mostly
  empty top bar, or a card stretched to its neighbour's height.
- **Design for the data the account has as well as the data it will have.** Several studied screens
  were built for a busy account and show a new one: a 673x240 plot for a line that sits on zero for
  two thirds of its length. Keep the honest drawing, but size the block to the question, not to the
  data the product hopes for.

## 11. Empty, zero, loading and error states

- **A real zero** is printed in the normal style: "$0", "0", "0%", "0.00%", "0% (0)" (10 screens). A
  zero may be dimmed to grey when the caption beside it becomes the next step ("$0.00", then
  "Automate your savings with up to 3.50% APY").
- **Missing or not applicable** is a grey dash: an em dash, a "-", a 6x2px mark. Never a dash at full
  value size: "--" at 24px reads as loading (flagged).
- **Counts follow the view, and so does the frame.** Counts shown in scope (tabs, KPI tiles, "12
  open") are computed from the rows in the current view or filter and recomputed on every switch. A
  filtered block shrinks to its rows and its row-mate aligns to the top, or the block keeps a fixed
  number of rows with one empty-state sentence; each view's subline is computed for that view.
- **An empty side card fills with the reference data**, not one dashed box in 400px of white: before
  anything has sold out, last Sunday's sell-out times as a quiet list under "Nothing has sold out yet
  today".
- **Red is a signal, not a texture**: one red mark per object at most, on the overdue or failing fact;
  thirteen red strings on one board read as noise, and a list of deals needing attention does not
  repeat the same flags on the board beside it.
- **An empty section keeps its frame and its header** and adds one sentence spanning the block (in a
  row grid, `grid-column: 1 / -1`; a message squeezed into one 34px column broke word by word in
  testing): a 1px dashed box, radius
  8, about 38px tall ("No channel usage in this range."), or a bordered box with an add link
  ("+ Liability account"). In a builder, an empty slot is a dashed 1px box on the canvas colour.
- **An empty chart is drawn**: the zero line, missing bars for empty periods, no padded range, no
  picture.
- **First run** (the whole screen empty): keep the frame and the title, and put the first action where
  the data will appear, with a setup progress at its true percentage if there are steps (one screen
  shows "Complete your setup" at 67%; another a four-cell getting-started strip above its tables).
- **Loading** (house rule; not in the study): the final layout with each value replaced by a flat grey
  bar at its real size (a 24px value gets a 24px-tall bar; rows keep their pitch), labels and headers
  shown at once, no shimmer gradient, and no shift of the layout when the data lands. A refresh of
  data already on screen keeps the old values and updates the freshness stamp.
- **Error** (house rule; not in the study): inside the block that failed, never as a full-screen
  banner. One sentence saying what failed and when the data was last good ("Couldn't load
  deployments. Last updated 09:14."), and a Retry text button. The negative colour only on a small
  icon or in the pill pair.
- **Stale or static data**: a freshness stamp with a refresh button (6 screens). A snapshot that
  cannot refresh says so in one quiet notice (once: #fffbeb, a 1px #fde68a border, 12px #92400e
  text). A notice tint is never a ground; the inspector reads a pale amber ground as cream.
- **Limits and usage**: a bar at the true ratio with both ends labelled ("12.7k of 20.0k").

## 12. The phone

The study has no phone screens. This section is house rule, built from the skill's phone rules
(`layout.md` §9) and from what the desktop screens imply. The inspector fails a sidebar that still
takes more than 30% of a phone's width.

- **Navigation folds.** The sidebar becomes a 48px top bar with the screen's name, a menu button that
  opens a full-screen sheet (nav, workspace switcher, account) and at most one action; or a bottom
  bar of four or five destinations with short labels. An icon rail becomes that bottom bar.
- **Margins** 16-20px; touch targets at least 44px tall; data and labels at 14px, sublines no smaller
  than 12px.
- **The title stays**, at 20-24px. Header actions move into a kebab, except the one primary.
- **Filters** collapse into one row of chips or a Filters sheet; tabs scroll sideways inside their own
  row, never the page. The first list row starts in the top 60% of the phone screen: three rows of
  filter controls above it pushed the list off the first screen in testing.
- **KPIs**: a divided container becomes a 2-column grid, or a list with the label on the left and the
  value on the right. Never four squeezed columns. In a 2-column grid the count after any full-width
  lead is even; otherwise use three narrow columns or a divided list, or let the last cell take the
  full width (`app.css` does that for an odd count). A lone "Sold 3.18 kWh" beside an empty half-row
  was flagged.
- **At most one row of controls above a chart**: an office select and a week switch share one row.
  Two stacked full-width segmented controls pushed the data down in testing.
- **Charts** go full width, 160-200px tall, with 3-4 x labels and a legend of dots above, set in a
  2-column grid (or behind a "Key" disclosure) when it would wrap to three lines. The y ticks keep
  their own lane at the left (or move to the right edge); a tick label never sits on the line.
- **Row actions on a phone** are text actions or one compact trailing button, with one filled bulk
  action for the list ("Approve 3 that fit"); five 44px grey Approve blocks turned a list into a stack
  of buttons.
- **When a strip collapses, drop the item least relevant to the screen's main action**, not the last
  in source order: the live price stays on an energy screen whose plan depends on it.
- **Tables become lists of two-line rows below about 640px**: the identity and the key number on line
  1, the other fields the brief names in 13px grey on line 2 ("fra1 · 1m 38s"), the one action at the
  right. Fields move to line 2; they are never dropped. A table that must stay a table scrolls inside
  its own frame with its first column fixed; the page never scrolls sideways.
- **The tablet (641-1100px) is its own band**: the sidebar folds to the top bar, but tables keep four
  or five columns with secondary fields as sublines, two narrow panels stack once either would be
  under about 340px, and the identity column is never the one truncated while another has room.
- **Blocks that carry an action move up, not down**: a right rail with an action (low stock and its
  Reorder, bills due and Pay) becomes a one-line summary row above the list ("5 items low · Review"),
  never a block under twenty orders.
- **Several panes** (a list and its detail, an inbox): one region at a time. Choosing a row pushes the
  detail; back returns to the list at its scroll position.
- **Settings**: the label column stacks above its panel.
- **A right rail** moves under the main column or into a tab.
- **Builders** show the work read-only, with the palette as a bottom sheet if editing stays.
- Check 390px in the inspector's screenshots every round.

## 13. House rules for app screens

The house rules in `SKILL.md` were written for pages that are read once. An app screen is read every
day, and part of what those rules ban is the structure of a working screen. These relax, with limits:

| Allowed on app screens | Limit |
| --- | --- |
| **1px borders** on cards, panels, tables and controls | About 1.1-1.3:1 against the ground on light (#e5e7eb-#ededed on white); #1a1a1a on #000, #2e2e2e on #111. Controls one step stronger. A border or a shadow, never both. |
| **Row rules** in tables and lists | 1px, 3-7% darker than the surface. No zebra, no header band. |
| **Dashed lines** | In chart grids and empty slots only. |
| **Small labels** above values | 12-14px, sentence case, grey at 4.5:1. Meta and axis text 11-12px. Nothing under 11px. At most one tracked uppercase label on a screen (a switcher's context label). |
| **Rows of identical cards** | Peer metrics or peer objects only: 3-6 across, equal widths, one gap, no orphan, edges aligned across rows, no icon on top. Prefer one divided card; mixed spans beat a uniform grid. |
| **Monospace** | IDs, keys and code; or every figure, as one style's decision. Otherwise tabular figures in the text face. |
| **Pills** | Inside rows and beside a value only: 16-24px tall, a pale tint with dark text of the same hue. Never above a heading. |
| **Index numbers** | Only as data: a rank ("1."), a node number. |
| **Icons** | 14-20px outline, one set, grey: in the nav, before a label, or as a single affordance (kebab, chevron, info). A container only if it is neutral, or node-type tiles in a builder (pass `--allow icon-chips` and give the reason in the report). |
| **Shadows** | On what floats: a menu, a popover, a tooltip, a composer, a dialog. A resting card gets at most a small blur under 8% black. |
| **A second typeface** | With one job: a mono for IDs or figures, a serif for one greeting. |
| **A gradient** | Only as an area fade under one line chart; a flat tint of about 14% is safer. |

Still banned, as on pages, and checked:

| Banned | Instead |
| --- | --- |
| Gradients on grounds, buttons, cards, text and KPI tiles (the study's two gradient buttons are flagged) | Flat fills |
| Glows, glass, backdrop blur | Opaque surfaces one tone step from the ground |
| An icon in a coloured circle or tinted square on every KPI or card (0 of 23) | A label and a number |
| Rainbow charts: more than four hues, a hue per bar, one subject in two hues | One hue per chart, neutrals for the rest |
| Sparklines on KPIs (0 of 23) | The trend in its own chart, or nowhere |
| Emoji in greetings, labels, nav or empty states | Words |
| Lorem ipsum, Acme, John Doe, "User 1"; vanity figures ("10,000+ teams"); totals that do not add up | Believable sample data computed from rows, listed in the report |
| Status colour on a zero or undefined change | Grey, or the change in words ("+4 (new)") |
| A dark or saturated sidebar on a light screen; a navy or slate dark theme | The page ground for the sidebar; true neutral darks |
| The accent on chrome: a tinted nav row with a left bar, coloured tab pills, a brand fill on every button | The accent on data and at most one control; a near-black primary |
| Uppercase tracked table headers, zebra rows, header bands | 12px grey sentence-case headers; rules or space |
| Left-aligned numbers, proportional figures in columns | Right-aligned tabular figures |
| A hero header, a greeting with an emoji, an illustrated welcome banner | A noun title at 24px |
| Pagination under a five-row overview list | Capped rows, "View all", the total |
| Violet and indigo accents; cream with terracotta | The dealt style's palette |
| A landing-page title (over 32px) or a figure at 48px or more | An 18-32px title; figures at 16-40px |
| Icons in boxes repeated down a list or on top of every peer card, tinted or neutral | One plain 16px icon where it helps, or none |
| Every row a different hue, a "left" amount in green on every budget row | Grey for what is fine; colour only on the rows at risk or over |
| A screen that names no product and offers no action | The product's mark and scope in the shell; its main job one click away |

**On violet and indigo.** 10 of the 23 studied screens use violet or indigo, always as a data hue or a
single control. The ban is the owner's taste, not a finding of the study: the library deals other
hues for the styles that came from those screens, and the inspector's palette check stays on.

## 14. Tells of generated dashboards

Each line sets a habit of generated dashboards against what the 23 screens do instead.

| Tell | What replaces it |
| --- | --- |
| A dark navy or tinted sidebar with a coloured active pill and a left bar | The sidebar on the page ground; a neutral grey pill, or the label brightening on dark. A left bar appears once in 23. |
| "Welcome back, Alex" with a waving hand and a subtitle | A noun title at 24/600. Three screens greet; the one emoji goes. |
| Four KPI cards, each with an icon in a tinted circle | One container split by hairlines, label over value. No icons on any of the 23. |
| A green "+12.5%" pill on every KPI | A delta on 9 of 20 screens, in words with its window; grey for zero; "+4 (new)" from zero. |
| A sparkline on every KPI | None on any of the 23. The trend has its own chart. |
| KPI values at 36-48px, bold, in the brand colour | 24-30px at 400-600 in ink; nothing at 48. |
| A gradient area chart with a smoothed spline and a dot on every point | A 2px straight line, no fill on 7 of 10, no markers. |
| A rainbow palette, a hue per bar or per chart | One hue per chart; the accent on data only; four hues at most on a screen. |
| Gridlines every 20px, axis lines on both sides, a legend for one series | 3-5 faint lines, no y-axis line, no legend for a single series; round ticks above the maximum. |
| A fat donut with labels on the slices and a big total in the hole | A thin ring, no slice labels, the legend as a table with the values. |
| Cards with a 16-24px radius, a 1px border and a large soft shadow | A border or a tone step, no shadow; a tight or a soft radius, chosen once. |
| A zebra table under uppercase tracked headers, with a checkbox, an avatar, a status chip and a kebab on every row | Rules and alignment: 12px grey headers, one status mark, one action where it is needed. |
| Left-aligned numbers in proportional digits | Right-aligned tabular figures, fixed decimals, units in grey. |
| Saturated status chips with white text | Pale tints with dark text of the same hue. |
| The accent on every button, tab and link | No filled primary on 12 of 23; near-black where there is one. |
| A top bar with search, a bell and an avatar on every screen, or one left mostly empty | No top bar on 9 of 23; when there is one, it carries search, the switcher or the object's name. |
| Export, Share and a date picker clustered by the title | Actions only when they are real; a freshness stamp instead. |
| Placeholder people and companies, round vanity totals, growth on a week-old account | The product's own data, small numbers at their real size, totals summed from the rows. |
| Pagination under a short list | Capped rows and "View all". |
| An equal four-up grid whatever the data, with orphan cells and stretched cards | A column count chosen by the item count; spans that change by row and land on the same lines. |
| Neon on dark, glowing borders, glass | True neutral darks, lightness steps, colour on the data. |
| The kit's own face: Geist or Inter on #f8f8f8 with white 12px cards and no hue on the data, or lime on black | One face taken from the brief (a ground from the product's world, a figure face with character, the brand's hue on the main data element) and one element only this product has. |
| A coloured icon per category in a list | One grey icon set; colour, if any, on the numbers. |
| An illustration and "No data yet" in an empty chart | The zero line drawn, and one sentence in the frame. |

A screen with every tell removed and nothing put in their place is a tidy template. What fills the
space is the product: its own data at its real size, the screen's one question answered by its
biggest block, and a grid whose sums close.

---

## 📄 `references/colour.md`

# Colour

The direction sheet deals a palette with named roles. This file is how to apply it so the page looks
decided rather than tinted.

## Contents

1. What the study measured
2. The roles
3. Proportion
4. Surfaces without lines or shadows
5. Colour fields
6. Dark pages
7. Colour and photographs
8. Contrast
9. Banned families, and what "warm" means here

## 1. What the study measured

- 41% of the studied pages are dark, 59% light. A quarter sit on pure white; 12% on pure black.
- Schemes, as the panel classed them: monochrome plus one accent 23%, light neutral 22%, dark neutral
  14%, several flat colours 13%, strictly two-tone 12%, colour carried by photographs 9%, one saturated
  field 6%.
- Buttons are neutral (black, white, grey) on 52% of sites. A coloured button is a choice, not a
  requirement.
- Gradient fills appear on 22% of the top-scored sites and 52% of the weak ones; gradient text on 2%
  against 13%.
- One site in 246 has a terracotta primary button and none has a violet one. Those are colours of
  generated pages, not of the gallery. Warm off-white grounds do occur (32 sites), nearly always with
  a dark or green ink rather than an orange accent.
- Top-scored sites change the page's field colour between sections more often (a median of two section
  grounds against one).

## 2. The roles

```css
:root {
  --bg: …;          /* the ground: most of the surface */
  --surface: …;     /* one tone step from the ground: filled panels, form fields, tiles */
  --ink: …;         /* main text and the strongest marks */
  --muted: …;       /* secondary text; still passes contrast on --bg */
  --accent: …;      /* the one accent */
  --accent-ink: …;  /* text on the accent */
  /* --field-1 … --field-n and their inks, when the palette has section fields */
}
```

Use the tokens for every colour in the build. A raw hex in a component is a second palette starting.
Do not add greys between the roles: if you need a quieter text, it is `--muted`; if you need a quieter
surface, it is `--surface`.

## 3. Proportion

Decide the shares before colouring anything and check them in the screenshot:

- **Ground:** 70–90% of the page.
- **Ink:** text and perhaps one inverted section (ink as ground, ground as ink).
- **Accent:** under 5% of any screen. It marks the action and at most one other recurring thing. The
  moment it appears in five places it stops meaning "here".

Palettes with fields (flat-loud, pastel) work differently: each section is one field at full strength
and the proportion rule applies inside each section (field, its ink, nothing else).

The accent is not for headings, icons, bullets, borders or underlines unless the direction sheet says
so. A headline is ink.

## 4. Surfaces without lines or shadows

With rules and shadows banned, a surface is told apart from the ground by tone alone:

```css
.panel { background: var(--surface); }          /* 2–6 lightness points from --bg */
.field { background: var(--surface); border: 0; } /* inputs: filled, with a clear focus state */
.field:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
```

- One step is enough. If a panel does not read, increase padding or separate with space before
  reaching for a second tone.
- Do not nest a panel inside a panel.
- Images do not need a frame. If a light photograph melts into a light ground, change the crop or set
  it on `--surface`, do not outline it.
- A thick bar (4px or more) in ink or accent is a graphic element, allowed where the direction uses
  it. A 1px line is not.

## 5. Colour fields

A section that changes the whole ground colour is the strongest colour move available, and it replaces
dividers, cards and background decoration at once.

- Fields meet edge to edge with a hard line. Nothing fades.
- Every field has its own assigned ink from the palette. Never put `--muted` on a coloured field; use
  the field's ink at full strength, or at 70% opacity for secondary text if it still passes contrast.
- Neighbouring fields should differ in lightness, not only in hue, or the page vibrates.
- Order them like chapters: open strong, rest, surprise, close dark or very light.
- The page's meta theme colour and the navigation follow the first field.

## 6. Dark pages

- Put `color-scheme: dark` on the root so form controls and scrollbars follow.
- The ground is a deep tone with a slight tint from the palette, and the ink is a soft light, not
  `#fff` on `#000`, unless the palette deals exactly that for a stark two-tone direction.
- Secondary text is where dark pages fail: check `--muted` against the ground (4.5:1).
- Depth on dark comes from a lighter surface step, never from glows or coloured light.
- Use lighter font weights than you would on a light page.

## 7. Colour and photographs

- When photographs carry the colour, the interface stays neutral and takes its ink from the darkest
  tone in the imagery.
- Do not wash a photograph with the brand colour. Either leave it alone, or commit to a real treatment
  for every image on the page (all greyscale, or all untouched).
- Text over a photograph needs a calm region. If there is none, move the text off the image. A neutral
  scrim (black or the ink colour, 30–55% opacity, flat or fading over the text area only) is the one
  gradient the inspector allows.
- A flat field sampled from a photograph (its sky, its shadow) makes a section sit with that image.

## 8. Contrast

- Body text 4.5:1 or better; display type and large numerals 3:1 or better; the dealt palettes meet
  7:1 for ink on ground.
- `inspect.mjs` computes contrast for text on flat grounds and fails anything under 2.6:1. It cannot
  see text over photographs: check those in the screenshots yourself.
- Do not lower opacity on text to make it "soft" unless you have checked the resulting ratio.
- Focus states and hover states increase contrast, never reduce it.

## 9. Banned families, and what "warm" means here

The inspector fails these:

- **Cream with terracotta.** A yellow-cream ground (roughly hue 22–62, light and noticeably
  saturated) with a rust, clay or burnt-orange accent is the house look of AI assistants and of the
  pages they generate. Either half alone is suspect; together they are unmistakable.
- **Violet and indigo.** The first wave of generated pages was purple; it still reads that way.

If the brief wants warmth, get it from a low-chroma stone, bone or putty ground (saturation under
about 15%), from a deep green, brown or oxblood ink, from photographs, or from a full warm field
(mustard, tomato red, pink) used flat and with conviction. Warmth is not beige.

If the brand itself owns one of the banned colours, it is the brand's and you keep it: use
`--keep palette`, pass `--allow palette-purple` (or the relevant rule) to the inspector, and note it in
the report.

---

## 📄 `references/copy.md`

# Words

Copy is the first design decision. A headline that needs four lines cannot be rescued by typography,
and a page of slogans cannot be rescued by layout. Write the page as plain text before any markup.

## Contents

1. Write the argument first
2. The two-line headline (with the character budget)
3. Headline shapes that work
4. Supporting line, body, buttons
5. Proof without inventing it
6. Things that read as generated
7. Micro-typography

## 1. Write the argument first

Answer in one line each, in a scratch note:

- Who is reading, and what do they already know?
- What is this, said the way its maker would say it to a friend?
- What single thing should the reader believe after one screen?
- What would make them believe it (a picture of the thing, a number, a name, a demonstration)?
- What do they do next?

Then list the page as claims, one per section, each with its proof:

```
1. It is a three-legged oak stool, made to order.             → the stool, large
2. Each seat is cut from one board, so the grain is yours.    → three close-ups
3. It takes six weeks, and you can follow it.                 → the stages, photographed
4. It costs 240 and is delivered by the maker.                → price, button
```

A section with no claim is filler; delete it. This is also how you escape the stock order of
hero, logos, features, testimonial, pricing, call to action: the order of the argument is the order of
the page.

## 2. The two-line headline

A headline is a title. It is held in one glance. On the studied gallery sites the hero headline has a
median of 5 words and 70% sit on one or two lines at desktop width. Every headline on your page, at
every viewport, fits in **two lines or fewer**. `inspect.mjs` measures this at 1440, 768 and 390 pixels
and fails the page otherwise.

The constraint is arithmetic, so do it before you fall in love with a sentence:

```
characters per line ≈ line width in px ÷ (font size in px × k)

k ≈ 0.40  condensed faces
k ≈ 0.50  most grotesks and serifs at display size, tight tracking
k ≈ 0.58  wide / extended faces, all-caps settings
```

| Where | Line width | Size | Per line | Two-line budget |
| --- | --- | --- | --- | --- |
| Phone 390, 20px gutters | 350px | 44px | ~16 | **~32 characters** |
| Phone 390, 20px gutters | 350px | 34px | ~21 | ~42 characters |
| Tablet 768 | 690px | 64px | ~22 | ~44 characters |
| Desktop, 12-col measure | 1100px | 104px | ~21 | ~42 characters |
| Desktop, half width | 620px | 72px | ~17 | ~34 characters |

So a hero headline of **about 32 characters or fewer** (four to six words) survives everywhere at a
confident size. Up to about 42 works if the phone size comes down to the mid-30s. Past that you are
writing a sentence; move the rest into the supporting line.

Controlling the break:

- Give the headline a `max-width` in `ch` so it breaks where you intend, and add
  `text-wrap: balance` so two lines come out even.
- Where the break matters (it usually does), author it: `Stools for<br> small kitchens`. Check the
  phone screenshot; if an authored line wraps there, hide the `<br>` under a breakpoint or shorten.
- Never fix a long headline only by shrinking it. A timid 28px headline of nine words is worse than
  five words at 64px.
- Avoid a single orphan word on line two. Rebalance by cutting a word, not by nudging the width.

Section headings follow the same rule and are shorter: two to five words.

**A statement is not a headline.** An intro sentence or a quotation set large (the manifesto line
after the hero, a testimonial) is a paragraph: mark it up as `<p>` or `<blockquote>`, keep it to about
25 words, and set it at statement size, which the inspector takes as 36px or less on desktop, 32px on
a tablet and 24px on a phone. It may then run to about three lines (four on a phone). Set larger than
that, or marked up as a heading, or placed as the main line of the first screen, it is a headline and
gets two lines. In blind judging, a sentence set big over three or more lines was read as a long
headline every time, whatever its markup; if the words matter that much, cut them to a two-line
headline instead.

## 3. Headline shapes that work

All seen repeatedly on the gallery sites. Pick the plainest one that is true.

- **The name.** The brand or the person, set very large, with a one-line description elsewhere.
  Strongest when the name is short and the subject is visual (studios, restaurants, hotels, people).
- **What it is.** "A vinyl shelf in your pocket." "Furniture for small rooms." Category, stated with
  one specific word.
- **The claim.** "Your bank won't do this." One sentence a competitor could not sign.
- **The instruction.** "Understand your money." Verb first, short.
- **The place or the moment.** "Antarctica." "Lisbon, since 1984." For hospitality, events, travel.

Shapes to avoid, because they are the average of every landing page:

- The mad-lib: "The AI-powered platform for modern teams".
- The tricolon: "Fast. Simple. Secure." or "Plan. Build. Ship."
- The correction: "It's not just a tool, it's a workflow". Also "More than a …".
- "X, reimagined / redefined / made simple". "Welcome to …". "Meet …" for a product nobody has met.
- A question the reader did not ask.
- A headline that needs its colon: "Ledgerly: invoicing for freelancers". Drop the name, it is in the
  navigation.
- One word of the headline styled differently (italic, serif, coloured, underlined, in a pill).

Sentence case. No full stop unless the direction's voice uses them everywhere.

## 4. Supporting line, body, buttons

**Supporting line.** One sentence, at most about 22 words, that says concretely what the thing is and
who it is for. It is where the detail cut from the headline goes. It never repeats the headline in
other words.

**Body.** Short paragraphs of plain statements. Prefer the specific noun and the real number: "ships
in a week" over "fast delivery"; "38 seats" over "intimate". Read every sentence and ask whether a
different company could print it unchanged; if so, sharpen it or cut it.

**Buttons.** Name the action or the thing: "Book a table", "See the plans", "Download for Mac".
One to three words. The primary action keeps one name everywhere on the page. One primary button per
screen; a second action is a plain text link. No arrow glyph on every link and button; at most one
arrow, on the primary action, if the direction uses arrows at all.

**Navigation.** The wordmark, up to five plain links, one action. Link labels are single nouns.

## 5. Proof without inventing it

Never invent customers, quotes from named people, press logos, user counts, ratings or benchmarks.
Invented proof is both dishonest and a recognised tell.

When the brief supplies no proof, use what is true by construction:

- Show the thing itself, large. A real demonstration outranks any quote.
- State how it works, specifically.
- Use facts from the brief (price, place, year, materials, what is included).
- If a testimonial or logo section is explicitly requested and no real ones exist, build the section
  with plainly fictional sample content and say so in your final report so it is replaced before
  launch. Do not put real company names or real people in it.

**Sample details are different from proof, and they are expected.** Where the brief gives the shape of
the content but not every detail (six rooms "from €140", "a short menu", twelve speakers), write the
full set of plausible details: each room with a name, a bed, a view and its own rate; each dish with
its price; each speaker with a talk title. A design can only be judged at its real density, and a page
that shows one rate where six rooms exist looks unfinished. List every sample detail in the report so
the client confirms or replaces it.

## 6. Things that read as generated

`lint.mjs` flags most of these.

- Verbs and adjectives of the genre: unlock, unleash, supercharge, elevate, empower, streamline,
  seamless, effortless, robust, cutting-edge, next-generation, world-class, all-in-one, blazing fast.
- Labels pretending to be editorial: "Field notes", "The details", "Our philosophy", "Quietly trusted
  by". A section heading can simply be "Pricing".
- Furniture text: locale or time strips, "Est. 2024", coordinates, version stamps, "Scroll", "(Scroll
  to explore)", fake photo credits, status lines such as "Available for work" with a dot, strings of
  words separated by middle dots or slashes.
- The em dash as a habit. One or two on a page read as writing; ten read as a model. Use a full stop.
- Explainer captions that narrate the design: "A clean, minimal layout for…".
- Step labels that duplicate numbers: "Step 1", "Phase 02".
- Three parallel items everywhere: three features, three stats, three steps. Use the number the
  content has.

## 7. Micro-typography

- Curly quotes and apostrophes (“ ” ’), a real ellipsis (…), an en dash for ranges (9–5).
- Non-breaking space between a number and its unit, and before the last short word of a headline
  when it would otherwise orphan (`&nbsp;`).
- `font-variant-numeric: tabular-nums` where numbers line up in columns (prices, tables).
- `text-wrap: balance` on headings, `text-wrap: pretty` on paragraphs.
- No all-caps for anything longer than three words; if you set caps, add 0.02–0.06em tracking.
- No text under 13px. No centred paragraphs longer than three lines. No justified text.

---

## 📄 `references/critique.md`

# Critique — judging the render

`inspect.mjs` passing means nothing banned or broken was measured. It says nothing about whether the
page is good. This file is how you find out. Use it on the screenshots, never on the code: you wrote
the code, so you will read your intentions into it. The pictures only show what is there.

## Contents

1. How to look (fourteen passes, a few minutes)
2. The score
3. Caps
4. Writing the critique
5. What to fix first
6. When to stop

## 1. How to look

Open `desktop-fold.jpg`, then the `desktop-page-*.jpg` sheets, then `mobile-fold.jpg` and the mobile
sheets. Make each pass on its own; do not blend them.

1. **One second, then five.** Glance and look away. What did you see? There should be exactly one
   answer: a word, an image, an object. If the answer is "a website", there is no focal point. Then
   give the first screen five seconds as a stranger: can you say what this is, who it is for and
   what to do next? If the title only makes sense after scrolling, it is not a title.
2. **Squint.** Blur your attention until text becomes grey bars. The page should reduce to two or
   three large masses with clear size differences. Many small similar masses means everything is
   medium and nothing leads.
3. **Cover the logo.** Could this first screen belong to a competitor, or to a different industry?
   If swapping the name and the noun in the headline would produce an equally valid page, the page has
   no idea. Go back to the direction sheet; the idea is written there. Then scroll: does the idea reach
   the pricing, the FAQ and the footer, or does the page turn into stock blocks after the first screen?
4. **Edges.** Follow the left edge of every text block down the page. Count the distinct x positions.
   A composed page has two or three, reused on purpose. Six means things were placed one at a time.
5. **Space and frame.** Are related things close and unrelated things far? Is the gap between sections
   clearly larger than any gap inside a section? Is any region empty by accident (a hole) rather than
   by decision (a rest)? A hole usually sits beside a short column or under a removed decoration.
   Then look at the frame: are the left and right margins of the page the same? Does any section keep
   its text in one half and leave the other half empty? Is there a stretch of nothing taller than half
   a screen? Readers name these first ("it is pushed to the left", "random empty space"), before any
   detail; in the study of 100 Sites of the Day about 1 section in 100 left half the width empty.
6. **Type.** Is the jump from body text to headline decisive (three times or more)? Do you see more
   than five sizes? Any headline with one orphan word on its last line? Any paragraph wider than about
   75 characters or centred over more than three lines?
7. **Colour.** Name the proportions: which colour holds most of the surface, which supports, where is
   the accent? An accent that appears in ten places means nothing. One that appears on the single
   action and one detail means "here".
8. **Images.** Count the real pictures: are there at least four, and is there a moving one? A page of
   drawings only, or of type only, looks unfinished next to one with real photographs and footage.
   Is every image doing a job (showing the thing, setting the place, proving the claim)?
   Do the crops share ratios? Is anything a grey box, a stretched photo, a fake screen made of bars?
   Does the photography share one light and one grade, or is it a stock mix?
9. **Sameness.** Write one word for each section's layout (split, list, full-bleed, grid, statement,
   index …). The same word twice in a row, or three times on the page, is the template showing.
10. **Phone.** Is the mobile screen a composition of its own, with its own crop and its own line
    breaks, or the desktop page squeezed? Is the first screen still one clear thing?
11. **Fullness.** Go through the desktop sheets screen by screen. Is each screen a composed poster, or
    is it a narrow column of small text with dead ground either side? Is any statement held on screen
    for three screens? An austere page is not a restrained one: if the page could be mistaken for an
    unfinished wireframe (grey shapes, grey text, one small column), it is underbuilt. A single motif or
    drawing blown up to fill a whole screen with nothing to read is a hole too, however bold it looks.
12. **Substance.** Does every section the brief asked for deliver its information completely and at a
    readable size (the full menu, each room, every speaker, the price and what it includes)? Would the
    visitor leave knowing what they came to find out? Is the primary action a real button on the first
    screen?
13. **Collisions.** Is anything lying on top of a headline, a statement or a button at any scroll
    position? Does any element run off the edge of the phone screen? A row that scrolls sideways on
    the phone reads as cut off in a screenshot and to most visitors; wrap it unless the cut is
    plainly deliberate (a partial card showing at the edge).
14. **The competitor and the live thing.** Put the nearest competitor's name on the page: does the
    idea still work? Then name the one live thing (what the visitor can do or what differs each visit).
    If either answer is weak, that is the first problem of the round, ahead of any detail.

A note from testing: in blind comparisons a richer page full of template devices beat a cleaner page
that was thin, every time. The house rules remove the devices; passes 11–13 are where you make sure the
page did not lose its substance with them.

## 2. The score

Score like an Awwwards juror: four criteria, 1–10 each, weighted **design 40%, usability 30%,
creativity 20%, content 10%**.

**Design (40%)** — composition, typography, colour, imagery, craft.
- 9–10: every screen holds as a poster. Nothing could be removed or moved.
- 8: confident and coherent; one or two soft spots a designer would notice.
- 7: clean and professional, a clear system, little tension.
- 6: tidy but anonymous. Reads as a kit.
- 5 or less: weak hierarchy, accidental spacing, default type, mismatched images.

**Usability (30%)** — orientation in three seconds, readable text, obvious actions, honest mobile.
- 9–10: you know what it is, who it is for and what to do without scrolling; flawless on a phone.
- 8: clear and comfortable; minor friction (a long section, a small target).
- 7: works, with one real problem (weak contrast somewhere, a cramped phone layout).
- 6 or less: you have to hunt, or something breaks.

**Creativity (20%)** — an idea you can state in a sentence, carried through.
- 9–10: a concept specific to this subject that you have not seen applied this way.
- 8: a clear idea with one memorable move.
- 7: a tasteful execution of a known approach.
- 6 or less: the category default.

**Content (10%)** — words and pictures that are specific, true-sounding and edited.
- 9–10: every line could only be about this subject; imagery is the subject.
- 7–8: clear and concrete, some generic lines.
- 6 or less: slogans, filler, stock.

`overall = 0.4·design + 0.3·usability + 0.2·creativity + 0.1·content`

For calibration: real Sites of the Day land around 7.5–8.0 overall from the jury. An honest 8.5 is
rare. If your first score for your own work is 9, score it again as the juror who did not build it.

## 3. Caps

These override the arithmetic.

- Any `FAIL` still reported by `inspect.mjs`: overall cannot exceed **6.0**.
- A headline of three or more lines at any viewport, an eyebrow label, monospace labels, 01/02/03
  numbering, a decorative gradient, a shadow on a resting element, or a decorative hairline visible in
  a screenshot: overall cannot exceed **6.5**, whatever else is true.
- Pass 3 fails (the page could belong to anyone): creativity cannot exceed **6**.
- The idea passes for the nearest competitor (pass 14): creativity cannot exceed **7**.
- Fewer than four real pictures (photographs, archival images, footage; drawings do not count):
  design cannot exceed **6.5**.
- A page that barely moves (the inspector's `still-page`), or motion that is one identical fade on
  every block: design cannot exceed **7**.
- No live thing (pass 14): creativity cannot exceed **7.5**.
- Any placeholder (grey box, lorem, "Image here"): content cannot exceed **5**.
- Two or more desktop screens that are mostly empty ground, or a page whose running text is small and
  grey: design cannot exceed **6.5**.
- A section the brief asked for that is missing or reduced to a few words: content cannot exceed **6**.
- No real button for the primary action on the first screen: usability cannot exceed **7**.
- The five-second pass fails (no clear title saying what this is on the first screen): usability
  cannot exceed **6**.
- Unequal page margins, a section huddled on one side with the other half empty, or a blank stretch
  taller than half a screen: design cannot exceed **6.5**.
- A section of running text with no heading naming it: usability cannot exceed **7**.
- Anything covering a headline at any scroll position: usability cannot exceed **6**.
- A blank band where a reveal did not fire, or content clipped off-screen: usability cannot exceed **5**.

## 4. Writing the critique

Write it down; do not just think it. Use exactly this shape so rounds can be compared:

```
ROUND n
Seen in one second: …
Idea (one sentence): …
Live thing: …
Layout words by section: hero=… / …=… / …
Scores: design _ · usability _ · creativity _ · content _ → overall _._
Caps applied: …
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. …
2. …
3. …
```

Name problems the way a designer would to a colleague: "the supporting paragraph starts 40px left of
the headline's edge", "the testimonial section is the third split layout in a row", "the phone hero
crops the bottle out of frame". "Could be more polished" is not a finding.

## 5. What to fix first

Fix in this order; later items cannot rescue earlier ones.

1. **The idea.** If pass 3 fails, change the hero concept, not the details.
2. **Hierarchy.** One dominant element per screen. Make the big thing bigger and the small things
   fewer before touching anything else.
3. **Composition.** Shared edges, section spacing, variety of layout between sections, holes.
4. **Typography.** Scale contrast, line breaks, measure, leading.
5. **Imagery.** Replace weak pictures, unify crops and grade.
6. **Colour.** Proportion and accent discipline.
7. **Detail.** States, focus, small alignments, mobile refinements.
8. **Motion.** Last.

When removing something leaves a gap, do not refill it with an ornament. Close the gap, enlarge what
remains, or let a picture or a colour field take the space.

## 6. When to stop

Run at most three rounds: critique → fix the top three → re-inspect → critique. Stop early when a round
finds no problem a stranger would notice. If round three still scores under 7.5, say so plainly in
your report, with the remaining problems listed; do not round up.

---

## 📄 `references/imagery.md`

# Imagery

Pictures are where generated pages most obviously give up: a grey box, an icon in a square, a fake
dashboard, an abstract blob. This file is how to decide what the pictures are, where to find real ones,
how to crop and place them, and what to do when there are none.

## Contents

1. What the study measured
2. Decide what imagery exists
3. Real pictures from the open collections
4. The dealt photographs
5. Cropping and placing
6. Treatment
7. Showing software
8. Drawing the subject
9. Type and colour alone
10. Markup and credits
11. Video
12. Where pictures and footage go

## 1. What the study measured

- On 60% of the studied sites one piece of media covers at least half of the first screen; on half of
  them it covers nearly all of it. Top-scored sites: 68% and 56%. Weak sites: 48% and 39%.
- Only 15% of heroes have no media at all, and those are deliberate typographic statements.
- Media has square corners on 73% of sites. Where corners are rounded the usual radius is about 12px,
  applied to every image alike.
- Top-scored pages carry far more imagery (a median of 37 images against 5 on weak pages): the strong
  sites show, the weak ones tell.
- What the imagery is, by the panel's classification: a mix of kinds 32%, photography 14%, generative
  or WebGL scenes 13%, real product interface 12%, 3D renders 11%, illustration 9%, video 6%, type only
  3%.
- Among the 54 sites the panel scored under 6.8, legibility (text lost over a busy image, or too
  little contrast) was named as a weakness in 13.
- In the October 2026 study of 91 Awwwards Sites of the Day (section 12), the median page carries 7
  pictures (top sites 8, the lowest 2) and footage appears on 42% of sites (half of the top ones, one
  of the 16 lowest).
- Pictures come in whole screens: 42% of scrolled screens hold none and 19% are 90% picture or more.
- 94% of pictures have square corners, and on a typical site two ratios hold three-quarters of them.

## 2. Decide what imagery exists

In order of preference:

1. **The project's own images.** Product shots, the place, the people, the work. Even ordinary
   photographs of the real thing beat beautiful photographs of something else. Ask what exists; look in
   the repository.
2. **Images you can generate** with an image tool in this session. Write prompts as a photographer's
   brief: subject, angle, light, background, crop ratio, and "no text". Generate the hero first and
   make the rest match its light.
3. **Real pictures of the subject's world from the open collections** (section 3). Archives,
   museums and photographers have published millions of pictures anyone may use with a credit: the
   client's city and street in old postcards, maps of its neighbourhood, its materials, its trade in
   engravings, museum objects of its kind. Whenever an honest one exists, it beats a drawing of the
   same thing: it is real, it has detail no drawing in a page's budget reaches, and it carries history.
   Honest means nobody could take it for the client's own product, room, dish, person or team.
4. **Pictures you draw in code from the subject itself** (section 8), for what no honest picture
   exists of: the product's own objects as flat shapes, the place's tiles and windows, a map of its
   streets, the document a tool produces, the interface of a piece of software. In testing, pages that
   drew their subject with care beat pages that borrowed unrelated photographs every time, and beat
   pages that showed nothing.
5. **The photographs dealt on the direction sheet.** Real photographs of places, light, texture and
   weather. Use them only where an honestly generic picture fits (the open sea for a house on the sea,
   fog for a quiet retreat). They cannot stand in for a specific product, dish, room, person or
   screen: a foggy motorway on a restaurant page reads as stock at once, and jurors notice.
6. **Type and colour alone,** done on purpose (section 9).

Tell `draw.mjs` the truth with `--have`. If you have no product photographs and no image tool, do not
pass `product-photo`; the draw will avoid the directions that depend on showing the object. Pictures
found in the open collections are not the project's own: do not pass `photography` for them.

## 3. Real pictures from the open collections

`scripts/assets.mjs` searches four open sources without keys and prints, for each find, a direct image
URL, the page it comes from, its size, its creator, its licence and a credit line:

- **Openverse**: one index over Flickr, Wikimedia Commons, museums and libraries.
- **Wikimedia Commons**: archival photographs, old maps, scans of prints and books, places as they
  look now.
- **The Art Institute of Chicago** and **The Metropolitan Museum of Art**: public-domain paintings,
  prints, drawings, photographs, textiles and objects, in large scans.

```bash
node <skill>/scripts/assets.mjs "ghent postcard"
node <skill>/scripts/assets.mjs "fig" --source museums --orientation portrait
node <skill>/scripts/assets.mjs "basalt texture" --min-width 2400 --source openverse,commons
node <skill>/scripts/assets.mjs --get commons:36649959,met:707892     # download, record the credits
node <skill>/scripts/assets.mjs --credits                             # footer line and report list
```

By default it keeps only licences that allow commercial use (CC0, public domain, CC BY, CC BY-SA) and
pictures at least 1000 pixels wide, and checks that every image it prints actually loads.
`--license pd` keeps only pictures that need no credit; `--orientation`, `--min-width` and `--limit`
narrow the list; `--source` picks the sources; `--json` gives the raw results. Each result has a ref
(`commons:36649959`) that `--get` takes.

**What to search for.** The inventory (SKILL.md step 1), not the category: "bakery" finds other
people's bakeries. The subject's world is specific:

- **Its place:** the city, the street, the harbour, the valley, in old postcards and photographs
  ("ghent postcard", "rotterdam harbour 1920") and as it looks today ("gent korenmarkt").
- **Its maps:** the street plan, the chart of its bay, the geology of its valley ("ghent old map",
  "nautical chart lisbon").
- **Its materials,** close enough to read as a surface: the stone of its quay, the grain of its oak,
  its glaze, its tiles ("azulejo tiles", "basalt cobblestones", "oak grain").
- **Its trade's history:** the old tools, the craft in engravings and trade catalogues, patent
  drawings ("bread oven engraving", "potter's wheel", "bicycle patent drawing").
- **Museum objects of its kind,** with `--source museums`: a coffee set from about 1810 for a studio
  that makes coffee sets, a woodblock print of a wave for a surf school, a porcelain plate painted
  with figs for a fig orchard.
- **Scientific imagery:** botanical and zoological plates ("botanical engraving fig"), star charts,
  microscope photographs, satellite views of its coast, geological sections.

Search in the place's own words (azulejo, not "blue tile"; Korenmarkt, not "market square"), add a
medium (postcard, engraving, old map, lithograph, aerial photograph) or a decade, and try two or three
queries per idea. The museum sources match best on one or two words ("fig", "harbour", "teapot").

**What makes a good find.**

- It belongs to this subject's world and would not fit the nearest competitor's page.
- It still reads at the crop the slot needs. Look at it before deciding: `--get` downloads it, then
  open the file. A title is not a picture.
- It is large enough: twice the width it is shown at for anything full-bleed (the script prints the
  largest size available). A 1024-pixel Flickr photograph is a half-width picture at most.
- It belongs to one family with the others on the page: all engravings, or all photographs from one
  era, or all close surfaces in one light. A 1900 postcard beside a modern stock photograph beside a
  botanical plate reads as a scrapbook.
- No watermark, no burned-in text or logo, no frame or scanner edge you cannot crop away, and no
  recognisable living person who could be taken for the client's staff or customers.

**Use it creatively.** Found pictures are material, not decoration:

- **One archival photograph as the hero,** full-bleed: the street as it was a century ago, behind the
  name of the business that stands in it today, with the year in the caption.
- **A museum engraving enlarged until its line becomes texture,** cropped tight and returning at
  different scales as the page's one motif (the whole fig plate in the hero, a single leaf of it
  beside the menu).
- **An engraving or a map on white paper set with `mix-blend-mode: multiply` on the page's colour
  field,** so the ink sits on the ground (section 6).
- **The real map of the street as the contact section,** the door marked, the north and the scale
  taken from the original.
- **A material close-up as a whole field:** the quay's stone behind the opening hours.
- **A run of old postcards or plates as the gallery,** one size, one treatment.

Treatments stay within section 6: untouched, greyscale for the whole set, or multiply on a field.

**Stay honest.**

- **A found picture is never the client's own.** It may show the client's city, its materials, its
  history, the kind of thing it makes; it may never stand in for the client's product, room, dish,
  person, team or customers. If a visitor could take it for the client's own (a bakery counter, a
  plate of pasta, a smiling barista, a guest room), do not use it.
- **Caption from the source** when a caption helps: what it is and when, as the archive describes it
  ("Gand, unloading a steamer, 1905"). Never write a caption that ties it to the client.
- **Record and credit every picture.** `--get` writes the source, creator, licence and page of each
  download to `assets/credits.json`. CC BY and CC BY-SA require a credit with the title, the creator,
  a link to the source and a link to the licence; `--credits` prints them as one line of HTML for
  the footer (section 10). Public-domain pictures need no credit; give one anyway.
- **Respect the licence.** CC BY-SA: an altered version (recoloured, combined with other pictures)
  must be shared under the same licence. Non-commercial (NC) and no-derivatives (ND) licences are out
  for a client's site, which is why the script leaves them out unless asked. Read the `note` lines:
  some pictures carry personality rights or a trademark, are public domain only in the United States,
  or come with an archive's statement instead of a licence.
- **Download, do not hotlink.** Save what you use into the project: `--get` puts it in `assets/` at
  1920 pixels wide (pass `--width 1280` for a picture shown at half the screen, `--width 3840` for a
  very large hero where the source has it). The page then works offline, does not break when an
  archive moves a file, and does not load from someone else's server. Every licence the script
  allows by default permits copying.
- **List them in the report:** file, title, creator, licence, source page, and where the credit sits.
  `--credits` prints that list too.

If two or three honest queries per idea find nothing that fits, draw (section 8). A drawing made for
the subject is better than a found picture that is merely nearby. If the script cannot reach any
source (no network), draw, and say so in the report. For moving pictures, the same script searches
real footage with `--video` (section 11).

## 4. The dealt photographs

- The sheet lists eight from one set so they share a subject and a light. Use three to six.
- Each line says where the calm area is. Put text there or keep text off the image.
- More from the same or another set: `node scripts/draw.mjs --photos list`, `--photos <set>`, or
  `--photos "fog coast"` to search descriptions.
- URLs have the form `https://picsum.photos/id/<id>/<width>/<height>`. Request the exact pixel size you
  render at twice the CSS size for sharpness, capped around 2400 wide. Add `?grayscale` for
  black-and-white.
- These are photographs from Unsplash served by Lorem Picsum under the Unsplash licence. List the ids
  you used in your report; they are meant to be replaced by the project's own pictures.

## 5. Cropping and placing

- **Choose a small set of ratios and stick to them:** for example 4:5 for portraits, 16:10 for
  landscapes and 1:1 for details. Random ratios look like a stock dump.
- **Go large.** A photograph at full width, or at half the screen and full height, has presence. Six
  small ones in a grid have none. If the image is good, give it the room; if it is not, cut it.
- **Crop with intent.** Use `object-fit: cover` with an `object-position` chosen per image so the
  subject sits where the composition needs it (off-centre, on a third, against the text side).
- **Let images touch edges.** Full-bleed, or bleeding off one side, reads as designed. An image
  floating with equal margins on all sides reads as placed by default.
- **Overlap sparingly and on purpose:** a headline whose last line runs over the top edge of the
  picture, a small image overlapping a large one by a fixed 40–80px. One overlap per screen at most.
- **Square corners** unless the direction or the one-motif shape says otherwise. If rounded, one radius
  for every image on the page.
- **No frames:** no borders, no shadows, no device mock-ups, no browser chrome around pictures.
- **Captions** are one short line in the small size and soft ink under the image, left-aligned to its
  edge. Most images need none.
- Where each picture goes on the page, how large, and what the phone does with it: section 12.

## 6. Treatment

One treatment for the whole page:

- **Untouched.** The default. Pick images whose light already agrees.
- **Greyscale.** `filter: grayscale(1) contrast(1.05)`, or `?grayscale` on the URL. Unifies a mixed
  set instantly and suits editorial and typographic directions. Apply to every image or none.
- **Multiply on a field.** On a light flat ground, `mix-blend-mode: multiply` makes a white studio
  background vanish so a product sits directly on the colour.
- **Darkened for a dark page.** `filter: brightness(0.85) contrast(1.05)` so the image edges sink into
  the ground.

Not treatments: colour washes over photographs, duotone overlays, blur, grain overlays, vignettes,
tilted "polaroid" frames with shadows.

For text on a photograph, a neutral scrim covering only the text area: a solid block at 40–55% black,
or a fade from 55% black to transparent over the lower third. Never a coloured overlay.

## 7. Showing software

- Build a real fragment of the interface in HTML at its true size, with believable content, instead of
  a shrunken screenshot or a decorative mock-up. Crop to the part that makes the point: one control,
  one row, one panel.
- Believable means real labels, real numbers that add up, one item hovered or selected, proper
  alignment. Grey bars standing in for text are worse than no image.
- Put the fragment directly on the page or on one flat stage colour. No laptop, no phone frame unless
  the product is a phone app and the frame is a plain rounded rectangle.
- Inside a fragment the product's own interface conventions apply (its small radii, its 1px control
  borders, a shadow on its open menu). Put the attribute `data-ui` on the fragment's root element: the
  inspector and the linter then leave what is inside alone, and hold the page around it to the house
  rules. `data-ui` is for cropped fragments only; wrapping a heading or a whole section in it fails.
  Write the fragment's CSS under a `[data-ui]` selector (`[data-ui] .row { … }`) so the linter can
  tell it apart from page styles.
- If the user supplies real screenshots, show them large and uncropped at least once.

## 8. Drawing the subject

When nothing real can be photographed and the open collections hold no honest picture of it, draw it,
and draw it well. Inline SVG and CSS are enough. Drawings and found pictures can share a page: the
found ones show the world around the client, the drawings show the client's own things.

- **Draw the subject's own things,** not decoration: the stool's three legs and the grain of its seat,
  the enamel sign over the bakery door, the hut's two windows and its stove pipe, the street plan, the
  invoice the tool produces, the festival's stage. If you cannot name what a drawing depicts in the subject's world, it is decoration.
- **One graphic language for the whole page:** flat filled shapes, no outlines or one consistent
  stroke weight, the same corner and curve vocabulary everywhere, drawn in the palette's real colours
  (fields and accent at full strength, not greys). A set of drawings that obviously belong together
  reads as an identity; a mix of styles reads as clip art.
- **Colour is the material.** A product sold on its finish is drawn in that finish's colours; a sea house in the
  sea's blues and the sand; never a page of grey placeholders.
- **Draw with three levels of detail.** Jurors called simple drawings "basic" every time. Give each
  drawing big shapes that read at a glance, middle shapes that describe the thing (the handle, the
  window frame, the step), and small details that reward a second look (the maker's mark, the house
  number, the chipped tile, the hinge, a bird on the roof). Make light with flat tone steps (a lit face
  and a shaded face of each volume), not gradients. A drawing that would pass as a placeholder icon at
  full size is not finished.
- **Draw large and let it work:** the drawing is the hero's dominant element, a full-width band, a set
  of tiles, the footer mark. Small doodles scattered around read as filler.
- **Let it carry the idea through the page,** the way a motif does: the same drawn object returns at
  different scales, the tile grid becomes the opening hours, the map becomes the booking section.
- **Honesty:** say plainly, in small text near the first drawing or in the footer, that the pictures
  are drawn until photographs exist, if the client might otherwise be taken to be showing real
  products. In your report, list which drawings are placeholders for photography.
- **Not this:** gradient-shaded 3D-looking blobs, isometric clip art, generic line illustrations of
  people at laptops, abstract floating shapes, icons in squares. Those are the generated look.

## 9. Type and colour alone

This is a legitimate design, not a gap to disguise. Only 7 of the studied sites use no imagery at all,
and they hold their own: a median panel score of 7.5 against 7.2 for the whole set.

- Make the typography the image: one statement at 10–14vw, a list set at 5vw, numerals at display size.
- Use colour at scale: a full field, an inverted section, a two-field split.
- Use the subject's own shape as one flat motif if the direction calls for it (a circle, an arc, a
  notch), drawn in CSS, cropped by the viewport.
- Do not add: icons in squares, abstract gradients, dot grids, wave dividers, floating shapes, emoji,
  generic line illustrations, or an empty box where a picture "will go".

## 10. Markup and credits

A found picture, downloaded into the project with `--get`, used as the hero:

```html
<img src="assets/fig-engraving.jpg" width="1920" height="2807" fetchpriority="high" decoding="async"
     alt="Hand-coloured engraving of a fig cut open, with its flowers and seeds, in black, pink and green">
```

A dealt photograph further down the page:

```html
<img src="https://picsum.photos/id/626/2400/1500" width="2400" height="1500"
     alt="Red and white lighthouse in a turquoise sea below a chalk cliff" loading="lazy" decoding="async">
```

The credits, as `--credits` prints them, in the footer:

```html
<p class="credits">Pictures: <a href="https://commons.wikimedia.org/wiki/File:Fig_(Ficus_carica_L.);_57_segments_of_flowers_and_fruits_at_Wellcome_V0043000.jpg">“Fig (Ficus carica L.): 57 segments of flowers and fruits”</a>, <a href="https://creativecommons.org/publicdomain/mark/1.0/">public domain</a>, via Wikimedia Commons.</p>
```

- Always `width` and `height` (or `aspect-ratio` in CSS) so nothing jumps while loading.
- `loading="lazy"` on everything except the hero image, which gets `fetchpriority="high"`.
- `alt` describes the picture in plain words. Decorative repeats get `alt=""`. The script's suggested
  alt is the archive's title; rewrite it to say what the picture shows.
- A coloured `background-color` on the image container (the ground or surface tone) so the layout is
  whole before the image arrives.
- The credit line is part of the footer's design, at full contrast, with its links. Set it at the body
  size; one step smaller only on a page with plenty of running text, because a long credit line in
  small type can become the page's most common text size and fail the inspector's body-size check.
  One line for all pictures; no credit captions laid over the pictures themselves. Credit only the
  pictures the page still uses.
- A broken image fails the inspector. Check every picture in the screenshots.

## 11. Video

A moving picture of the subject's world can carry a section the way a photograph does: the river at
the end of the street, the roaster's drum turning, a timber frame going up. `assets.mjs --video`
searches real footage without keys: Wikimedia Commons (every video there comes with web-sized
transcodes; the best source for short clips), the Internet Archive's Prelinger Archives (industrial,
educational, city and home films from the 1920s to the 1970s, mostly public domain and mostly long)
and NASA (the Earth from orbit, launches, aircraft, laboratories). The rest of the Internet Archive is
left out: anyone can upload there, and the licence claims are unchecked.

```bash
node <skill>/scripts/assets.mjs "coffee roasting" --video
node <skill>/scripts/assets.mjs "river" --video --source commons,nasa --orientation landscape
node <skill>/scripts/assets.mjs --get commons:49769620        # the clip, a poster frame, the credit
```

It takes a rendition of 720p or smaller (`--res` changes that), lists short clips first, prints each
clip's length and file size, and flags anything over 25 MB or longer than a minute. `--get` refuses a
clip over 25 MB unless you pass `--max-mb`, and saves the source's still frame beside it as the
poster (Commons and NASA; the archive's own stills are too small). An archive film of ten minutes is
too heavy as it stands: trim a few seconds from it with ffmpeg if it is installed, or choose a
shorter clip. Licences, credits and honesty work exactly as for pictures (section 3).

**Choosing a clip.**

- **Short:** 5 to 20 seconds that loop without a visible jump: water, smoke, a turning drum, traffic,
  leaves, a crowd from far away. Watch it to the end before choosing.
- **Light:** under about 5 MB for a section and 10 MB for a hero. In the study sources are 1920×1080
  (the commonest) or 1280×720, median length 10 s; 720p is plenty behind type. For a full-bleed hero,
  cut a tall 720×1280 version for the phone, or set `object-position` on the subject.
- **Clean:** no slate, title card, logo, watermark or burned-in caption. NASA and archive films often
  open with a slate, and the source's poster frame may be that slate. No recognisable person who could
  be taken for the client's staff or customers.
- **Never the client's own:** a found clip of a roastery is not this roastery.
- **Found clips: one per page, two at most.** A found clip shows the world around the client; a
  third makes a theme of it. The project's own footage can carry more: in the study a site with
  footage carries a median of three or four clips. Either way, **one moving picture per screen**;
  two loops running side by side are noise.

**On the page.**

- Muted, looping, inline, with a poster and a fixed size, as `--get` prints it:
  `<video autoplay muted loop playsinline preload="metadata" poster="assets/river-poster.jpg"
  width="854" height="480" aria-hidden="true"><source src="assets/river.webm" type="video/webm"></video>`.
  No sound and no controls on a decorative loop. `aria-hidden` because it is decoration: whatever the
  clip says that matters belongs in the text beside it.
- The poster shows before the clip plays, on slow connections and under reduced motion, so it must
  work as a picture on its own. If the source's still is a slate or a blur, take a frame from the clip
  yourself or use a found picture.
- In the study only 31% of clips had a poster, and the panel recorded the blank and grey boxes
  before they played as faults. Here every clip has one.
- Play a clip only while it is in view, and none under `prefers-reduced-motion: reduce`, where the
  poster shows instead:

  ```html
  <script>
    const calm = matchMedia('(prefers-reduced-motion: reduce)');
    const clips = [...document.querySelectorAll('video[autoplay]')];
    const inView = new Set();
    const sync = (v) => {
      if (calm.matches) return;
      if (inView.has(v)) v.play().catch(() => {}); else v.pause();
    };
    const settle = () => {
      for (const v of clips) {
        if (calm.matches) { v.removeAttribute('autoplay'); v.pause(); v.load(); }
        else if (inView.has(v)) v.play().catch(() => {});
      }
    };
    const watch = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) inView.add(e.target); else inView.delete(e.target);
        sync(e.target);
      }
    }, { threshold: 0.2 });
    clips.forEach((v) => watch.observe(v));
    settle();
    calm.addEventListener('change', settle);
  </script>
  ```

- Crop and place it like a photograph (sections 5 and 6): `object-fit: cover`, one ratio, square
  corners, no frame, a ground-coloured `background-color` while it loads.
- Never under body text. On a clip put a headline, one line and one action at most, and check the
  contrast where they sit across the whole loop, not only on the poster: footage that is dark at
  one second can be bright at the next. If any frame drops below 4.5:1 (3:1 for 24px and up), use the
  scrim in section 6 or move the text off the clip. Nothing lies on top of a headline or a statement.
- It is motion: let it be the page's one moving thing, or sit in a section where nothing else moves.
- Credit it with the pictures: `--credits` prints one footer line for both ("Pictures and footage:")
  and the list for the report, with each clip's length.
- Where footage goes (hero background, inline loop, the frame that grows, a docked card), and what
  the study measured about it: section 12. Nothing that matters plays on hover only, and a full film
  with sound sits behind a play button that opens a player with controls.

## 12. Where pictures and footage go

What strong pages do with their pictures, measured on the latest 100 Awwwards Sites of the Day
(10 July to 17 October 2026, captured at 1440×900 and 390×844). 91 were usable. A panel described where
every picture sat and scored each site the Awwwards way, and a script measured how much of each screen
is picture. "Top" means a panel score of 7.5 or more (36 sites), "lowest" under 7.3 (16 sites). The
scores sit close together (6.7 to 7.9) and a single score carries about half a point of noise, so read
the links between a placement and the score as leanings, not laws.

### How much of each screen is picture

- **All or nothing.** Counting photographs, footage and picture backgrounds (not canvases), the median
  scrolled screen in the study is 16% picture, but few screens sit near it: 42% hold no picture and
  19% are 90% picture or more. Only 19% fall between 20% and 60%. A picture either leads its screen or
  stays out of it.
- **About a third, with rests.** On the 67 sites that put pictures in the page, the average screen is
  36% picture (middle half 18–69%). Top sites sit at 30% and leave 28% of their screens with no picture
  at all: screens of type are the rests between picture screens.
- **The first screen.** A picture covers at least half of it on 41% of the sites and nearly all of it
  on 32%. A full-bleed photograph or film is the whole first screen on 29%; footage is the main hero
  picture on about a quarter.
- **A scene is not a picture.** 66 of the 91 keep a WebGL canvas over at least 30% of the screen, so
  counting canvases the median screen is entirely covered. On the lowest-scored sites that canvas is
  often all there is: the five lowest usable sites (6.7 to 7.0) draw everything in it and put two
  pictures at most in the page.
- **Text is small in area.** The median screen is 8% text. Type is set large and sparse around the
  pictures, not packed beside them.
- **Off-centre.** Measured per section across the crawled sites, pictures sit to the left or right
  939 times, centred 273 times, and full-bleed or behind text 269 times.
- **The phone carries more picture,** not less: 19% of a phone screen at the median, and 27% of the
  first phone screen against 17% on desktop. Full-bleed pictures re-crop to portrait and fill the
  screen; splits put the picture first at full width.

### How many

- **Seven pictures per page** at the median (middle half 1–25). Top sites 8 (middle half 4–27), lowest
  2 (0–4). The floor in SKILL.md step 6, four and usually six to twelve, is the strong half of the
  study.
- **Footage on 42% of sites:** on half of the top sites and half of the middle band, and on one of the
  16 lowest. A site with footage carries a median of three or four clips.
- **Three to five placements.** Sites that use two or fewer of the placements below average 7.31;
  sites that use three or more average about 7.5. The median top site uses four, the median lowest
  site one. Where the pictures go changes from section to section on a designed page.

### The placements, ranked

| Placement | Sites (of 91) | Top (of 36) | Lowest (of 16) | Mean score with / without |
| --- | --- | --- | --- | --- |
| Split: picture in a half or two-thirds | 32 | 17 | 2 | 7.50 / 7.38 |
| Horizontal gallery | 32 | 13 | 4 | 7.44 / 7.41 |
| Full-bleed band between sections | 31 | 14 | 3 | 7.48 / 7.40 |
| Full-bleed picture or film as the first screen | 26 | 10 | 3 | 7.45 / 7.41 |
| Uneven mosaic | 25 | 11 | 1 | 7.49 / 7.40 |
| Picture held while text scrolls | 23 | 12 | 1 | 7.52 / 7.39 |
| Footage behind text | 22 | 8 | 2 | 7.46 / 7.41 |
| Even grid | 20 | 11 | 2 | 7.48 / 7.41 |
| Scattered collage | 19 | 6 | 3 | 7.47 / 7.41 |
| Panel sliding over a held picture | 19 | 8 | 2 | 7.48 / 7.41 |
| Inset frame that grows | 17 | 7 | 1 | 7.52 / 7.40 |
| One picture centred on a field | 14 | 5 | 3 | 7.38 / 7.43 |
| Cut-out object on a flat field | 13 | 7 | 1 | 7.57 / 7.40 |
| Index with hover preview | 12 | 6 | 1 | 7.49 / 7.41 |
| 3D gallery | 12 | 4 | 4 | 7.30 / 7.44 |
| Small card docked in a corner | 11 | 5 | 1 | 7.47 / 7.42 |
| Picture inside or in front of display type | 11 | 7 | 1 | 7.50 / 7.41 |
| One small picture beside a statement | 8 | 5 | 0 | 7.56 / 7.41 |
| Small pictures between words | 6 | 4 | 0 | 7.52 / 7.42 |

- Found on top pages more than their share and almost never on the lowest: the split, the picture held
  while text scrolls, the uneven mosaic, the inset frame that grows, the cut-out on a flat field, and
  pictures set with the type (the last three rows together: 24 sites, 16 of them top, 1 lowest).
- The horizontal gallery is common in every band and lifts nothing. Use it where browsing is the point.
- The 3D gallery is the one placement that goes with lower scores, and with the lowest usability in the
  table (5.9 against 6.35 for all sites).

### Each placement

Each entry gives when to use it, the geometry at 1440×900, the phone version and how it fails.

**Split: picture in a half or two-thirds**

- *When.* A claim and the picture that proves it. The commonest way strong pages pair words and a
  picture.
- *Geometry.* The picture takes 42% of the width at the median (middle half 33–49%), up to two-thirds,
  at the full height of its section: 680×850 and 720×900 are typical. 38% of these pictures are
  portrait, mostly 4:5 or 3:4. The text starts on the 50% line (x = 720) or on the line where the
  picture ends, top-aligned or docked low, not centred in its half. Let the picture touch the viewport
  on its outer side: only about 30% do in the study, and the ones with margin on every side read as
  placed by default (section 5). Alternate sides only across three or more rows.
- *Phone.* Picture first at full width (4:5, or 4:3 for a landscape), text under it.
- *Fails.* The same split in three sections running; a picture floating in the middle of its half; a
  text column narrower than about 30 characters.

**Full-bleed band**

- *When.* One picture carries a whole screen between type screens: the place, the work, the object at
  full size. One every three or four screens at most.
- *Geometry.* 100% wide and one to one and a half screens tall (median 900px at 1440×900, middle half
  890–1,170px; ratios 1.4 to 1.9). For a slow parallax the picture is oversized in its frame by 4–10%
  (32–72px a side in the study) and travels no further than that. Text is a headline and one line, or
  nothing, docked 32–64px in from a corner over the calm part of the picture.
- *Phone.* A portrait re-crop that fills the screen, with `object-position` set on the subject; the
  text moves to the bottom quarter.
- *Fails.* 11–14px white text over a bright area; three bands with nothing between them; a band that
  only decorates.

**Picture held while text scrolls**

- *When.* A list, steps or a long paragraph that all belong to one picture. If the picture changes for
  each item, it is the index with a preview, below.
- *Geometry.* A 100vh sticky stage inside a section two to six screens long (runways of 1,800–5,400px
  are typical in the study). The picture holds one half (685×880 is a typical portrait), two-thirds, or
  the whole screen with the text passing over it on a solid panel. Text rows about 150px apart, so two
  or three are in view at once.
- *Phone.* Release the stick: picture first, text under it. If the picture swaps per item, keep it as
  a band in the top 40% of the screen.
- *Fails.* Long runways where the text has faded out and the held picture is all that is left (the
  panel recorded several empty stages on phones); body copy set on the held picture.

**Inset frame that grows**

- *When.* Once per page, for the film or picture the page is about, as the move from type into
  picture.
- *Geometry.* The frame starts centred at 35–50% of the width (549×366, 710×480 and 864×540 in the
  study) or as a 16px inset round a full screen, and grows to the full width and height over
  720–2,700px of scroll. Any corner radius goes to 0 as it reaches the edges. A headline sits above it
  before it starts; nothing else on the screen moves while it grows.
- *Phone.* Start at full width inside the 16px margins and grow to a full-bleed portrait, or skip the
  growth.
- *Fails.* The growth is the only thing on screen for three scrolls; a loading spinner or a blank box
  in the first frame (give it a poster, start loading before it enters); used twice.

**Uneven mosaic**

- *When.* A body of work, or one place seen several ways: five to twelve pictures.
- *Geometry.* Two columns, or rows of three on a 24-column grid. Two or three picture widths (for
  example 32%, 48% and 65% of the width, or 5, 7 and 12 columns), neighbours offset vertically by
  120–190px, 130–450px between rows, one or two ratios, a caption under each.
- *Phone.* One column alternating full width and about 70% width, or two columns of 120–180px tiles
  that keep the offsets.
- *Fails.* Random ratios with random offsets, which read as a stock dump. Captions in 9–12px mono with
  index numbers, the award-site habit: here the caption is one line in the text face at body size, with
  no number.

**Horizontal gallery**

- *When.* A set people browse in any order: products, rooms, events, a team.
- *Geometry.* Cards 25–35% of the width (435×326 with 20px gaps at 1440: three in full and a fourth
  cut by the edge), or a strip at one fixed height with mixed widths (576px tall in the study), or a
  slider whose centre slide is about 73% of the width with 170–180px of each neighbour showing. Always
  cut by the right edge so it reads as more. A marquee of pictures moves slowly: 60–120s per loop.
- *Phone.* One card at 75–80% of the width (290–300px of 390) with the next one showing; swipe.
- *Fails.* Arrows and no drag or swipe; a marquee of things people need to read; a carousel holding the
  page's one important picture.

**Panel sliding over a held picture**

- *When.* A change of chapter: the picture holds, and the next section rises over it.
- *Geometry.* The picture is sticky at 100vh; the next section's ground slides up over it at full width,
  its top edge straight or shaped from the subject (the study has the arch of a building's windows).
  Here it is a solid panel with square corners: no rounded sheet tops, no frosted glass.
- *Phone.* Unchanged.
- *Fails.* Decks of five or six cards whose earlier cards linger as slivers; stacking for its own sake.

**Even grid**

- *When.* An archive only (layout.md §5): a shop range, the team, a menu, the full list of work.
- *Geometry.* Two, three or four across, equal cells, 8–16px gaps, one ratio (4:5 is the commonest),
  the caption under each picture.
- *Phone.* Two across for products, one for work and people.
- *Fails.* Three equal cards as "features". Cards with a dark gradient at the foot so the label can sit
  on the picture, common in the study: here the label goes under the picture.

**Index with hover preview**

- *When.* A list of eight or more projects or clients where the names matter as much as the pictures.
- *Geometry.* Rows on a 45–80px pitch, names at 30–60px. One picture at a time, about a third of the
  width at 16:9 or a portrait 300–450px tall, at a fixed place (the right half from the 50% line, or
  the centre), swapped within 0.3s. A version that needs no mouse: the names scroll across a picture
  fixed at the centre and the picture shows whichever name is crossing it. In the study the picture
  sits on top of the names; here nothing lies on top of large type, so the names pass in front of it.
- *Phone.* No hover. Give each row a thumbnail about 100px wide, or use the scroll version.
- *Fails.* Pictures that never appear on a touch screen. Rows divided by hairlines, the award-site
  habit: here rows are separated by space, and the active row by ink or a change of ground.

**One picture on a field, or one small picture beside a statement**

- *When.* A pause in the page: a single portrait or object. Or a small picture that gives a statement
  a face.
- *Geometry.* A single centred picture at 3:4 and 75% of the viewport height, on a ground taken from
  the picture. Or a small picture 7–26% of the width (108–374px) beside, above or between the lines
  of a 48–136px statement, aligned to one of its lines.
- *Phone.* The picture above the statement at 60–100% of the width.
- *Fails.* Used as the default for every picture: a picture with equal margins on all sides reads as
  placed by default (section 5).

**Small pictures between words**

- *When.* A statement about the things themselves (materials, people, products), on a screen of its
  own.
- *Geometry.* Two to four chips in the statement, from the cap height to three-quarters of the type
  size tall and one to one and a half times as wide (50×46px in a 60px line; 113×75px between the two
  words of a 150px name), all from one shoot, square corners. Give them a width and height so the lines
  do not jump while they load.
- *Phone.* Keep them inline at the height of the text.
- *Fails.* More than four; chips from different shoots; a chip that carries information the words do
  not.

**Picture inside or behind display type**

- *When.* The object is the subject: a product, a building, a person.
- *Geometry.* A small picture window sits inside a block of 150–200px display type and later opens
  into the next screen; or the object stands behind the type, showing between and around the letters;
  or it touches the edge of the word without covering a letter. In the study the object more often
  stands in front and covers one or two letters, or a line of type runs behind a square picture; here
  nothing lies on top of a headline (the inspector fails large text a fifth or more hidden), so the
  type stays in front.
- *Phone.* Keep it, with the type at about 15vw, and check the word still reads.
- *Fails.* An object over the letters; type displaced or glitched by the picture.

**Cut-out object on a flat field**

- *When.* Products and objects. The highest mean score in the table, on 7 of the 36 top sites.
- *Geometry.* The object at 35–60% of the width on a flat ground taken from its own colours, standing
  on the bottom edge or running off one side, with the type behind or beside it.
- *Phone.* The object at 80–90% of the width under the headline.
- *Fails.* A render floating in a void with no ground; a drop shadow added to a cut-out (no resting
  shadows here; keep a contact shadow only if it was photographed).

**Scattered collage**

- *When.* Archives, ephemera, a festival of many small things. Sparingly: it is about as common on the
  lowest pages as on the top ones.
- *Geometry.* Six to sixteen pictures of 100–300px at a few sizes around a centred heading, never over
  it.
- *Phone.* Re-stack as overlapping pairs in one column.
- *Fails.* Tilted prints and stickers with offset shadows, common in the study and not a treatment
  here (section 6); pictures crossing the text.

**Small card docked in a corner**

- *When.* A standing pointer to the reel or to the next thing.
- *Geometry.* About 216×144 to 240×140, 30–43px from the corner; one per page.
- *Phone.* Drop it, or move it into the flow.
- *Fails.* Content scrolling under it; a second one.

**3D gallery**

- *What.* Pictures on a ring, sphere, helix or tunnel in a WebGL scene, turned by the wheel or by
  dragging.
- *In the study.* 12 sites, 4 of them among the 16 lowest; mean score 7.30 against 7.44, usability 5.9
  against 6.35.
- *Here.* Do not build one. Show the same pictures as an index with previews or a horizontal gallery.

### Footage

**What the study measured.**

- Footage on 38 of 91 sites (42%): 18 of the 36 top sites, 19 of the 39 in the middle, 1 of the 16
  lowest. A site with footage carries a median of three or four clips (middle half 1–8).
- Footage covers at least half of the first screen on about a quarter of the sites, and is full-bleed
  on nearly all of them.
- Clips are short: median 10s, middle half 5–14s; 61% run 10s or less and 88% 20s or less.
- Every decorative clip is muted, loops, plays inline and has no controls. The autoplay attribute is on
  44% of clips; the rest are started by script, mostly as they come into view.
- Only 31% of clips have a poster (13 of the 38 sites). The rest show a blank or grey box until they
  play, and the panel recorded those as blank first paints. Here a poster is required (section 11).
- Sources: 1920×1080 is the commonest, then 1280×720; tall clips at 450×800 or 540×960 for phones and
  portrait tiles. Median source width 1,080px.
- On the page: 16:9 41%, square 19%, portrait (4:5 to 9:16) 25%, 4:3 or 3:2 12%. Corners square on 75%
  (the rest 8px or less, or 20–32px). `object-fit: cover` on 84%, contain on 16% (product strips, letterboxed
  films).

**Where it goes.**

- **Hero background:** full-bleed, cover, often oversized by 1–25% so a drift or zoom never shows an
  edge. Either one slow take or a montage cutting every second or two.
- **Inline, as a picture:** in splits, tiles and cards, at about a third of the width (median 33%,
  middle half 24–45%); a third of these clips are under a quarter of the width and fewer than one in
  ten is full width. Slow, near-still subjects (water, skin, light, a turning object) read as living
  photographs and sit well among stills.
- **The frame that grows** (above), for a reel.
- **A docked card** (above): one small clip in a corner.
- **On hover:** only two or three sites play clips on hover, all of them in an index or list. Nothing
  that matters should play on hover only; phones have no hover.
- **Full films:** about ten sites offer a full film behind a play button that opens a player with
  controls. None autoplays it.
- **Sound:** six sites offer sound behind a toggle; no clip starts with sound.

**How text sits on it.**

- Of about 30 sites with a full-bleed picture or film behind text on the first screen, about 14 set the
  type straight on it and rely on the footage being graded dark where the type sits; about 10 dim it
  (to half brightness, under a 30–40% dark layer, or with a dark fade along the bottom 180–590px);
  about 6 keep the text off the picture, above it or on a solid card.
- What goes on footage in the study is the name or a headline at 47–136px and one short line, docked
  bottom-left or centred. Where body text at 11–14px went on footage or a busy photograph, the panel
  named it as a fault, on top-scored sites too.
- Here: one headline, one line and one action on footage at most, and never body text. Check contrast
  where the type sits across the whole loop, not only on the poster; if any frame drops below 4.5:1
  (3:1 for type of 24px and up), use the scrim in section 6 or a solid band.

**On the phone.** Footage re-crops to a full-screen portrait (a separate tall source, or
`object-position` on the subject); inset frames go full-bleed. One site in the study adds a 40% scrim
on the phone only, where the type covers more of the picture.

### Crops and treatment

- **Ratios.** Of 1,356 pictures and clips measured: 4:5 21%, 16:9 19%, 1:1 16%, 16:10 10%, 3:2 7%, 2:3
  5%, 4:3 5%, 5:4 4%, 3:4 3%, wider than 2:1 6%, 9:16 or taller 3%. Landscape 52%, portrait 33%,
  square 15%.
- **Two ratios do most of the work.** On sites with four pictures or more, the two commonest ratios
  hold 76% of the pictures. The others (five ratios in all at the median) are exceptions with a reason:
  one tall portrait in a run of landscapes, one wide band.
- **Square corners** on 94% of pictures; 62 of the 68 sites with pictures in the page keep at least 80%
  of them square. Where corners are rounded, it is 5px or less on two-thirds of them, or 20–32px on
  card interfaces, one value per site.
- **Cover.** `object-fit: cover` on 78%, contain on 10% (a product on a tile, a letterboxed film).
- **Untouched.** CSS filters touch pictures on only 9 sites, mostly for hover states. A handful use
  black-and-white photography as a set; two multiply scanned paper onto the ground. Several keep the
  interface black, white and grey and let the photographs carry all the colour.
- **Common in the study, not treatments here** (section 6): a fixed grain layer over the whole page
  (about a third of the sites), duotone or tinted photographs, blurred copies behind a picture as a
  glow, tilted prints and stickers with offset shadows.
- **Oversize only by the distance it moves.** 22 sites move pictures with the scroll, oversizing them by
  1–25%. Oversize by the travel and no more, on one picture per screen.
- **Resolution.** The study serves pictures at a median 1.9 times their CSS width, but 17% are served
  smaller than they are shown and full-width pictures at a median of only 1,440px. Here: twice the CSS
  width, capped at about 2,400px (section 4).

### Text over pictures

- In the study, text sits on pictures often and is checked rarely: about 28 notes record text set
  straight on a picture with no scrim, and the faults of 16 sites include text lost over pictures: 8–14px
  labels and body over photographs, and navigation in a difference blend or with no backing passing
  over them.
- Where it works, the text is display size and sits over the calm part (sky, a dark wall, the shadow
  side), docked in a corner or along one edge. Two other forms in the study: a solid card in the
  ground colour inset over the photograph and carrying the heading, and text on the white of a picture
  that fades into the page.
- Here: on a picture put only display text, one short line and one action. Body text, captions and
  labels go beside or under it. Measure contrast at the text's own position (4.5:1, or 3:1 for 24px and
  up). If it fails, move the text to a calmer part, put it on a solid card in the ground colour, or use
  the scrim in section 6. A fixed navigation that passes over pictures gets a solid band, or hides
  while scrolling down.

### Rules for a generator

1. **About a third of the page is picture.** Across the scrolled screens, pictures fill 30–40% of the
   area, and at least one screen in four carries no picture (top sites: 30% and 28%).
2. **A picture leads its screen or stays small.** A leading picture takes at least 60% of its screen;
   an accent stays under 10% of it. Avoid screen after screen of pictures at 20–40%: in the study 42% of
   screens are 0% and 19% are 90% or more.
3. **Three to five placements per page,** and no two neighbouring sections with the same one. Sites
   with two or fewer average 7.31, sites with three or more about 7.5.
4. **Six to twelve pictures, never fewer than four.** Study median 7; top sites 4–27; lowest 2.
5. **Two ratios for at least 75% of the pictures** (76% in the study), a third only for a deliberate
   exception. Defaults: 4:5 for portraits, 16:9 or 3:2 for landscapes.
6. **Square corners on every picture** (94% in the study). If the direction rounds them, one radius of
   4px for every picture and clip.
7. **Split pictures take 42–50% of the width, or two-thirds,** at the full height of the section and
   touching the viewport on their outer side; the text starts on the 50% line. On the phone the
   picture goes first, full width.
8. **Full-bleed bands are 100% wide and 100–150vh tall,** one every three or four screens, oversized by
   10% at most for parallax, with text only in one corner at least 32px in. On the phone, re-crop to a
   full-screen portrait.
9. **One inset frame that grows per page,** from 35–50% of the width to the full screen over
   720–2,700px of scroll, with nothing else moving on that screen.
10. **Horizontal galleries show three cards and a cut fourth:** cards 25–35% of the width with 16–20px
    gaps; on the phone one card at 75–80% of the width with the next one showing.
11. **One moving picture per screen.** Clips of 5–15s (median 10s), muted, looped, inline, with a
    poster, paused out of view; a hero source of 1920×1080 under 10MB, inline clips at 1280×720 or
    smaller under 5MB.
12. **Only display text on a picture:** a headline, one line and one action at most, with contrast
    measured at the text's position across the whole loop. Body text, 16px or more, goes beside or
    under the picture, never on it.

---

## 📄 `references/layout.md`

# Layout

How the page is put together: margins, the grid, where text sits, how sections differ, navigation,
endings and the phone. The direction sheet gives the specific compositions; this file gives the habits
behind them, taken from the panel's notes on the 114 studied sites that scored 7.3 or higher (counts
below are hand tallies from those notes, so read them as "about").

## Contents

1. What strong pages do
2. Margins and the grid
3. Where text sits
4. Empty space
5. The frame: margins, balance and titles
6. Sections: carry the idea, vary the arrangement
7. Navigation
8. Endings
9. The phone is a second composition
10. How pages fail

## 1. What strong pages do

- **Tight margins, content to the edges.** About 45 of 114 use outer margins of 32px or less; only
  about 8 use 80px or more. The centred 1100–1300px container is the minority among strong sites and
  the usual frame of the ones the panel called stock.
- **Text hangs from an off-centre line.** About 22 anchor text to one fixed line that is neither the
  centre nor the margin: a third across, 42%, the midpoint.
- **Two or three type sizes with nothing between** (about 30): one very large with one small, or
  everything small with the scale given to the image.
- **One thing per screen** (about 20): one statement, one object, one project.
- **Sections told apart by their ground.** About 20 change the whole background colour at each
  section; about 12 alternate light and dark; about 10 never change and separate by space alone.
- **Sections recomposed, not repeated.** About 14 rearrange every section; about 12 alternate a
  full-bleed image screen with a near-empty type screen.
- **The system broken once, on purpose** (about 14): one centred line on a split page, one paper card
  on a dark page, colour held back until the last screen.
- **Often no navigation bar** (about 45), and endings that are a designed scene rather than link
  columns.
- **Few words.** Median 575 on the whole study; some of the best carry under 200.

## 2. Margins and the grid

```css
:root {
  --margin: clamp(1rem, 2.2vw, 2rem);   /* 16–32px: tight, so content reaches the edges */
  --gutter: clamp(0.75rem, 1.4vw, 1.5rem);
}
.wrap { padding-inline: var(--margin); }
.grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); column-gap: var(--gutter); }
```

- One pair of margins and one grid for the whole page. Every left edge is a column line.
- Do not wrap the page in a `max-width: 1200px; margin: auto` container by reflex. Let large things
  (type, images, colour fields) run the full width, and constrain only the measure of running text
  (`max-width` in `ch` on the paragraph, not on the page).
- On very wide screens cap the layout at about 1760–1920px, or let type sized in `vw` stop growing with
  a `clamp()`.
- Directions that call for wide margins (uneven photographs, the quiet instrument) say so on the
  sheet; follow the sheet.
- Never draw the grid. Column lines, crosshairs and guides are banned ornaments here even though they
  are fashionable; the grid is felt through alignment.

## 3. Where text sits

- **Pick the anchor line and reuse it.** If the hero headline starts at column 5, the section
  headings, the pricing figure and the footer links start there too. Two or three anchor lines on a
  whole page; six means nothing was decided.
- **Off-centre beats centred.** A heading in the left third with its paragraph in the far-right
  column on the same baseline and nothing between; a headline in the bottom third under a deliberate
  void; text docked in corners with the middle given to the picture.
- **Opposite ends.** Two short texts at opposite ends of one baseline (name left, one-line description
  right) is the commonest alternative to the centred stack.
- **Centred is a decision.** When a strong page centres, it uses one axis with wide empty flanks and a
  single element per screen, not a centred stack of heading, paragraph and two buttons.
- **Rows for long copy:** heading in the left third, body in the right two-thirds, the same split for
  every row on the page.
- Stagger sparingly: a second line indented by a third so a two-line headline steps across the screen.

## 4. Empty space

Empty space is placed, not left over. In the study of 97 Sites of the Day captured in October 2026,
readers judged every large empty area either a rest, which something closes, or a hole, which nothing
closes. Strong sites have plenty of rests. About half of them still leave at least one hole, and the
holes are what visitors name ("big random blank spaces").

**A void is placed when something closes it.** In the readers' notes the closer is, most often:

- the picture itself (sky, ground, the object, the film) with the type docked at its edge;
- a picture across the void: the photograph at the far side of an empty band, the full-width row
  rising under a statement, the opposite picture in a stagger;
- the type: a headline large enough to span the space, or two short texts at the two ends of one
  baseline;
- on a one-screen page, the wordmark, the navigation and one fact in the corners, like a mount around
  a print.

About one closer in five in the study is a hairline or grid line. That device is banned here; close the
void with the picture, the type, a step in ground tone or a field of flat colour.

**Where holes come from.** In order of frequency in the study:

1. A gap between sections stretched too far: bands of 250–760px of plain ground.
2. Text in one half of a section and nothing in the other.
3. Content that arrives late: a reveal not yet fired, so the visitor scrolls onto bare ground while the
   words fade in.
4. A short block stretched to a full screen: a footer padded to the viewport height, a section title
   alone on a whole screen.
5. A pinned scene that holds almost nothing for several screens.
6. Pictures of different heights top-aligned in a row, leaving a hole under the short one.

**Rules**

- Decide where the void is and name what closes it. If nothing does, it is a hole: move the section's
  picture into it, make the main element bigger, or take the space out.
- Keep the void clean: no stray caption, no decorative shape, no faint watermark, no grid lines.
- Sections sit 120–240px apart on desktop, counted from the last line of one to the first line of the
  next (the median in the study is about 230–250px), and 72–112px on a phone. A change of ground
  colour lets the gap be a little smaller. More than about 40% of a screen of plain ground between two
  sections is a hole.
- The gap between sections is clearly larger than any gap inside one. Related things sit close and
  unrelated things far; a heading has at least twice as much space above it as below.
- No stretch of the page taller than about half a screen holds nothing at all. In the study, runs of a
  screen or more with nothing in the page were almost always scroll distance for a pinned scene; the
  pinned stage must then hold something at every scroll position.
- Content is in place on the first paint. An entrance moves what is already there (see `motion.md`);
  it never leaves a screen of bare ground while the words arrive.
- Size a section to its content. `min-height: 100vh` belongs to a section that fills the screen, not
  to a footer or a lone heading.
- In a row of pictures of different heights, align the bottoms or put something under the short one,
  or crop the row to one ratio.
- A rest is one thing on a screen: a single line, one object, one picture or a field of colour. Once
  per page at most. A screen of nothing is never a rest, and the inspector fails two near-empty screens.
- When a section looks empty, the answer is almost never "add something". Make the main element
  bigger, or cut the section.

## 5. The frame: margins, balance and titles

The frame is what readers judge before any detail: "no good margin", "everything is shifted to one
side", "no clear title", "random unclear sections". The inspector measures each of these. The numbers
are from the study of 97 Sites of the Day (October 2026).

**One pair of equal margins.**

- The left and right margins are the same, at every width. On the studied sites with scrolling
  sections the two sides match to a few pixels: 16 and 16, 20 and 21, 32 and 32, 140 and 137. No
  strong page in the study was pushed to one side.
- The usual margin is tight: median about 28px at 1440, half the sites between about 18 and 45px, a
  few at 80px or more. Here it is 16–32px (section 2), and never under 16px at any width, on the phone
  included. About one award site in seven sets text 8–15px from the edge; that studio habit is
  excluded here.
- The navigation sits on the same margins as the content. The commonest small fault in the study is a
  header on one inset and the page on another (40px against 20px, or 34px on the left against 10px on
  the right).
- A bleed is deliberate and starts from the margin: a row of pictures that runs off the right edge
  begins on the left margin; a display line that bleeds starts or ends on one. A bleed never moves the
  margin.
- Asymmetry belongs inside the frame: an off-centre anchor line (a third across, 42%, the centre line)
  on symmetric margins.

**Use the width the page has set up.**

- In the study about one text section in a hundred leaves half the width empty. Text that sits in one
  half is common, in roughly one site in three, but the other half then holds the section's own
  picture (most often), a full-bleed picture behind the text, a second column, a list or a figure.
- When the text takes one side, put the picture, the second column, the list or the large number on
  the other. Never leave the other half to plain ground.
- The middle counts too: a card at the left edge and a lone button at the right with the middle third
  empty is the same hole.
- The first screen counts too. When the sentence and the button take the left third above a name
  docked at the foot, the upper right holds something (the picture or film, one fact, the action) or
  the name grows up to meet them; in testing, 60% of a first screen left as plain ground under the
  navigation read as a hole, and the inspector now warns when one empty block takes 28% of the first
  screen or more.
- A display line fitted to the width is fitted by measurement (a small script that sets its size from
  the content box, or SVG text with `textLength`), never by a size guessed for one face: a name that
  starts on the margin and runs a few pixels off the other edge reads as a mistake.
- A centred composition has one axis, equal flanks and one thing on it, not a stack of heading,
  paragraph and two buttons.

**A title that says what this is, on the first screen.**

- Asked whether a stranger could say what the page is within five seconds, readers found that 40 of
  the 97 first screens say it in words, 42 say it only through pictures, small print or a bare name,
  and 15 do not say it at all. The last group lost usability and content points, not design points.
- Size alone does not do it: 66 of the 97 first screens carry a display-size line, but 26 of those are
  a name, a slogan or a place with nothing saying what is offered.
- The first screen has one `h1`, at display size (32px or more on desktop; on the clear first
  screens in the study mostly 50–150px), two lines at most, that says what this is: the name with
  what it does, the product with what it is for, the event with its date and place. If the `h1` is
  the name, the line under it, at 18px or more, says what the thing is.
- It is there on the first paint. About a third of the studied pages still showed a loader or nothing readable 4.5
  seconds.

**A heading on every section.**

- 82% of the text sections on the studied sites open with a heading: median 57px (40–96px for the
  middle half), about three and a half times the body size, one or two lines.
- Headings start on the outer margin or on the page's inner anchor line (in the study about a third
  each) and in the same place for every section. About a quarter of the headings in the study are
  centred; centre one moment per page here.
- Where a studied section has no heading, the usual stand-in is a small label: caps, mono or a number
  in brackets. All three are banned here. Put the label's words in a heading in the heading face at the
  section size ("The rooms", "How it works", "Prices"), set them on the anchor line, and let the first
  sentence carry the rest.
- A statement can open a section as its heading only when it names what the section holds.

## 6. Sections: carry the idea, vary the arrangement

The most common failure in every score band is a distinctive first screen followed by stock blocks:
icon cards, a three-up row, an accordion, a link-column footer. About 25 of the studied sites lose
points this way, including several above 7.5.

- **The idea survives to the last pixel.** Ask of each section, pricing and FAQ included: what does
  the page's idea do here? If the page is a menu, the prices are menu lines. If the name is a
  monument, the footer is the name again. If the object's shape is the motif, the button and the image
  masks carry it.
- **No two neighbours share a layout.** Use the shape of each dealt blueprint (list, split, statement,
  full-bleed, mosaic, table, strip, pinned …). Count them in the screenshot; a shape used three times
  is the template showing.
- **Alternate dense and empty, image and type, light and dark** so the scroll has rhythm.
- **A repeated module is for archives only** (a work index, a menu, a schedule). Anywhere else,
  repetition reads as a kit.
- **Break the system once.** After the page has established its rule, one planned exception (a single
  centred line, one inverted section, one image at a different scale) is what makes the rule visible.
- **Short pages are fine.** A quarter of the studied sites are one or two screens. Do not add sections
  to seem complete; each one must carry a claim (see `copy.md` §1).

## 7. Navigation

- The plain form: the wordmark at one end, three to five text links, one action, all at text size on
  the page ground with no bar, border or background. Median link count in the study is 3.
- It is also normal to have less: small links in the corners, a single action, or the navigation
  folded into the content (a list of section titles that is itself the index).
- If it stays fixed, it must never sit on top of content: check every scroll position in the
  screenshots, especially on the phone. Floating pill bars are where the panel most often recorded a
  nav covering text.
- On a phone: wordmark and one action in view; the links go in a simple full-screen sheet opened by a
  text button ("Menu"), or move to the footer when there are only three.
- Navigation is small furniture, however it is drawn. On desktop it takes no more than about a tenth
  of the first screen; on a phone it is one row. A blueprint that builds the navigation as a column of
  colour blocks or a stack of tabs gets that treatment on desktop only, and collapses to one row on
  the phone so the headline, the supporting sentence and the action stay in the first screen. In
  blind tests a nav that ate the hero cost a whole point of usability.

## 8. Endings

- The page should end on a designed scene. In the study: the name at full width (about 18 of 114), the
  hero repeated in inverted colours (about 12), a closing scene of its own such as the one contact
  fact set as a headline (about 14), or simply one quiet line (about 22). Link-column footers appear
  in the panel's notes only as criticism.
- The full-width name is strong but already a studio habit; use it when the direction is name-led,
  otherwise prefer the blueprint dealt for the footer.
- Put the practical facts (address, hours, email, legal line) in the text face at a readable size, on
  the same anchor lines as the rest of the page.

## 9. The phone is a second composition

Design the 390px screen as its own page, not the desktop page squeezed. Strong sites that neglect this
lose usability points; weak ones are often just broken.

- Each blueprint on the sheet has its own phone paragraph. Build it.
- Keep one dominant thing on the first screen. A wordmark that was 20vw wide on desktop might stack on
  two lines at 26vw on the phone and be even stronger.
- Re-author line breaks; re-crop images to portrait (`object-position` per breakpoint, or a different
  crop size in the image URL); keep unevenness with alternating widths rather than making everything
  full width.
- Margins 16–20px. Body text 16–18px. Touch targets at least 44px high.
- Check 390px in the inspector's screenshots for every round: sideways scroll and three-line headlines
  usually appear here first.

## 10. How pages fail

From the panel's notes on the 54 sites scoring under 6.8 (counts out of 54):

- The whole page is the category's stock template; swap the logo and it could be any competitor
  (about 20).
- Centred headline, pill badge, two buttons, screenshot or tile grid below (about 9).
- A distinctive hero, then stock modules in the usual order (about 8, and about 17 more in the middle
  band).
- A default typeface with no character (about 13).
- Text too small or too low in contrast (about 13); legibility lost over busy photographs (about 9).
- An undersized headline and no focal point (about 9).
- The page never says what the thing is, or shows no work (about 12 and 7).
- Thin content stretched over many screens, or a single gag (about 11).
- Gates, preloaders and entry pop-ups before any content (about 9).
- A phone layout that is the desktop shrunk, or broken (about 8).
- Fixed elements sitting on content; careless details such as colliding lines (about 7 and 5).

And the faults of the best sites, which are not to be copied: body text at 9–13px (about 24 of the 90
sites at 7.5 or more), information hidden behind the concept (about 20), the idea running out
mid-page (about 15), text over footage with no scrim (about 12), gates and blank first paints (about
12), floating elements colliding with content (about 11), and a first screen with no statement of what
this is and no action (about 9). Say what the thing is, and offer the action, on the first screen.

---

## 📄 `references/motion.md`

# Motion

Read this before adding any animation. The static page must already be finished and passing
`inspect.mjs`; motion is the last pass, never a way to rescue a weak layout.

## Contents

1. The budget
2. What strong pages do with motion
3. Four questions before any animation
4. Tokens
5. Scroll behaviours, ranked
6. Recipes (copy, then adapt)
7. Signature moves
8. Reduced motion and performance
9. What gives generated motion away
10. Rules for motion

## 1. The budget

A page that does not move reads as a mock-up; the inspector counts what moves while the page loads and
scrolls, and fails it under eight elements. The motion layer has five parts:

- **Two or three scroll scenes:** the big, scroll-driven moments award sites are remembered for (a
  camera flying through a field of pictures, a picture that grows from a window to the whole screen,
  type that crosses a held stage, cards that deal out and stack). The direction sheet deals them from
  `library/scenes.json` when the library has scenes for the brief; `references/scenes.md` says how to
  fill and fit them. They are where the page is bold; everything else stays quiet so they land.

- **One signature moment:** the thing a visitor would describe an hour later: the headline that rises
  out of a mask, the image that opens like a shutter, the wordmark that scales with the scroll. The
  direction sheet from `draw.mjs` names one. Build that one well; it is the only move allowed to be
  loud.
- **Section entrances, choreographed per section:** the parts of each section arrive in reading order
  (heading, text, picture, details), staggered 60–90ms, rising 16–32px with opacity, once. Vary the
  manner with the content instead of stamping one preset everywhere: a list arrives row by row, a
  picture opens from a mask or settles from a slight scale, a figure counts up once, a statement rises
  line by line.
- **Feedback under the hand:** buttons that give on press, links that answer the pointer, cards and
  pictures that respond on hover, a menu that opens from where it was clicked.
- **One moving picture:** a found clip as a muted loop with a poster frame, a slow drift or scale on
  a large photograph, or a scroll-linked move on the hero picture.

What is still banned: the same fade-and-slide-up with the same timing on every block, which is the most
cited motion tell of generated pages; motion that hides content until a script runs, with no fallback;
bounce and elastic easing; anything that animates layout properties. Uniform motion says nobody decided
anything; choreographed motion with one protected moment says somebody did.

## 2. What strong pages do with motion

Measured on the latest 99 Awwwards Sites of the Day (July to October 2026), at 1440 and 390, with
the transitions, tweens and scroll triggers recorded while each page loaded and was scrolled. Where
the gallery does something the house rules ban, the house version follows.

- **The stack.** Two in three use a smooth-scroll library and three in five ship Three.js; GSAP is
  named on 56. The quiet layer below (reveals, line rises, the ink fill) needs none of it: CSS scroll
  timelines and view transitions do that work, though only 3 and 6 of the sites use them. The big
  scroll scenes are built on GSAP ScrollTrigger, as on the award sites, through the shared stage in
  `assets/scenes/` (`references/scenes.md`).
- **Curves.** The curves that really ran are strong ease-outs: expo out (`.16,1,.3,1` and
  `.19,1,.22,1`) ran on 14 sites, cubic out on 13, quint out on 7, and by number of transitions the
  quint and expo outs lead every chosen curve. In-out curves are kept for wipes and things that
  travel (cubic and quart in-out, about 15 sites each). Ease-in appears only for exits, short, before
  a slow arrival. Colour changes use plain `ease` (46 sites). Overshoot sits in 19 stylesheets and
  ran on 2.
- **Durations.** Hover colour 200-300 ms; small interface moves 300-450 ms; reveals and line rises
  600-1,000 ms; picture openings and wipes 1,100-1,600 ms. The median of everything that ran on a
  site is 420 ms.
- **Staggers.** 20-40 ms between characters, 75-120 ms between lines, 50-100 ms between list items.
- **Scroll-linked motion is locked to the scrollbar.** Of the sites that scrub, 14 of 18 lock it with
  no smoothing; the other four smooth it by 0.1-3 s. Reveals fire when the element's top is 80-95% of the way
  down the viewport, once.
- **How much moves.** A median of 130 elements are moved by script on a page, but they come from a
  few gestures: one split heading is 20-60 elements. The inspector's floor (8, warning under 16) is a
  floor, not a target.
- **Waiting is the most common cost.** 60 of 99 open on a loading screen, 26 of them with a counter.
  Half the usable pages were still unreadable 2.5 s after the browser said the page had loaded, a
  third at 4.5 s. The preloaders were not covering slow pages (their documents loaded faster than the
  rest) and the readers' design marks were the same whatever the wait; only usability fell. House
  version: no preloader, the message readable on the first frame, the load sequence over by 1.2 s.
- **Pins cost length.** Two in three scrolling pages hold something sticky or pinned. Those pages
  are twice as long (a median 16.6 screens against 7.5) for fewer words per screen (27 against 46).
  House version: at most two held stages, about one screen per step, three screens per stage.
- **Reduced motion is mostly missing.** 35 of 99 have any `prefers-reduced-motion` rule, 16 have
  three or more; 5 of 26 scroll-scrubbed scenes have one. Every recipe here keeps the finished state
  as the reduced state.

## 3. Four questions before any animation

1. **How often will someone see it?** Once per visit (hero load, a section reveal): it can take its
   time. Many times per visit (hover, menu, accordion): fast and small. Hundreds of times (keyboard
   actions, typing): no animation.
2. **What is it for?** Valid answers: it shows where something came from, it confirms an action, it
   keeps a change from being jarring, it explains how the product works, it is the signature moment.
   "It looks nice" is only valid for the signature moment.
3. **Which easing?** Entering or leaving: ease-out, so movement starts the instant the eye arrives.
   Moving between two places on screen: ease-in-out. Colour and opacity on hover: `ease`. Constant
   travel (marquee, progress): `linear`. `ease-in` makes interfaces feel slow because the first frames
   barely move; do not use it. The CSS keyword curves are weak, so use the tokens below.
4. **How long?** Press feedback 100–160ms. Hover 150–200ms. Menus and popovers 150–250ms. Dialogs and
   drawers 250–450ms. Section and hero reveals 500–900ms. Leaving is quicker than arriving (about 70%).

## 4. Tokens

```css
:root {
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);        /* entrances, moving hovers, UI under 600ms */
  --ease-expo: cubic-bezier(0.16, 1, 0.3, 1);        /* new: reveals of 800ms and longer, line rises, openings */
  --ease-in-out: cubic-bezier(0.76, 0, 0.24, 1);     /* wipes, panels, things that travel while visible */
  --ease-soft: cubic-bezier(0.33, 1, 0.68, 1);       /* slow scale and drift on photographs */
  --ease-exit: cubic-bezier(0.55, 0.055, 0.675, 0.19); /* new: something leaving for good, short */
  --t-press: 140ms;
  --t-hover: 180ms;
  --t-ui: 240ms;
  --t-reveal: 800ms;
  --t-open: 1200ms;                                  /* new: picture openings and clip wipes */
  --stagger-line: 90ms;                              /* new */
  --stagger-item: 70ms;                              /* new */
}
```

How the study bears on each:

- `--ease-out` (quint out) is in 28 stylesheets with its near twin and is the single most frequent
  chosen curve among transitions that ran. Keep it.
- `--ease-expo` is new. Expo out (`.16,1,.3,1` and `.19,1,.22,1`) is in 28 stylesheets and ran on 14
  sites, more than any other chosen family, and it is the curve the long reveals use: line rises,
  picture openings, card entrances of 0.9-1.6 s. Use it for anything at `--t-reveal` or longer; it
  replaces `--ease-out` in the masked headline and the reveal-on-scroll recipes.
- `--ease-in-out` (quart in-out) matches its family (14 stylesheets, 7 ran). Keep it for wipes,
  shutters, menus and page transitions.
- `--ease-soft` (cubic out) matches the cubic-out family (21 stylesheets, 13 ran), but the study uses it
  for interface moves of 0.3-0.8 s, where `--ease-out` already serves. Narrow it to slow scale and
  drift on photographs.
- `--ease-exit` is new. Ease-in is right for exactly one job: something that leaves for good (an
  outgoing caption, a replaced slide, a closing panel), short, at about 60-70% of the matching
  entrance. Never for anything the visitor is waiting to see.
- Not adopted: `.4,0,.2,1` (38 stylesheets) is a framework default, and overshoot curves (19) stay
  banned on interface elements.
- `--t-hover` stays at 180ms. The study's colour hovers run 200-300ms; a little quicker reads as
  more exact. A hover that moves something (a label roll, an arrow) takes `--t-ui` to 400ms.

## 5. Scroll behaviours, ranked

| Behaviour | Pages of 99 | What it serves | House version |
| --- | --- | --- | --- |
| Smooth-scroll library | 67 | A feeling of weight; makes scrubbed scenes easier to build | Optional, through `Stage.smooth()`: Lenis at lerp 0.1-0.14, off for touch and reduced motion |
| Held (sticky or pinned) stage | 44 | One picture or object carries several claims; chapters | Yes: the scroll scenes (`references/scenes.md`), two or three per page, one to four screens each; other sticky stages three screens at most |
| Split text | 40 | Lines and words arriving as they are read; hover rolls | Lines for headings and statements; words only for the ink fill; characters only for a heading of one to three words |
| Colour by chapter | 34 | Tells chapters apart without padding bands | Yes, as hard cuts at section edges; the header ink follows in 300ms |
| Scroll-scrubbed scene (camera, object, image sequence) | 26 | Explains a product by moving it | Yes, from the scene library, built on the shared stage with a finished composition for reduced motion |
| Parallax depth | 24 | Depth in collages; pictures drifting inside oversized frames | Travel under 8% of the element, pictures held at 106-110% in their frames |
| Marquee | 21 | Life on a static band | Existing "Edge-to-edge marquee": one per page, pausable |
| Masked line or word rise | 18 | Headings that arrive like set type | Yes: "Masked line reveal" on load, "Lines that rise on scroll" below the fold |
| Wheel drives a scene, no page scroll | 16 | Browsing one object | Not used (see 2.6) |
| Blur-in | 15 | Soft arrival | At most 8px of blur, 600ms, gone once settled; never on body text |
| Picture from inset frame to full-bleed | 14 | The hand-over from a type screen to the big picture | Yes: "Opening window", about one screen of scroll |
| Grey-to-ink text fill | 14 | Paces one statement | Yes, once per page, starting at 45% ink: "Ink fill" |
| Sheet slides over a held layer | 11 | Page-turn rhythm between chapters | Yes: new move "Sheet over a held picture" |
| Scramble or decode | 11 | A "code" voice | Not used (see 2.6) |
| Header ink by chapter | 10 | The fixed header stays legible | Yes, with colour by chapter |
| Horizontal track pinned to vertical scroll | 8 | Walking through rooms or a collection | Native drag row first; pinned only when the row is under three screens long, with keyboard support: "Sideways gallery" |
| Curtain footer | 8 | The page ends as a scene | Existing move |
| Rolling digits | 6 | Figures that arrive | Yes, for pages whose case is a handful of numbers: "Rolling figures" |
| Index with hover preview | 5 | Navigating work by name | Existing move, upgraded recipe |

Text, split by unit: characters on about 20 pages, lines on about 14, words on about 11. Character
splits serve short headings and button rolls; on long statements they leave fragments mid-scroll.

## 6. Recipes

All recipes keep the content visible when JavaScript is off, put every hidden state inside
`prefers-reduced-motion: no-preference`, and use the tokens above. Two notes that apply to several:

- **Scroll timelines need a scroller to watch.** `animation-timeline: view()` takes the nearest scroll
  container, and `overflow: hidden` makes one. A picture inside an `overflow: hidden` frame therefore
  never animates. Use `overflow: clip` on frames, or name the timeline on the section
  (`view-timeline-name: --hero`) and point the children at that name. This also applies to the
  existing "Scroll-linked progress" recipe.
- **Scroll-linked means linear.** The scroll is the easing. 14 of the 18 scrubbing sites in the study
  lock motion to the scrollbar, which is what CSS scroll timelines do.

All recipes keep content visible when JavaScript is off or slow: the hidden state only applies under
`html.js`, which a one-line inline script sets.

```html
<script>document.documentElement.classList.add('js')</script>
```

### Load sequence in 1.2 seconds

Everything is in the HTML and painted on the first frame; the sequence only adds arrival. Nothing
waits for the load event, and nothing in the navigation animates.

```html
<header class="hero">
  <h1 class="display lines">
    <span class="line"><span data-line style="--i:0">Stools for</span></span>
    <span class="line"><span data-line style="--i:1">small kitchens</span></span>
  </h1>
  <p class="lead" data-load style="--d:420ms">…</p>
  <a class="button" data-load style="--d:480ms" href="#stools">See the stools</a>
  <figure class="hero__picture" data-open><img src="stool.jpg" alt="…" fetchpriority="high"></figure>
</header>
```

```css
.hero__picture { overflow: clip; margin: 0; }
@media (prefers-reduced-motion: no-preference) {
  .js .hero [data-line] { transform: translateY(105%); animation: load-line 800ms var(--ease-expo) forwards; animation-delay: calc(100ms + var(--i) * var(--stagger-line)); }
  .js .hero [data-load] { opacity: 0; transform: translateY(12px); animation: load-rise 500ms var(--ease-out) forwards; animation-delay: var(--d); }
  .js .hero [data-open] { clip-path: inset(0 0 100% 0); animation: load-open 1000ms var(--ease-in-out) 150ms forwards; }
  .js .hero [data-open] img { transform: scale(1.08); animation: load-settle 1100ms var(--ease-expo) 100ms forwards; }
}
@keyframes load-line { to { transform: none; } }
@keyframes load-rise { to { opacity: 1; transform: none; } }
@keyframes load-open { to { clip-path: inset(0); } }
@keyframes load-settle { to { transform: none; } }
```

The timeline: the headline's lines rise from 100 to 990 ms, the picture opens from 150 to 1,150 ms,
the sentence and the button arrive from 420 to 980 ms. All settled by 1.2 s, four things at most.
Preload the display font (`<link rel="preload" as="font" type="font/woff2" crossorigin>`) so the lines
rise in the real face, and give the picture `fetchpriority="high"` and a ground colour sampled from it,
so a slow image opens onto its own colour rather than a blank box. Study: 22 of 91 pages were readable
at the first intro frame and 11 more by 1.2 s; the intros the readers called respectful finished in
about 1-1.2 s; a third of the pages were still unreadable at 4.5 s.

### Masked line reveal (the classic gallery headline)

Each line slides up from behind its own baseline. Because headlines are capped at two lines, you set
the line breaks yourself and wrap each line.

```html
<h1 class="lines">
  <span class="line"><span data-line style="--i:0">Stools for</span></span>
  <span class="line"><span data-line style="--i:1">small kitchens</span></span>
</h1>
```

```css
.lines .line { display: block; overflow: hidden; padding-bottom: 0.08em; margin-bottom: -0.08em; }
.lines [data-line] { display: block; }
@media (prefers-reduced-motion: no-preference) {
  .js .lines [data-line] {
    transform: translateY(105%);
    animation: line-up 900ms var(--ease-out) forwards;
    animation-delay: calc(var(--i) * 110ms + 150ms);
  }
}
@keyframes line-up { to { transform: none; } }
```

The `padding-bottom` / negative margin pair stops descenders (g, y, p) being clipped by the mask.
On a narrow phone the two authored lines may each wrap; check the mobile screenshot, and if they do,
author a shorter mobile break with a `<br class="only-wide">` pattern or reduce the size.

### Reveal on scroll (once)

For the two or three sections that deserve it, not for every block.

```css
@media (prefers-reduced-motion: no-preference) {
  .js [data-reveal] { opacity: 0; transform: translateY(24px); transition: opacity 700ms var(--ease-out), transform 900ms var(--ease-out); }
  .js [data-reveal].is-in { opacity: 1; transform: none; }
}
```

```js
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });
document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
```

Never attach reveals with a scroll listener, never replay them when the element re-enters, and never
leave anything at `opacity: 0` if the observer fails to fire (the `html.js` gate handles no-JS; the
`unobserve` handles replays).

### Image shutter

An image opens from one edge while scaling down slightly inside its frame. Gallery staple; use it for
the one hero or showcase image.

```css
.shutter { overflow: hidden; }
@media (prefers-reduced-motion: no-preference) {
  .js .shutter { clip-path: inset(0 0 100% 0); transition: clip-path 1100ms var(--ease-in-out); }
  .js .shutter img { transform: scale(1.12); transition: transform 1500ms var(--ease-soft); }
  .js .shutter.is-in { clip-path: inset(0); }
  .js .shutter.is-in img { transform: none; }
}
```

### Press and hover

```css
.button { transition: transform var(--t-press) var(--ease-out), background-color var(--t-hover) ease, color var(--t-hover) ease; }
.button:active { transform: scale(0.97); }
.link { text-decoration: underline; text-decoration-color: transparent; text-underline-offset: 0.2em; text-decoration-thickness: 0.07em; transition: text-decoration-color var(--t-hover) ease; }
@media (hover: hover) and (pointer: fine) {
  .button:hover { background-color: var(--accent-strong); }
  .link:hover { text-decoration-color: currentColor; }
}
```

Hover styles go behind `(hover: hover)` because touch devices fire hover on tap and leave it stuck.
Hover should raise contrast, never lower it. Do not change font weight on hover (the text reflows).
Do not lift or scale every card on hover; one consistent, small response is enough.

### Scroll-linked progress without JavaScript

For a wordmark that scales as the hero leaves, an image that drifts a few percent, or a progress bar.
Wrap in `@supports` so browsers without scroll timelines get the static state.

```css
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .drift { animation: drift linear both; animation-timeline: view(); animation-range: entry 0% exit 100%; }
    @keyframes drift { from { transform: translateY(-4%); } to { transform: translateY(4%); } }
  }
}
```

Keep the travel small (under 8% of the element). Large parallax makes text hard to read and looks
dated.

### Pinned story

A section whose heading stays put while items pass. Use `position: sticky`; do not hijack scrolling.

```css
.story { display: grid; grid-template-columns: 5fr 7fr; gap: var(--gutter); align-items: start; }
.story__title { position: sticky; top: 18vh; }
@media (max-width: 800px) { .story { grid-template-columns: 1fr; } .story__title { position: static; } }
```

### Index with preview, anchored to the row

Rows of names; pointing at a row or tabbing to it opens one frame level with that row. The frame
follows the row, never the pointer.

```html
<section class="index">
  <ul class="index__list">
    <li><a class="index__row" href="/work/harbour-house" data-preview="/img/harbour-house.jpg">
      <span class="index__name">Harbour House</span><span class="index__year">2025</span>
      <img class="index__thumb" src="/img/harbour-house-small.jpg" alt="" loading="lazy" width="640" height="400">
    </a></li>
    <!-- … -->
  </ul>
  <div class="index__frame" aria-hidden="true"><img alt=""></div>
</section>
```

```css
.index { position: relative; }
.index__list { list-style: none; margin: 0; padding: 0; }
.index__row { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 0 var(--gutter); padding-block: 0.3em; font-size: var(--step-head); color: inherit; text-decoration: none; transition: opacity var(--t-hover) ease; }
.index__thumb { order: -1; flex-basis: 100%; width: 100%; height: auto; margin-bottom: 0.4rem; }
.index__frame { display: none; }
@media (hover: hover) and (pointer: fine) {
  .index__list { max-width: 62%; }
  .index__thumb { display: none; }
  .index__list:has(.index__row:hover, .index__row:focus-visible) .index__row:not(:hover, :focus-visible) { opacity: 0.4; }
  .index__frame { display: block; position: absolute; top: 0; right: var(--margin); width: 30%; aspect-ratio: 4 / 3; z-index: 1; pointer-events: none; clip-path: inset(100% 0 0 0); transition: clip-path 320ms var(--ease-out), transform 360ms var(--ease-out); }
  .index__frame.is-open { clip-path: inset(0); }
  .index__frame img { width: 100%; height: 100%; object-fit: cover; }
}
@media (prefers-reduced-motion: reduce) { .index__frame { transition: none; } }
```

```js
(() => {
  const root = document.querySelector('.index');
  if (!root) return;
  const frame = root.querySelector('.index__frame');
  const picture = frame.querySelector('img');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let warmed = false;
  const show = (row) => {
    if (!fine.matches) return;
    if (!warmed) { warmed = true; root.querySelectorAll('[data-preview]').forEach((a) => { new Image().src = a.dataset.preview; }); }
    picture.src = row.dataset.preview;
    const y = row.offsetTop + row.offsetHeight / 2 - frame.offsetHeight / 2;
    const max = root.offsetHeight - frame.offsetHeight;
    const opening = !frame.classList.contains('is-open');
    if (opening) frame.style.transitionProperty = 'clip-path';   // open in place, do not slide in from the top
    frame.style.transform = `translateY(${Math.min(max, Math.max(0, y))}px)`;
    if (opening) { frame.getBoundingClientRect(); frame.style.transitionProperty = ''; }
    frame.classList.add('is-open');
  };
  const hide = () => frame.classList.remove('is-open');
  root.querySelectorAll('.index__row').forEach((row) => {
    row.addEventListener('pointerenter', () => show(row));
    row.addEventListener('focus', () => show(row));
  });
  root.addEventListener('pointerleave', hide);
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) hide(); });
})();
```

On touch screens each row shows its own picture above the name. Study: 5 pages navigate work this way;
frames from about 470x270 to large plates behind the list; the other rows dimmed to about 0.3 (0.4 here, the floor for dimmed text). The
image trails and cursor-borne previews seen elsewhere in the study are the gimmick version.

### Lines that rise on scroll

For a section heading or a statement whose line breaks you do not control. Splits after the fonts
load, reveals once, then gives the plain text back so it rewraps normally. Plain text only (no links or
emphasis inside).

```html
<h2 class="head" data-lines>Turned by hand in one small workshop</h2>
```

```css
[data-lines] .line { display: block; overflow: clip; padding-bottom: 0.12em; margin-bottom: -0.12em; }
[data-lines] .line > span { display: block; }
@media (prefers-reduced-motion: no-preference) {
  .is-split .line > span { transform: translateY(110%); }
  .is-split.is-in .line > span { transform: none; transition: transform 900ms var(--ease-expo) calc(var(--i) * var(--stagger-line)); }
}
```

```js
(() => {
  const els = [...document.querySelectorAll('[data-lines]')];
  if (!els.length || !('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const restore = (el) => { el.textContent = el.dataset.text; el.classList.remove('is-split', 'is-in'); };
  const split = (el) => {
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    el.dataset.text = text;
    el.textContent = '';
    const words = text.split(' ').map((word) => {
      const s = document.createElement('span');
      s.style.display = 'inline-block';
      s.textContent = word;
      el.append(s, ' ');
      return s;
    });
    const lines = [];                                   // group the words by the line they landed on
    for (const w of words) {
      const last = lines.at(-1);
      if (last && Math.abs(last.top - w.offsetTop) < 4) last.words.push(w.textContent);
      else lines.push({ top: w.offsetTop, words: [w.textContent] });
    }
    el.textContent = '';
    lines.forEach((line, i) => {
      const mask = document.createElement('span');
      const inner = document.createElement('span');
      mask.className = 'line';
      inner.style.setProperty('--i', i);
      inner.textContent = line.words.join(' ');
      mask.append(inner);
      el.append(mask, ' ');
    });
    el.classList.add('is-split');
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      e.target.classList.add('is-in');
      e.target.querySelector('.line:last-of-type > span')
        .addEventListener('transitionend', () => restore(e.target), { once: true });
    }
  }, { rootMargin: '0px 0px -12% 0px' });
  document.fonts.ready.then(() => els.forEach((el) => { split(el); io.observe(el); }));
  let width = innerWidth;                               // a width change before the reveal: give the text back
  addEventListener('resize', () => {
    if (innerWidth === width) return;
    width = innerWidth;
    els.filter((el) => el.matches('.is-split:not(.is-in)')).forEach((el) => { io.unobserve(el); restore(el); });
  });
})();
```

Study: masked rises from 100-120% below the line, 0.6-1.2 s, 75-120 ms between lines, triggered when
the block's top is 80-95% down the viewport. Reduced motion: the script does not run; the text is plain.

### Opening window

The hand-over from a type screen to the one big picture: the picture first shows as a window in the
middle of a held stage and opens to full-bleed over about one screen of scroll.

```html
<section class="opening">
  <div class="opening__stage">
    <img src="workshop-wide.jpg" alt="The workshop at first light, benches cleared" width="2400" height="1500">
  </div>
</section>
```

```css
.opening__stage { height: 100svh; overflow: clip; }
.opening__stage img { display: block; width: 100%; height: 100%; object-fit: cover; }
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .opening { height: 200svh; view-timeline-name: --opening; --inset-y: 20%; --inset-x: 28%; }
    .opening__stage { position: sticky; top: 0; animation: opening-window linear both; animation-timeline: --opening; animation-range: contain 0% contain 75%; }
    .opening__stage img { animation: opening-settle linear both; animation-timeline: --opening; animation-range: contain 0% contain 75%; }
  }
}
@media (max-width: 700px) { .opening { --inset-y: 18%; --inset-x: 8%; } }
@keyframes opening-window { from { clip-path: inset(var(--inset-y) var(--inset-x)); } to { clip-path: inset(0); } }
@keyframes opening-settle { from { transform: scale(1.15); } to { transform: none; } }
```

The section is two screens tall; the stage is held for one, and the window is fully open after three
quarters of it, so the full-bleed picture rests for a moment before the page moves on. Study: 14 pages;
start windows 38-60% of the width; runways 600-1,800 px, and the readers asked for one to two screens.
Without scroll timelines, and under reduced motion, the picture is a full-bleed screen.

### Held picture, passing captions

The pinned story built for photographs: the picture holds on one side while short captions pass on
the other; the caption at the middle of the screen is lit and its picture is shown.

```html
<section class="steps">
  <figure class="steps__media">
    <div class="steps__pictures">
      <img src="seasoning.jpg" alt="Ash boards stacked to season" class="is-on">
      <img src="turning.jpg" alt="A leg being turned on the lathe">
      <img src="finish.jpg" alt="Oil rubbed into a finished seat">
    </div>
    <figcaption class="steps__count" aria-hidden="true"></figcaption>
  </figure>
  <ol class="steps__list">
    <li class="steps__item"><h3>Seasoned for a year</h3><p>…</p></li>
    <li class="steps__item"><h3>Turned by hand</h3><p>…</p></li>
    <li class="steps__item"><h3>Finished with oil</h3><p>…</p></li>
  </ol>
</section>
```

```css
.steps { display: grid; grid-template-columns: 7fr 5fr; column-gap: var(--gutter); }
.steps__media { margin: 0; align-self: start; }           /* a stretched grid item cannot stick */
.steps__pictures img { display: block; width: 100%; height: auto; }
.steps__list { list-style: none; margin: 0; padding: 0; }
.steps__item { min-height: 80svh; display: flex; flex-direction: column; justify-content: center; }
.js .steps__media { position: sticky; top: 0; height: 100svh; display: flex; flex-direction: column; justify-content: center; gap: 0.75rem; }
.js .steps__pictures { position: relative; aspect-ratio: 4 / 5; max-height: 80svh; }
.js .steps__pictures img { position: absolute; inset: 0; height: 100%; object-fit: cover; opacity: 0; transition: opacity 500ms ease; }
.js .steps__pictures img.is-on { opacity: 1; }
.js .steps__item { opacity: 0.4; transition: opacity var(--t-ui) ease; }
.js .steps__item.is-active { opacity: 1; }
@media (max-width: 800px) {
  .steps { display: block; }                               /* the section, not a grid area, contains the sticky picture */
  .js .steps__media { height: auto; z-index: 1; background: var(--bg); padding-block: 0.5rem; }
  .js .steps__pictures { aspect-ratio: 3 / 2; max-height: 42svh; }
  .steps__item { min-height: 60svh; }
}
@media (prefers-reduced-motion: reduce) { .js .steps__pictures img, .js .steps__item { transition: none; } }
```

```js
(() => {
  const root = document.querySelector('.steps');
  if (!root || !('IntersectionObserver' in window)) return;
  const items = [...root.querySelectorAll('.steps__item')];
  const pictures = [...root.querySelectorAll('.steps__pictures img')];
  const count = root.querySelector('.steps__count');
  const show = (i) => {
    items.forEach((el, k) => el.classList.toggle('is-active', k === i));
    pictures.forEach((el, k) => el.classList.toggle('is-on', k === i));
    if (count) count.textContent = `${i + 1} of ${items.length}`;
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) show(items.indexOf(e.target));
  }, { rootMargin: '-45% 0px -45% 0px' });                 // a band across the middle of the screen
  items.forEach((el) => io.observe(el));
  show(0);
})();
```

Without JavaScript the pictures and captions are two plain columns. Study: inactive items at 20-40%
(dims of 10-15% read as missing text, so the floor here is 40%), crossfades of 400-600 ms, about one
screen per step; the readers asked for a visible count on any held sequence of more than two steps.
The count is a plain sentence in the body face, not a zero-padded numeral.

### Sideways gallery

A row of pictures that the vertical scroll moves sideways while the stage is held, for a short
collection (eight items or fewer). The native drag row is the base; the pinned version is added only
on wide screens with motion allowed, and only when the row is under three screens long.

```html
<section class="gallery">
  <div class="gallery__stage">
    <h2 class="head">Eight kitchens, one stool</h2>
    <ul class="gallery__track">
      <li class="gallery__item"><a href="/kitchens/leith"><img src="leith.jpg" alt="A narrow galley kitchen in Leith" width="1200" height="1500"><span>Leith</span></a></li>
      <!-- … -->
    </ul>
  </div>
</section>
```

```css
.gallery__track { display: flex; gap: var(--gutter); list-style: none; margin: 0; padding: 0 var(--margin); overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding-inline: var(--margin); }
.gallery__item { flex: 0 0 min(72vw, 28rem); scroll-snap-align: start; }
.gallery__item img { display: block; width: 100%; height: auto; aspect-ratio: 4 / 5; object-fit: cover; }
.gallery.is-pinned .gallery__stage { position: sticky; top: 0; height: 100svh; display: flex; flex-direction: column; justify-content: center; gap: 2rem; overflow: clip; }
.gallery.is-pinned .gallery__track { overflow: visible; scroll-snap-type: none; }
.gallery.is-pinned .gallery__item { flex-basis: calc(62svh * 0.8); }
```

```js
(() => {
  const root = document.querySelector('.gallery');
  if (!root) return;
  const track = root.querySelector('.gallery__track');
  const wide = matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)');
  let dx = 0, queued = false;
  const place = () => {
    queued = false;
    if (!root.classList.contains('is-pinned')) return;
    const p = Math.min(1, Math.max(0, -root.getBoundingClientRect().top / dx));
    track.style.transform = `translate3d(${(-p * dx).toFixed(1)}px, 0, 0)`;
  };
  const measure = () => {
    root.classList.add('is-pinned');                     // measure the row as it would be when pinned
    track.style.transform = '';
    dx = track.scrollWidth - track.clientWidth;
    const pin = wide.matches && dx > 0 && dx < innerHeight * 3;
    root.classList.toggle('is-pinned', pin);
    root.style.height = pin ? `${innerHeight + dx}px` : ''; // one pixel of scroll moves the row one pixel
    place();
  };
  track.addEventListener('focusin', (e) => {             // keyboard: bring the focused item into view
    if (!root.classList.contains('is-pinned')) return;
    const item = e.target.closest('.gallery__item');
    const x = Math.min(dx, Math.max(0, item.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft)));
    scrollTo({ top: root.getBoundingClientRect().top + scrollY + x, behavior: 'instant' });
  });
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(place); } }, { passive: true });
  addEventListener('resize', measure);
  addEventListener('load', measure);
  wide.addEventListener('change', measure);
  measure();
})();
```

Study: 8 pages pinned a horizontal track; their pages ran a median 25 screens, and the readers' worst
cases spent 9 screens on three cards and 10,000-23,000 px of wheel on one track. Here the speed is 1:1
and the hold ends when the last picture reaches the margin. Phones, narrow windows, reduced motion and
long rows all get the native row with snapping, which also works with touch, trackpads and the
keyboard. Never put the only copy of a call to action inside the moving row.

### Receding hero

As the first screen leaves, its picture sinks a little and darkens while the words lift away a little
faster, so the hero recedes instead of simply scrolling off.

```html
<header class="hero">
  <img class="hero__picture" src="kitchen.jpg" alt="…" width="2400" height="1600" fetchpriority="high">
  <div class="hero__copy"><h1 class="display">…</h1><p class="lead">…</p></div>
</header>
```

```css
.hero { position: relative; min-height: 100svh; overflow: clip; display: grid; align-items: end; view-timeline-name: --hero; }
.hero__picture { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.hero::after { content: ''; position: absolute; inset: 0; background: var(--ink); opacity: 0; pointer-events: none; }
.hero__copy { position: relative; z-index: 1; padding: var(--margin); }
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .hero__picture { animation: hero-sink linear both; animation-timeline: --hero; animation-range: exit 0% exit 100%; }
    .hero::after { animation: hero-dim linear both; animation-timeline: --hero; animation-range: exit 0% exit 100%; }
    .hero__copy { animation: hero-lift linear both; animation-timeline: --hero; animation-range: exit 0% exit 70%; }
  }
}
@keyframes hero-sink { to { transform: translateY(8%) scale(1.06); } }
@keyframes hero-dim { to { opacity: 0.35; } }
@keyframes hero-lift { to { transform: translateY(-6%); opacity: 0; } }
```

The `exit` range runs from the moment the hero's top meets the top of the screen until its bottom
does, which for a first screen is the first screen of scroll. Study: hero pictures that sink and dim as
they leave, a heading scrubbed from 140 to 60 px, a title card that scales down on the phone; the
readers called it quiet and the page "one sheet". Travel stays under 8%; the overlay is a flat ink at
up to 35%, not a gradient. Static where unsupported or reduced.





### Page to page

Navigation between pages of the site with the browser's own view transitions: the old page fades
quickly, the new one rises in, and the picture the visitor clicked travels into place as the new
page's hero. No library, no full-screen curtain.

```css
/* on every page */
@view-transition { navigation: auto; }
@media (prefers-reduced-motion: reduce) { @view-transition { navigation: none; } }
::view-transition-old(root) { animation: vt-leave 200ms var(--ease-exit) both; }
::view-transition-new(root) { animation: vt-arrive 380ms var(--ease-out) 60ms both; }
::view-transition-group(*) { animation-duration: 480ms; animation-timing-function: var(--ease-in-out); }
::view-transition-image-pair(*.picture) { overflow: clip; }
::view-transition-old(*.picture), ::view-transition-new(*.picture) { height: 100%; object-fit: cover; }
@keyframes vt-leave { to { opacity: 0; } }
@keyframes vt-arrive { from { opacity: 0; transform: translateY(16px); } }
```

```html
<!-- on the index: the card picture of one project -->
<img src="/img/leith.jpg" alt="…" style="view-transition-name: kitchen-leith; view-transition-class: picture">
<!-- on that project's page: its hero picture -->
<img src="/img/leith-wide.jpg" alt="…" style="view-transition-name: kitchen-leith; view-transition-class: picture">
```

Each name may appear once per page. Browsers without cross-document view transitions simply navigate.
Study: 16 pages load a page-transition library and run full-screen curtains of 0.7-2.4 s; 6 use view
transitions. The new page should be readable within half a second.

### Ink fill

One statement that fills from part-ink to full ink as it rises through the screen, line by line. It is
readable before it fills; the fill only sets the pace.

```html
<p class="statement head" data-fill>Nine people, one workshop, no catalogue: every stool is made for the kitchen it goes to.</p>
```

```css
[data-fill] { --fill: var(--ink); color: var(--fill); }
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .is-filling > span { display: inline-block; color: color-mix(in oklab, var(--fill) 45%, transparent); animation: ink-fill linear both; animation-timeline: view(); animation-range: cover 20% cover 45%; }
  }
}
@keyframes ink-fill { to { color: var(--fill); } }
```

```js
(() => {
  if (!CSS.supports('animation-timeline: view()') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('[data-fill]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach((word, i) => {
      const s = document.createElement('span');
      s.textContent = word;
      el.append(s, i < words.length - 1 ? ' ' : '');
    });
    el.classList.add('is-filling');
  });
})();
```

Each word watches its own position, so the words of a line fill together as the line moves from three
quarters of the way down the screen to just past half way. Set `--fill` on a dark chapter to its ink.
Study: 14 pages scrub a statement from grey to ink; unread words started at about 25-30% and settled
frames still caught statements half pale, which reads as disabled text. Here: one statement per page,
three to five lines, 32px or larger, starting at 45% (about 3:1 against the ground, enough for large
text). Full ink without scroll timelines or under reduced motion.

### Rolling figures

For pages whose case is a handful of numbers: each digit rolls up to its value once, the columns a
beat apart. The real number stays in the text for screen readers and search.

```html
<p class="figure"><span class="display" data-roll>1987</span> the year the first stool was sold</p>
```

```css
.roll__digits { display: inline-flex; font-variant-numeric: tabular-nums; line-height: 1; }
.roll__col { display: inline-block; height: 1em; overflow: clip; }
.roll__strip { display: flex; flex-direction: column; transform: translateY(calc(var(--d) * -1em)); }
.roll__strip > span { height: 1em; }
@media (prefers-reduced-motion: no-preference) {
  .roll:not(.is-in) .roll__strip { transform: none; }
  .roll.is-in .roll__strip { transition: transform 1100ms var(--ease-expo) calc(var(--i) * var(--stagger-item)); }
}
```

```js
(() => {
  const els = [...document.querySelectorAll('[data-roll]')];
  if (!els.length) return;
  els.forEach((el) => {
    const value = el.textContent.trim();
    const said = Object.assign(document.createElement('span'), { className: 'sr-only', textContent: value });
    const shown = Object.assign(document.createElement('span'), { className: 'roll__digits' });
    shown.setAttribute('aria-hidden', 'true');
    let i = 0;
    for (const ch of value) {
      if (!/\d/.test(ch)) { shown.append(ch); continue; }
      const col = Object.assign(document.createElement('span'), { className: 'roll__col' });
      const strip = Object.assign(document.createElement('span'), { className: 'roll__strip' });
      strip.style.setProperty('--d', ch);
      strip.style.setProperty('--i', i++);
      for (let n = 0; n < 10; n++) strip.append(Object.assign(document.createElement('span'), { textContent: n }));
      col.append(strip);
      shown.append(col);
    }
    el.classList.add('roll');
    el.replaceChildren(said, shown);
  });
  if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -15% 0px' });
  els.forEach((el) => io.observe(el));
})();
```

Study: 6 pages roll digit columns (stats, a year, coordinates), about 0.9-1.1 s per column on an
expo-out, staggered by column. Use it for three or four figures at display size, never in running text
and never for a value that changes after load. Reduced motion: the figure is set at its value.

### Accordion

```css
.acc__panel { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 320ms var(--ease-out); }
.acc__panel > div { overflow: hidden; }
.acc[open] .acc__panel, .acc__item.is-open .acc__panel { grid-template-rows: 1fr; }
```

Animating `grid-template-rows` from `0fr` to `1fr` opens to the content's real height without measuring
it in JavaScript.

### Menu or dialog

```css
.menu { transform-origin: top right; transition: opacity var(--t-ui) var(--ease-out), transform var(--t-ui) var(--ease-out); }
.menu[hidden], .menu.is-closed { opacity: 0; transform: scale(0.97) translateY(-6px); pointer-events: none; }
```

Things open from where they were triggered (`transform-origin` at the trigger). Nothing enters from
`scale(0)`; start at 0.95–0.98. A centred dialog is the one case that scales from its centre.

## 7. Signature moves

The direction sheet names one. Each of these was seen repeatedly on the studied gallery sites.

| Move | What happens | Build with |
| --- | --- | --- |
| Masked headline | Lines rise from behind their baselines on load | Masked line reveal recipe |
| Shutter image | Hero or showcase image opens from an edge, settling from 1.12 scale | Image shutter recipe |
| Scaling wordmark | A giant wordmark shrinks or grows a few percent as the hero scrolls out | Scroll-linked recipe on `scale` |
| Pinned story | A heading holds while its items scroll past | Sticky recipe |
| Index with preview | Text rows; the hovered row shows its image | Index with preview, anchored to the row |
| Curtain footer | The last section is revealed from under the page as you reach the end | `position: sticky; bottom: 0` footer under a main with a background and `z-index` |
| Slow crossfade | Hero image crossfades through 3–4 photographs, 5–6s each | Stacked images, opacity keyframes, pause when the tab is hidden |
| Edge-to-edge marquee | One line of very large type travels sideways, slowly | Duplicate the content, `translateX(-50%)` linear loop, pause on hover and under reduced motion |
| Drag row | A horizontally scrollable row of large images with scroll snapping | `overflow-x: auto; scroll-snap-type: x mandatory`, no library |
| Colour by chapter | Each chapter is its own full-bleed colour field, so the ground changes at section edges; a fixed header takes the ink of the chapter beneath | Section backgrounds in CSS; `base.js` sets `--header-ink` from `data-ink`. Never recolour the whole page from an observer |
| Opening window | A type screen hands over to the big picture: a window in the middle of a held stage opens to full-bleed over about one screen | Opening window recipe |
| Ink-fill statement | One statement fills from 45% to full ink as it rises through the screen | Ink fill recipe |
| Sheet over a held picture | A full-bleed photograph holds for one screen; the next chapter slides up over it as an opaque sheet | A 100svh `position: sticky; top: 0` figure followed by a section with its own background and a higher `z-index`; no script |
| Sideways gallery | A short row of pictures moves sideways while the vertical scroll holds the stage | Sideways gallery recipe |
| Pushed line | One line of very large type is pushed sideways by the scroll, reading whole at the middle of its run | `animation-timeline: view()` on the line, `translateX` from 12% to -12%, linear; static where unsupported |
| Rolling figures | The few figures that make the case roll up to their values once | Rolling figures recipe |
| Carried picture | The picture clicked in a list travels into place as the next page's hero | Page to page recipe |

Pick by subject. A portfolio wants the index with preview; a restaurant wants the slow crossfade; a
product wants the shutter on its hero object. If the move says nothing about the subject, it is
decoration and the page is better without it.

Pick by subject, as before: the opening window for a product or a place with one great photograph; the
sheet for chapters that each own a picture; the sideways gallery for a short set of rooms, kitchens or
pieces; the pushed line for a brand whose claim is a word; rolling figures for a report, a fund or a
practice that leads with numbers; the carried picture for a portfolio whose index and case pages are
both built.

## 8. Reduced motion and performance

- `prefers-reduced-motion: reduce` means fewer and gentler, not none: keep opacity and colour changes,
  drop travel, scale, parallax and autoplay. All recipes above are written inside
  `no-preference` blocks so the reduced state is simply the finished state.
- Animate `transform`, `opacity` and `clip-path`. Animating `width`, `height`, `top`, `left`, `margin`
  or `padding` forces layout on every frame. `grid-template-rows` for accordions is the accepted
  exception because it is short and rare.
- Do not drive many children from one changing CSS variable on a parent; set the transform on the
  element that moves.
- `will-change` only on an element that is about to animate, removed afterwards.
- Pause loops when off screen or when the tab is hidden.
- No scroll hijacking and no custom cursor. They cost usability, which is 30% of an Awwwards score and
  the line most winners score lowest on. Smoothing only through `Stage.smooth()`, which stays off for
  touch and reduced motion.

## 9. What gives generated motion away

- The same fade-up on every block.
- A dozen staggered entrances in the hero.
- Hover lift or zoom on every card and image.
- Bounce or elastic easing on interface elements.
- Infinite loops that mean nothing: pulsing dots, floating shapes, shimmering text, rotating badges.
- A reveal that never fires and leaves a blank band in the page. Run `inspect.mjs` after the motion
  pass and look at every screenshot for missing content.

### Seen in the latest Sites of the Day

Seen in the study, with how often, and what the house does instead.

- **Preloaders and counters (60 of 99; 26 with a counter).** Half the usable pages were unreadable
  2.5 s after load, a third at 4.5 s; the preloaders sat mostly on pages that had already loaded, and
  25 of the 29 that loaded in under 3 s still showed nothing readable at 4.5 s. Counters stalled,
  outlasted the load or were tweens with nothing behind them. House: no preloader. If a scene must
  load, the HTML first screen (headline, picture, action) is there at once and the scene fades in
  behind it when ready.
- **Gates (10 of 99): enter, sound, age or gesture before any content.** House: none. Sound is a
  control on the page, off by default.
- **Scroll hijacking (16 wheel-driven scenes, 9 of them endless, plus 14 single screens where the wheel
  does nothing).** The visitor cannot tell where they are, how much is left or how to get out, and the
  keyboard and screen readers get nothing. Usability 6.01 against 6.50 for pages that scroll. House:
  native scroll; any scene is driven by scroll position on a sticky stage that ends, with a count.
- **Smooth-scroll libraries (67 of 99).** They make the scrubbed scenes feel weighted, and they also
  put a delay between the hand and the page; with a long ease the page keeps sliding after the wheel
  stops.
- **Custom cursors (28 of 99).** Followers, image trails, a lens that smears the headline it sits on,
  labels that only exist on hover; 10 of the 28 have any reduced-motion rule. House: the system cursor;
  labels are on the page.
- **Scramble and typewriter text (11 and 5).** The headline unreadable for four seconds, body copy
  garbled mid-scroll, actions held back until the typing ends. House: not used. Real words arrive whole.
- **Long held runways.** Pages with pins average twice the length for fewer words per screen; 17 pages
  are 20 screens or longer, some with whole screens that hold only a slow rotation. House: about one
  screen per step, three per stage, every held screen carries a line of text.
- **Content held at zero opacity.** Reveals that keep text invisible until the scroll settles, inactive
  items dimmed to 10-15%, statements left half pale. House: reveals only below the fold, once, never
  longer than 900 ms in view; dims no lower than 40%; fills start at 45%.
- **Motion over words.** Marquees and drifting objects that cross statements, a sliding line that crops
  its own words, blur left on text mid-move. House: nothing moves across text the visitor is reading;
  a moving line must read whole at some point of its run.
- **Overshoot and bounce (19 stylesheets).** House: still banned on interface elements.
- **Endless loops with no off switch.** Grain, pulsing dots, equalisers, spinning badges, running with no
  reduced-motion rule on most pages. House: loops pause off screen and stop under reduced motion.

Where the study's work does something the house bans, the house version: hairline progress bars and
tick rails on held stages become a plain count in the body face ("2 of 4"); zero-padded counters
("01/08") become a plain count or nothing; crossfading gradient grounds become flat chapter colours with
hard cuts; monospace HUD labels become small text in the text face.

## 10. Rules for motion

1. **First frame.** The headline, the sentence and the picture are in the HTML and painted on the first
   frame. The load sequence starts without waiting for the load event and is settled by 1.2 s, with
   four elements at most.
2. **No preloader, no counter, no gate, no custom cursor, no wheel capture.** Smoothing only through
   `Stage.smooth()` (Lenis at lerp 0.1-0.14, off for touch and reduced motion): weight, never a page
   that keeps sliding after the hand stops.
3. **Curves.** `--ease-out` for anything under 600ms; `--ease-expo` for reveals of 800ms or more;
   `--ease-in-out` for wipes and things that travel; `--ease-exit` only for things leaving for good;
   `linear` for scroll-linked motion and loops; plain `ease` for colour. No overshoot.
4. **Durations.** Press 140ms; hover colour 180-200ms; hover that moves 300-400ms; menus 240ms; reveals
   700-900ms; picture openings 1,100-1,300ms; exits 60-70% of the matching entrance.
5. **Staggers.** Lines 80-110ms; list items 50-90ms; characters 20-40ms and only in a heading of one to
   three words; four steps at most in any one sequence.
6. **Reveals.** Fire once, when the element's top is 85-90% of the way down the viewport; rise 12-32px
   or from a line mask; nothing in view stays hidden for more than 900ms; nothing above the fold waits
   for scroll.
7. **Scroll scenes are where the page is bold.** The big moves come from the scene library
   (`references/scenes.md`): the direction sheet deals two or three per page, each built on
   `assets/scenes/stage.js`, each held for one to four screens, each with a phone version and a
   finished composition. Inside a scene the scene's own numbers apply (a picture may grow from a
   window to the whole screen, type may cross the stage, a camera may fly through a field of
   pictures); rules 8 and 10 still hold for the text a visitor is reading.
8. **Outside the scenes, scroll-linked travel stays quiet.** Linear and locked to the scrollbar;
   parallax under 8% of the element; scale between 0.94 and 1.15; built with scroll timelines inside
   `@supports`, static without them. Other held stages: sticky, about one screen per step, three
   screens at most, a line of text on every held screen.
9. **One of each.** One signature move (a dealt scene can be it); one moving picture; one marquee at
   most. A quiet section between two scenes, so each one lands.
10. **Text stays readable.** Fills start at 45% ink; dims no lower than 40%; blur at most 8px and gone
    once settled; nothing moves across text being read.
11. **Colour by chapter** as hard cuts at section edges; the fixed header's ink follows in 300ms.
12. **Horizontal motion.** The native drag row first; the pinned sideways gallery only for rows under
    three screens long, with keyboard support.
13. **Page to page.** View transitions, 480ms at most, off under reduced motion.
14. **Reduced motion.** Every hidden state lives inside `prefers-reduced-motion: no-preference`; the
    reduced page is the finished page; loops stop. Two in three award pages skip this, which is a
    reason to do it, not a licence to skip it.

---

## 📄 `references/research.md`

# The study

Everything numeric in this skill comes from here. Cite these figures; do not round them up or invent
others.

## Contents

1. Method and its limits
2. Scores
3. Where the idea comes from
4. Headlines
5. Type
6. Devices: what separates strong from weak, and what does not
7. Colour and shape
8. Imagery and page structure
9. What the inspector says about the gallery itself
10. The 25 highest-scored sites and their ideas
11. How the skill was tested
12. The October 2026 study: 100 Sites of the Day
13. The app-screen study

## 1. Method and its limits

- **Sample.** 248 sites collected on 5 October 2026: 156 from One Page Love (the latest gallery pages
  and the category listings) and 92 Awwwards Sites of the Day (the three most recent listing pages).
  247 loaded; 246 were re-measured with the final probe.
- **Capture.** Headless Chrome at 1440×900 and 390×844. For each site: the first viewport, five more
  frames while scrolling with real wheel input, the mobile first viewport, and a measurement pass in
  the page (computed styles, text geometry, colours, fonts actually loaded).
- **Panel.** 21 model reviewers each studied about 12 sites from the screenshots and the measurements,
  described them (idea, hero, type, colour, imagery, layout, sections) and scored them the Awwwards
  way: design 40%, usability 30%, creativity 20%, content 10%. These are model judgements from still
  frames, not human jurors and not the real Awwwards scores. Batches mixed both sources so each
  reviewer saw a spread.
- **Usable sets.** 235 sites were usable for the panel (12 showed only a preloader, an entry gate or a
  bot wall). 202 were measurable for typography (a page with at least 25 words and a detectable
  headline). "Top" below means panel score 7.5 or higher (82 measurable sites); "weak" means under 6.5
  (23 measurable sites).
- **Limits.** One capture per site on one day. Some heroes were caught mid-animation or behind a cookie
  notice. WebGL-heavy sites are under-described by text measurements. The eyebrow detector counts any
  small short label directly above a large heading, so it over-counts against the panel's stricter
  reading (60% measured against 35% observed). Motion was inferred from frames, not watched. The sample
  is whatever the two galleries had recently featured; it is fashion as much as quality.

## 2. Scores

| | All 235 | One Page Love (151) | Awwwards (84) |
| --- | --- | --- | --- |
| Median overall | 7.2 | 7.1 | 7.5 |
| Middle half | 6.8–7.6 | | |
| 8.0 or higher | 25 sites (11%) | | |
| 7.5 or higher | 90 sites (38%) | | |
| Under 6.5 | 29 sites | | |

Median by criterion: design 8, usability 7, creativity 7, content 7. Among the top 25: design 9,
usability 7, creativity 8, content 8. Usability is the one line that does not rise with the rest: the
best sites are no easier to use than the average one. Do not copy their gates, preloaders, tiny text
or hidden navigation.

## 3. Where the idea comes from

The clearest pattern in the panel's notes: high scores go with a concept taken from the subject, and
low scores go with its absence. The weakest entries' ideas were recorded in words like "none beyond the
standard dark SaaS launch formula", "no visual idea beyond clarity", "no strong idea". The strongest
were sentences only that subject could own (section 10).

Recurring engines among the 7.3+ sites, each the basis of a direction in the library:

- **The product demonstrates itself.** A colour picker's loupe reads the page's own background; a list
  tool is sold with tiny working lists; a photo app's page is a wall of its own output.
- **The page is an artefact from the subject's world.** A wedding site that is the invitation; an
  archive as tabbed folders; a coupon with a cut line; a portfolio as a contact sheet.
- **The name is the hero.** Wordmarks as wide as the screen, a photograph set inside the name like a
  letter, a name split to opposite corners with the page between.
- **One motif from the subject drives everything.** A tool's octagonal section as button, mask and
  loader; two circles for two accounts; a café's stripes.
- **Dressed as another category.** A money app as a streetwear drop; an industrial roaster as a design
  object; a parcel service as a fairground.
- **The place carries it.** One full-bleed view and a name along the bottom edge.
- **A fixed stage.** A title or object stays put while content swaps beneath it.
- **One section, one colour.** Flat fields as chapters.
- **Radical understatement.** A 27px headline and tiny live demonstrations, carried through completely.

Hero types, by the panel's classification (top sites against weak sites): full-bleed media with type
over it 16% / 10%; giant wordmark 14% / 0%; typographic poster 13% / 7%; text beside media 10% / 3%;
**centred statement with media below 7% / 24%**. The centred headline over a screenshot is the weak
sites' signature layout.

## 4. Headlines

| Hero headline | All | Top | Weak |
| --- | --- | --- | --- |
| Words, median | 5 | 5 | 5 |
| Words, middle half | 3–9 | 2–8 | 3–8 |
| Characters, median | 32 | | |
| One line at 1440 | 47% | | |
| Two lines or fewer at 1440 | 70% | 71% | 83% |
| Two lines or fewer at 390 | 57% | | |
| Three lines or fewer at 390 | 82% | | |

Awwwards heroes are shorter (median 4 words, 76% within two lines) than One Page Love's (6 words, 66%).
Section headings have a median of 3 words. Length does not separate strong from weak; nearly everyone
in the gallery writes short headlines. The two-line limit in this skill is a house rule that most of
the gallery already meets on desktop and that takes care to meet on a phone.

## 5. Type

| | All | Top | Weak |
| --- | --- | --- | --- |
| Hero size, median | 72px (5.0vw) | 6.0vw | 4.7vw |
| Hero size, middle half | 3.0–7.6vw | 2.5–9.7vw | 2.7–6.1vw |
| Largest text on the page, median | 6.4vw | 8.4vw | 5.0vw |
| Largest text, upper quarter starts at | 10.4vw | 12.5vw | 6.7vw |
| Hero on a phone, median | 40px | | |
| Hero tracking, median (middle half) | -0.01em (-0.03 to 0) | | |
| Hero leading, median (middle half) | 1.0 (0.95–1.1) | | |
| Body size, median (middle half) | 16px (14–18) | | |
| Headline ÷ body, median | 4.3 | 4.7 | 4.0 |
| Typefaces carrying 3%+ of text | one 31%, two 45%, three 22% | | |
| Distinct font sizes, median | 8 | | |

Hero weight: regular 48%, medium 18%, semibold 6%, bold or heavier 22%, light 6%. Capitals 24%.
Centred 39% overall, 52% on weak sites. Display classes by the panel: neo-grotesk 48%, transitional
serif 11%, geometric sans 10%, condensed 6%, extended 6%, old-style serif 4%, custom lettering 4%.

Strong sites push the extremes: their biggest type is bigger and their range is wider. Weak sites
cluster in the middle.

## 6. Devices: what separates strong from weak, and what does not

Measured in the page unless marked (panel).

**More common on weak sites (the data supports avoiding them):**

| Device | Top | Weak |
| --- | --- | --- |
| Icon-topped feature cards (panel) | 1% | 28% |
| Rows of identical cards with a small icon (measured) | 7% | 26% |
| Pill badges (panel) | 14% | 34% |
| Pill-shaped label above a heading (measured) | 5% | 26% |
| Tiny uppercase letter-spaced labels, any | 16% | 57% |
| Tiny uppercase letter-spaced labels, three or more | 6% | 43% |
| Gradient fills (not counting scrims) | 22% | 52% |
| Gradient text | 2% | 13% |
| Shadows on resting elements, any | 24% | 48% |
| Shadows, five or more | 10% | 30% |
| Emoji in the page | 10% | 26% |
| Eyebrow labels (panel) | 32% | 45% |

**No real difference:**

| Device | Top | Weak |
| --- | --- | --- |
| Backdrop blur anywhere | 32% | 39% |
| Italic-serif accent word (panel) | 4% | 7% |
| Thin rules, any | 61% | 52% |

**More common on strong sites (banned here anyway, as house style):**

| Device | Top | Weak |
| --- | --- | --- |
| Monospace labels (panel) | 44% | 24% |
| Monospace anywhere outside code (measured) | 45% | 26% |
| Index numbering (panel) | 38% | 21% |

Monospace captions, index numbers and ruled grids are the present fashion of award sites. They are
excluded from this skill by the owner's choice, not by the data: they are the devices generators copy
first, and a page that cannot lean on them has to find structure in space, tone and scale.

## 7. Colour and shape

- Dark page ground 41%; pure white 25%; pure black 12%; a warm off-white 13%.
- Scheme (panel): monochrome plus one accent 23%, light neutral 22%, dark neutral 14%, several flat
  colours 13%, two-tone 12%, photographic 9%, one colour field 6%.
- Primary buttons are neutral (black, white, grey) on 52% of sites. One site in 246 has a terracotta
  button; none has a violet one.
- Median number of distinct section grounds: 2 on top sites, 1 on weak sites.
- Button shape: top sites square (0–2px) 52%, fully round 23%, small radius 19%, medium (9–16px) 6%.
  Weak sites fully round 59%, medium 24%, square 18%.
- Media corners are square on 73% of sites; where rounded, the median radius is 12px.
- Buttons in the first viewport: none on 55% of top sites and 39% of weak ones.

## 8. Imagery and page structure

- Hero media covers at least half the first viewport on 60% of sites (top 68%, weak 48%) and nearly
  all of it on 50% (top 56%, weak 39%). No hero media: 15%.
- Video is present on 49% of sites and a canvas element on 49% (top 62%, weak 35%).
- Images per page, median: 24 overall, 37 on top sites, 5 on weak ones.
- Imagery kind (panel): mixed 32%, photography 14%, generative or WebGL 13%, product interface 12%,
  3D render 11%, illustration 9%, video 6%, type only 3%. Median panel score is lowest for
  illustration-led (6.9) and product-interface-led (7.1) pages and highest for video and type-only
  (7.5).
- Page length, median: 8.7 screens and 575 words (middle half 1.6–14.4 screens, 250–956 words). A
  quarter of the sites are a single screen or two.
- Navigation: a median of 3 links; fixed or sticky on 66%.
- Density (panel): airy 46%, balanced 45%, dense 9%. Alignment: centred 33%, mixed 31%, left-anchored
  17%, modular grid 13%, free 6%.
- Asked to describe each site's most interesting sections, the panel picked a pricing, testimonial or
  FAQ section only 7, 12 and 9 times across 235 sites. Where strong sites have them at all, they are
  not where the design effort goes, and they avoid the stock form.

**From the panel's written notes on the 114 sites scoring 7.3 or more** (hand tallies, approximate;
`layout.md` turns these into practice):

- Outer margins of 32px or less on about 45; 80px or more on about 8. A centred 700–1300px container
  on about 15, several of them the pages the panel called stock.
- Text anchored to a fixed off-centre line on about 22. Text docked in corners or at opposite ends of
  a baseline on about 25 and 15.
- Two or three type sizes with nothing between on about 30; no note describes a graded five-step
  scale.
- One thing per screen on about 20. A full background colour per section on about 20; alternating
  light and dark on about 12.
- Every section recomposed on about 14; one planned exception to the page's own system on about 14.
- No conventional top navigation bar on about 45; small corner links on about 22; a single link or
  button on about 10.
- Endings: the name at full width about 18, the hero repeated inverted about 12, a closing scene of
  its own about 14, no footer or a single line about 22. Link-column footers are mentioned only as
  criticism.
- Motion (inferred from frames): autoplaying video about 50; pinned or fixed stages about 40; text
  reveals about 30 (blur-in 10, masked line rises 8, scroll-tied word colouring 7); horizontal strips
  about 27; marquees about 26; media swapped behind a fixed element about 15; scroll-linked scaling
  about 12. Rare: hover effects (4 mentions), parallax (6), accordions (5), bounce or spring motion
  (none). About 10 strong sites show little or no motion at all.
- How weak sites fail (54 sites under 6.8): the category's stock template about 20; centred headline,
  pill badge, two buttons and a screenshot about 9; stock modules after a distinctive hero about 8,
  plus about 17 in the middle band; a characterless default typeface about 13; text too small or too
  faint about 13; never saying what the thing is about 12.
- Faults of the best sites (90 at 7.5 or more), not to be copied: text at 9–13px about 24;
  information hidden behind the concept about 20; the idea running out mid-page about 15; text over
  footage with no scrim about 12; gates, preloaders and blank first paints about 12.

## 9. What the inspector says about the gallery itself

Running this skill's own `inspect.mjs` rules over the 202 measurable gallery sites: the median site
has 4 `FAIL`s and only 4% have none. The rules that fire most: headline over two lines somewhere on
the page 60%, eyebrow-like label 60%, thin rules 50%, monospace 37%, shadows 32%, gradients 29%, index
numbering 29%.

So the house style is deliberately stricter than the gallery. It is not a description of award sites;
it is a narrower target inside what they do: their scale, their ideas, their imagery and restraint,
without the ornaments that have since become a uniform.

## 10. The 25 highest-scored sites and their ideas

The panel's one-sentence reading of each. Notice that every one names something only that subject
could own. (Several use devices this skill bans; take the idea, not the ornament.)

| Site | Source | Score | Idea |
| --- | --- | --- | --- |
| PP Neue Montreal | Awwwards | 8.6 | A typeface specimen dressed as a vintage city travel guide: the font named after Montreal is sold through guidebook titling, postcards and old tourist footage. |
| Seasats | Awwwards | 8.4 | Calm, dusk-lit seascapes sell autonomous boats as serene instruments, and the navigation is a column of stacked colour swatches taken from that sea-and-sand palette. |
| AI in Design Report 2026 | Awwwards | 8.4 | A research report laid out like a colour-blocked print annual: a video collage on top, an oversized tight grotesk title, and flat orange, lilac, sage and black blocks carrying stats, quotes and chapters. |
| House of Honey | Awwwards | 8.4 | A block-heavy wordmark pierced by a fine script: the bold-against-delicate contrast is repeated at every scale, with giant pink script behind quiet serif statements. |
| White Desert | Awwwards | 8.4 | One word, the destination, set a third of the screen tall over footage like a film title card; sheer scale stands in for remoteness. |
| Applied Imagination | One Page Love | 8.3 | An essay conceived on a flight is read as a descent: an altimeter ticks from 30,000 ft to zero while you scroll down through clouds to mountains at ground level. |
| Cursor Compile | One Page Love | 8.3 | The event name drawn as seven looping one-line curves in seven colours, more signature than logotype, on an otherwise whisper-quiet off-white page. |
| The New Industrials | One Page Love | 8.3 | A long-read essay laid out inside a drafting grid, where colour fields shift as you read and machine parts drift through the margins and finally assemble into the publisher's initials. |
| Wild | One Page Love | 8.3 | A studio essay in which everything decorative is drawn on one square-pixel grid: the hero heatmap, the icons, the diagrams, the lettering and the footer. |
| Hildén & Kaira | Awwwards | 8.3 | The agency name is cast in liquid chrome across the full width, and the same chrome becomes the objects that float through the page, tying the pitch to one material. |
| PX Push | Awwwards | 8.2 | A design subscription presented as a retro broadcast: the entire site is seen through a CRT screen, with a chrome logo token as its mascot. |
| Illoca | Awwwards | 8.2 | Software for architects sold as a drafting table: a two-colour illustrated studio on graph paper that the scroll pushes into until the drawing fills the screen. |
| Aspen Search | Awwwards | 8.2 | The page is a tile system with no margins: the two-word name is split across cells that alternate type, dithered image, black and one mint green. |
| Dragonfly Redux | Awwwards | 8.2 | A crypto fund presented as a terminal artefact: every picture is rendered in characters, framed by four letters of the name pinned to the viewport corners. |
| Monolog | Awwwards | 8.2 | A studio pitch run as an asymmetric sheet: a narrow left column carries the sales talk while a wide right column stacks a very heavy headline and the proof. |
| The Queue | One Page Love | 8.1 | An essay on queueing where the queue is the ornament: a line of drawn figures stands along the bottom of the hero and returns between chapters in changing period dress. |
| Paul Kalkbrenner | Awwwards | 8.1 | Swiss poster typography for a techno artist: the name as one black line with a photo set inside it like a glyph, then every chapter gets its own flat colour. |
| Vero New York | Awwwards | 8.1 | A keepsake treated like couture: a slow close-up film opens, then a white sculpture of a dress stays pinned at centre while one sentence passes over it. |
| Depo Luxe | Awwwards | 8.1 | A film production roster shown as a full-screen reel in which every step is one film with only a title, a director and a client, set like credits at body size. |
| Longbow | Awwwards | 8.1 | The page is built on a visible four-column construction grid, and cars, cards and a giant condensed marquee are slotted into its cells like objects on an artboard. |
| Mosby's Files | Awwwards | 8.0 | An archive of architects presented as a physical stack of coloured index-tab file folders that you flip through. |
| Sarah & Matt Wedding | One Page Love | 8.0 | The site is the invitation: a letterpress-style card opens the page, and its ornaments and small typographic parts become the components for everything after it. |
| Zara Webb | One Page Love | 8.0 | A one-woman newborn-care practice presented like a hand-made keepsake: a mascot rabbit, scalloped and flower-shaped cut-outs, candid film photographs. |
| Noho | Awwwards | 8.0 | Furniture sold through people misusing it (wearing, balancing on, hiding behind chairs on flat colour backdrops) while the interface stays quiet. |
| Juggle | One Page Love | 8.0 | The headline literally drowns: a flat blue field rises to half height and the lines below the waterline change colour. |

Full notes on any studied site: `node scripts/draw.mjs --site <id>` (ids appear on direction sheets).

## 11. How the skill was tested

Six client briefs (an invoicing tool, a restaurant, a designer's portfolio, a ceramic product, a
guesthouse, a design conference), each with no photographs. For every brief a fresh agent built the
page three ways: with no skill (baseline), with another published design skill (atelier, three briefs)
and with this skill. Every build was photographed by `inspect.mjs` in the same way and judged blind
by a separate agent with the juror brief (Awwwards weights, anonymous A/B/C folders, screenshots
only). The skill was revised after each round from the jurors' reasons and the builders' notes.

| Round | Briefs | This skill | Baseline | Atelier | Wins |
| --- | --- | --- | --- | --- | --- |
| 1 | 4 | 6.6 | 7.7 | 6.8 | 1 of 4 |
| 2 | 3 | 7.1 | 8.0 | | 0 of 3 |
| 3 | 3 | 7.5 | 7.5 | | 1 of 3 |
| 4 (unseen briefs) | 3 | 6.9 | 7.9 | 7.5 | 0 of 3 |
| 5 (same three) | 3 | 7.7 | 7.8 | 7.2 | 2 of 3 |

Under the inspector, the final builds measured 0 FAIL each; the baselines measured 8 to 13 FAIL each
(eyebrows, monospace labels, 01/02/03 numbering, hairlines, gradients, shadows, three-line headlines,
text under 13px).

What the jurors rewarded, in the order they named it: an idea that belongs to this client and not to
the category (the competitor test); one live thing on the page; full content at a readable size; a
first screen with one dominant element and a real button; drawings of the subject with detail. What
they punished: a quiet page that read as empty, a small headline, text sliding over pictures or cut
at the top, a page recoloured mid-section, rows cut at the right edge, a large sentence over three or
more lines (read as a long headline whatever its markup), navigation that took over the first screen.
Each of these is now a rule in SKILL.md or a check in the inspector.

Limits: one juror per brief per round, so single scores carry about half a point of noise; the round-5
briefs had been seen in round 4; jurors are models, not people.

## 12. The October 2026 study: 100 Sites of the Day

A second study, made for v2.1, of the latest 100 Awwwards Sites of the Day (10 July to 17 October
2026), with a different aim from the first: where the pictures and footage sit, how pages move, and
the frame (margins, balance, empty space, titles). About three in four of these sites were also in
the first study.

- **Capture.** Headless Chrome at 1440×900 and 390×844 on 18 October 2026: four frames of the first
  4.5 seconds after load, every screen while scrolling with real wheel input (one frame at rest per
  step; the mid-step frames were cut from the top of the document instead of the viewport, so they
  were not used), five phone screens, and a measurement pass in the page: every picture and
  clip with its box, ratio, fit and corners; every section's content edges and pictures; blank runs;
  the CSS that loaded (curves, durations, keyframes, breakpoints, feature counts); the animations,
  transitions and script-driven moves that actually ran; GSAP tweens and scroll triggers where the
  page exposed them. Nothing a site owns (code, copy, pictures) is reproduced in the skill; only
  measurements and descriptions in our own words.
- **Panel.** One model reader per site studied its frames and measurements, described the idea, the
  first screen, the frame, every section, where each picture sits, the motion and what not to copy,
  and scored it the Awwwards way. 91 of 99 captures were usable (the rest showed a gate, a bot wall or
  a firewall page). Scores ran 6.7 to 7.9 (median 7.45); "top" means 7.5 or more (36 sites), "lowest"
  under 7.3 (16).
- **What it changed.** Where pictures and footage go: `imagery.md` §12. What strong pages do with
  motion, new tokens, recipes and the gimmicks to avoid: `motion.md` §2, §4–6 and §9–10. Empty space
  and the frame: `layout.md` §4–5. New compositions in `library/heroes.json` and `sections.json` and
  notes on media and motion in `library/sites.json` (`draw.mjs --site <id>`).
- **Headline numbers.** Pictures fill a median 16% of a scrolled screen, but in whole screens: 42% of
  screens hold none and 19% are 90% picture or more. The median page carries 7 pictures (top 8,
  lowest 2) and 42% carry footage (half of the top sites, one of the 16 lowest). 94% of pictures have
  square corners. Strong ease-outs are the curves that ran (expo and quint out); the median of all
  that ran on a site is 420ms. 60 of 99 open on a loading screen, and a third of the usable pages were
  still unreadable 4.5 seconds after load, with no gain in the design marks. About 1 text section in
  100 leaves half the width empty; the outer margins of strong pages match to a few pixels; 82% of
  text sections open with a heading; 15 of 97 first screens never say what the thing is, and those
  lose usability points.
- **Limits.** One capture per site on one day; a WebGL scene can render blank in a headless browser;
  the scroll-linked frames are partly an artefact of smooth-scroll libraries; one reader per site, so
  single scores carry about half a point of noise.

## 13. The app-screen study

For dashboards and app screens (v2.1), a separate study of 23 real product screens chosen by the
owner (17 products, 17 light and 6 dark, at 1440–1512px): each screen measured from its pixels by a
reader with full-resolution crops, six cross-cutting reports (shell, data and charts, tables and
forms, visual language, taste, styles), and a synthesis into `references/app-screens.md` and
`library/app.json` (seven styles, five shells, screen patterns). The screenshots stay private; the
skill carries only the measurements and the rules. Blind test rounds of app screens built with and
without the skill then shaped the warnings at the top of that file.

---

## 📄 `references/scenes.md`

# Scroll scenes

The big moments of a page: stretches of scroll where the page stops being a column of sections and
becomes a scene. A camera flies through a field of pictures, a picture grows from a window to the whole
screen, a word buckles under the scroll, a set of photographs orbits and lands in a grid. These are what
visitors remember from award sites, and what a page built from tidy sections alone never has.

The scene library is taken apart from recent Awwwards Sites of the Day (October 2026: 43 sites recorded
frame by frame while scrolling, 261 scenes described, 30 types), rebuilt from scratch in our own code,
tested frame by frame at desktop and phone width and under reduced motion, and reviewed against the
scenes it came from. Nothing a site owns is in them. Until `library/scenes.json` ships the draw deals
none; a page that needs a scene builds one on the stage (section 8), with every rule here.

## Contents

1. What a scene is
2. Putting a scene on a page
3. Filling it
4. Fitting it to the page
5. The phone, reduced motion, no script
6. Checking it
7. Rules for scenes
8. When no scene in the library fits
9. The catalogue

## 1. What a scene is

A tall section whose stage holds still while the page scrolls past it. The stage is
`position: sticky`; the section is (hold + 1) screens tall, so the stage is held for `hold` screens;
a GSAP timeline is scrubbed from 0 to 1 by that scroll. Nothing captures the wheel: the scrollbar always
tells the truth, the keyboard and the trackpad work as everywhere else, and the scene ends.

What a scene is not: a fade-up, a small parallax, a sticky footer, a marquee. Those are the quiet layer
(`references/motion.md`). A scene changes the whole screen.

The direction sheet deals two or three (section 9 of the sheet), from different families, each placed
on the section of the argument it can carry. Build them in step 6, with that section: a scene is
composition, not decoration added at the end.

## 2. Putting a scene on a page

Copy the shared stage and the dealt scene's files into the project (`assets/scenes/stage.css`,
`stage.js`, `<id>.css`, `<id>.js`). Each scene file's header comment lists the markup it expects and
its options; `assets/scenes/demo/<id>.html` is a complete working page to read beside it.

```html
<head>
  <script>document.documentElement.classList.add('js')</script>
  <link rel="stylesheet" href="scenes/stage.css">
  <link rel="stylesheet" href="scenes/<id>.css">
</head>
<body>
  …
  <section class="scene" data-scene="<id>" data-options='{"hold": 3}' aria-label="…">
    <div class="scene-stage">
      <!-- the markup from the scene file's header, filled with this page's content -->
    </div>
  </section>
  …
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js"></script>
  <script src="scenes/stage.js"></script>
  <script src="scenes/<id>.js"></script>
  <script>Stage.smooth(); Stage.init();</script>
</body>
```

- Load SplitText (`gsap@3.15.0/dist/SplitText.min.js`) only when a scene file says it needs it.
- `Stage.smooth()` adds weighted wheel scrolling (Lenis at lerp 0.12). It stays off for touch and for
  reduced motion. Leave it out on a quiet page; the scenes work either way.
- `Stage.init()` starts every `[data-scene]` on the page. A page with two scenes loads both files.
- The versions are pinned. Do not change them to `@latest` or an unpinned major.

## 3. Filling it

A scene is only as strong as what goes in it. The scene file's header and the sheet's "Content" line
say how many pictures and words it takes; these hold for all of them:

- **Pictures of one family.** Same light, same grade, same kind of subject: a field of mismatched stock
  photographs breaks the illusion of one space faster than any timing error. Real pictures of the
  subject's world (`assets.mjs`), the project's own, or the dealt photographs, in that order
  (`references/imagery.md`). Size each to its largest display size, set `width` and `height`.
- **Words that read in a breath.** A held statement is 4 to 12 words; captions are one to four words in
  the text face, sentence case. One statement on screen at a time.
- **The scene says something about the subject.** A fly-through of the studio's work, the route a
  shipment really takes, the four rooms of the house, the product's change of state. A scene filled
  with unrelated pictures is a gimmick and reads as one.
- **Real content only.** If the scene needs eight pictures of the subject and there are three, take the
  `--redraw scenes`, never pad it with stand-ins.

## 4. Fitting it to the page

- The scene files read the page's tokens: `--ground`, `--ink`, `--muted`, `--accent`,
  `--font-display`, `--font-text` (with fallbacks). Set them on `:root` from the sheet and the scene
  takes the page's colour and type. Check the demo against your page, not the other way round.
- Display type in a scene uses the dealt display face and the two-line headline rule; statements stay
  at statement size.
- Leave a quiet section between two scenes (a text section, a list, a plain picture) so each one lands.
  Two scenes back to back read as one long ride and the second loses.
- A scene on the first screen must be readable at progress 0: the title, the sentence and the action are
  there on the first frame (motion rule 1), and the scene starts moving only when the visitor scrolls.
- Give the section a heading. If the design has no visible heading in the scene, the section still
  carries one (`aria-label` on the section and a real heading in the finished composition).

## 5. The phone, reduced motion, no script

- **The phone.** Each scene has a phone plan in its file: the same scene with changed numbers, a
  simpler version, or `phone: 'rest'`, where the phone shows the finished composition. Touch scrolling
  is never smoothed. Look at the phone sheet as carefully as the desktop one.
- **Reduced motion and no script.** The section is an ordinary section showing the finished
  composition: the same content, laid out to read without motion. Nothing is hidden waiting for a
  script. The inspector's `reduced-hidden` check and the reduced sheet of `scenes.mjs` show it.
- **A failed CDN** falls back to the finished composition too (the stage adds `.is-rest`). The
  inspector fails a scene that rests on desktop (`scene-not-live`), so a broken script cannot pass.

## 6. Checking it

```bash
node <skill>/scripts/scenes.mjs <page>        # every scene at 0, 10 … 100%, desktop and phone, and reduced motion
node <skill>/scripts/inspect.mjs <page>       # the gate; with scenes on the sheet it also films the scroll
```

`scenes.mjs` writes one contact sheet per scene and width to `.taste-skill/scenes/`. Read every one.
At every frame ask: is there one clear thing to look at; can the statement on screen be read; is
anything popping, blank, cut off or crossing the words; is it as bold as it should be? The inspector's
`desktop-film-NN.jpg` shows the whole page's scroll a third of a screen at a time: check that the
scenes and the quiet sections between them make a rhythm, and that nothing between them is empty.

## 7. Rules for scenes

1. **Two or three per page,** from different families, a quiet section between them. The inspector
   warns over four (`many-scenes`) and when scenes hold more than 60% of the page (`scene-heavy`).
2. **Each holds one to four screens:** about one screen per beat of the story; a hold with nothing new
   to show is cut, not padded.
3. **Native scroll only.** No wheel capture, no locking the page, no scenes that only run on a click.
   Smoothing only through `Stage.smooth()`.
4. **Readable at its rest points.** The statement on screen reads whole; nothing passes over text while
   it is being read; text on a picture has a flat scrim or a calm area under it.
5. **Inside a scene the scene's numbers apply** (motion rule 7): a picture may grow from a window to the
   whole screen, type may cross the stage, a camera may fly through pictures. Outside scenes, the quiet
   limits of `references/motion.md` hold.
6. **Transform, opacity, clip-path.** Nothing that forces layout on every frame. Pictures decoded before
   they move.
7. **The house rules hold inside scenes:** no monospace captions, no 01/07 counters (a plain "3 of 7" if
   a count is needed), no gradients (flat scrims), no shadows or glows, no hairline decoration, no
   decorative particles, no violet.
8. **The finished composition is designed,** not an afterthought: it is what reduced motion, a failed
   script and some phones see.

## 8. When no scene in the library fits

Redraw first (`--redraw scenes`). If the brief really needs a scene the library does not have, build it
on the same stage so it inherits the guards:

```js
Scenes['my-scene'] = (root, opts = {}) => Stage.scene(root, {
  hold: opts.hold ?? 2,          // screens the stage is held for
  scrub: opts.scrub ?? true,     // true when Lenis runs; 0.4-0.8 without it reads as weight
  phone: 'same',                 // or 'rest', or { hold, build } for a phone plan
  build(tl, { q, phone }) {      // positions are fractions of the scene, 0-1
    tl.fromTo(q('.picture'), { clipPath: 'inset(30% 30% 30% 30%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6 }, 0)
      .to(q('.title'), { yPercent: -40, autoAlpha: 0, duration: 0.25 }, 0.7);
  },
});
```

and write its CSS finished composition first, then the live layout under `.scene.is-live`. Check it
with `scenes.mjs` like any other.

## 9. The catalogue

(Generated from `library/scenes.json`; the draw deals from it. `node <skill>/scripts/draw.mjs --list
scenes` prints it.)

---

## 📄 `references/tells.md`

# Tells — the dated registry

A tell is a device that makes a page read as generated. Tells are not bad design in themselves; most
began as good ideas on good sites. They became tells by being produced by default, everywhere, without
a reason. That is why this registry is dated, and why it never names a replacement font, colour or
component: every published "use this instead" list has become the next wave of tells within months.
Replacements here are procedures (draw from the library, derive from the subject), not products.

`scripts/inspect.mjs` and `scripts/lint.mjs` detect most entries. Status: **banned** means the
inspector fails the page; **warned** means it flags it and you need a reason.

## Contents

1. First wave (2023–2024)
2. Second wave (2025)
3. Third wave (2025–2026): the "fix" that became the look
4. Gallery fashion, banned as house style
5. Structural tells
6. Copy tells
7. Motion tells
8. Why removal is not enough

## 1. First wave (2023–2024)

| Tell | Status | Do instead |
| --- | --- | --- |
| Violet / indigo gradients on hero, buttons and glows | banned | The dealt palette; flat colour |
| Gradient-filled headline text | banned | Solid ink |
| Glass panels: backdrop blur, translucent cards | warned (2 or more) | Opaque surfaces one tone step from the ground |
| Glowing or gradient "Get started" button | banned | Flat button named for its action |
| Soft grey drop shadow under every card | banned | Tone step, or no box |
| Three identical feature cards, each with an icon in a rounded square | banned | The dealt section blueprint |
| Emoji as icons or bullets | banned | Words, or a real picture |
| Centred headline, subtitle, two buttons, screenshot below | no rule; the draw avoids it | The dealt hero |
| The same typeface on every generated page | warned (lint: default-font) | The dealt type system |

## 2. Second wave (2025)

| Tell | Status | Do instead |
| --- | --- | --- |
| Eyebrow / kicker: tiny tracked uppercase label above every heading | banned | Fold it into the heading, or delete |
| Pill badge above the hero headline ("New", "Beta", "Introducing") | banned | Say it in the supporting sentence |
| One word of the headline in italic serif, colour or underline | warned | One face, one colour |
| Bento grid of rounded tiles as the feature section | warned as card rows | A composed section; tiles only in the dense-tiles direction, filled, strict sizes |
| Near-black ground with one neon accent and a glow | banned via shadow, gradient | A dealt dark palette, no glow |
| Floating rounded pill navigation with blur | warned | A plain bar |
| Fake dashboard hero built from grey bars and donut charts | no rule; see imagery.md §7 | A real interface fragment, or no image |
| Decorative status dot ("Available for work", pulsing "live") | lint: bounce | Remove |
| Fade-and-rise on every section | no rule; see motion.md | One signature move |

## 3. Third wave (2025–2026): the "fix" that became the look

The remedy published for the first two waves was "warm it up and make it editorial". Models adopted
the remedy wholesale and it is now the most recognisable generated look of all.

| Tell | Status | Do instead |
| --- | --- | --- |
| Yellow-cream ground + terracotta / rust / clay accent | banned together; terracotta banned alone; cream warned | The dealt palette. Warmth from a low-chroma stone, a deep ink, a photograph, or a full warm field |
| High-contrast or soft serif display as the shortcut to "premium" | no rule | The dealt type system, whatever class it is |
| Oversized italic serif headline | no rule | As dealt |
| Broadsheet cosplay: hairline rules everywhere, zero radius, dense columns | banned via hairline | Structure from space and tone |
| "Field notes", "Quietly trusted by", "On our desks": performative labels | lint: copy | Plain section names |

## 4. Gallery fashion, banned as house style

These are common on award sites right now. In the study they appear *more* often on the top-scored
sites than on the weak ones (panel observations: monospace labels 44% against 24%, index numbering 38%
against 21%; measured thin rules 61% against 52%). They are banned here regardless, by the owner's
decision: they are the first things a generator copies from the gallery, they carry no information,
and a page built without them has to find real structure.

| Tell | Status | Do instead |
| --- | --- | --- |
| Monospace micro-labels, mono as a "technical" voice, mono captions | banned | The text face; tabular figures for data |
| Index numbering: 01 / 02 / 03, (001), "Step 02", numbered section markers | banned | Order by position, scale, or the words; `<ol>` when it is truly a list |
| Thin rules: hairline dividers, ruled grids, 1px outlined boxes and tiles | banned (boxes: 3 or more) | Space, tone steps, filled shapes, a thick bar if a bar is the idea |
| Design-tool chrome as ornament: crosshairs, crop marks, selection handles, dashed guides, rulers | banned via hairline, dashed | Remove |
| Agency micro-meta: local time, coordinates, weather, version stamps, "©2026 — Scroll", middle-dot strings | lint: copy; micro-label | Remove |
| Tiny uppercase letter-spaced captions scattered around the viewport | banned (3 or more) | Sentence case at readable size, placed with the content it describes |

Tiny tracked capitals are the one item in this group the data condemns as well: 16% of top sites
against 57% of weak ones.

## 5. Structural tells

| Tell | Status | Do instead |
| --- | --- | --- |
| Headline as a full sentence at display size, three or four lines | banned (over two lines) | A title of about five words; the rest goes below |
| Stock section order: hero, logos, features, testimonial, pricing, CTA | no rule; see copy.md §1 | The order of the argument |
| Every section the same layout family | critique.md pass 9 | Different composition per section, from the sheet |
| Everything centred | warned over 72% | Left-anchored, one centred moment |
| One medium border radius (12–16px) on everything | none | Square or fully round, chosen once |
| Nine nearly equal font sizes | warned over 9 | Five sizes, far apart |
| Invented social proof: logos, quotes, star rows, "10,000+ teams" | copy.md §5 | Real proof, or none |
| Text or a CSS box where a picture belongs | critique.md cap | A real picture, or a design that needs none |

## 6. Copy tells

Flagged by `lint.mjs`: the genre's verbs and adjectives (unlock, supercharge, seamless, elevate,
effortless, cutting-edge, all-in-one …); the correction ("not just X, it's Y"); tricolon headlines;
"Get started" and "Learn more" as labels; more than a handful of em dashes; lorem ipsum. See
`copy.md` §6.

## 7. Motion tells

Identical fade-up on every block; a dozen staggered hero entrances; hover lift on every card; bounce
easing; infinite loops that mean nothing; reveals that fail and leave a blank band. See `motion.md` §9.

## 8. Why removal is not enough

A page with every tell removed and nothing put in their place is an empty page with good manners, and
that is a tell too (the "avoidance aesthetic": anyone could guess it from the category plus the list of
things to avoid). The tells were filling a gap where an idea should have been. The order of work in
`SKILL.md` exists to fill that gap first: the idea from the subject, the dealt composition, real
pictures or committed type, and only then the checks.

---

## 📄 `references/type.md`

# Type

Typography is most of what a visitor sees and most of what makes a page look designed or assembled.
The direction sheet deals you a type system (faces, weights, settings). This file is how to use it.

## Contents

1. What the study measured
2. The scale: few sizes, far apart
3. Setting display type
4. Setting text
5. Loading the fonts properly
6. One family or two
7. Details that separate set type from typed text
8. Mistakes the inspector cannot see

## 1. What the study measured

From 202 measurable sites out of the 247 studied (Chrome, 1440×900 and 390×844):

| | Median | Middle half | Note |
| --- | --- | --- | --- |
| Hero headline size | 72px (5.0vw) | 43–109px | Top-scored sites: 6.0vw median |
| Largest type on the page | 6.4vw | up to 10.4vw | Top-scored sites 8.4vw, weak sites 5.0vw |
| Hero headline on a phone | 40px | 32–59px | |
| Hero tracking | -0.01em | -0.03 to 0 | Tighter as size grows |
| Hero leading | 1.0 | 0.95–1.1 | |
| Body size | 16px | 14–18px | |
| Headline ÷ body size | 4.3 | | Top-scored sites 4.7 |
| Typefaces in real use | 2 | 31% use one, 45% two, 22% three | |
| Hero weight | regular 48%, medium 18%, bold or heavier 22% | | Big type does not need to be bold |
| Hero in capitals | 24% | | |
| Hero centred | 39% | | 52% on the weak sites |

Two things to take from it. First, size contrast is the main lever and the best sites pull it harder.
Second, weight is not: half of the heroes are set in a regular weight. Scale and spacing make type
confident; bold is one option among several.

## 2. The scale: few sizes, far apart

The panel described about 30 of the 114 strongest sites as using two or three type sizes with nothing
in between, and none as using a graded five- or six-step scale. So: one display size, one text size
and a small size carry the page; a lead size and a heading size exist for when they are needed. Five
is the ceiling. The common failure is nine sizes that are all near each other (16, 18, 20, 24, 28,
32…), which reads as mush. Choose steps that are clearly different:

```css
:root {
  --step-small: clamp(0.8125rem, 0.79rem + 0.1vw, 0.875rem);   /* 13–14px  captions, legal */
  --step-body:  clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem);    /* 17–19px  paragraphs */
  --step-lead:  clamp(1.25rem, 1.1rem + 0.7vw, 1.625rem);      /* 20–26px  supporting line, large body */
  --step-head:  clamp(2rem, 1.3rem + 3.2vw, 4rem);             /* 32–64px  section headings */
  --step-display: clamp(3rem, 1rem + 9vw, 9rem);               /* set by the hero blueprint */
}
```

- `--step-display` belongs to the direction. A monument wordmark is 16–24vw; a quiet instrument's
  headline is 28px. Use the size the hero blueprint gives, as a `clamp()` so it scales with the
  viewport but is bounded on phones and very wide screens.
- Keep the gap: the display size should be at least four times the body size on desktop, and nothing
  should sit between `--step-lead` and `--step-head` unless the design truly needs a sixth size.
- Resist a "subheading" size for every card and label. If two sizes look almost the same, make them
  the same.

## 3. Setting display type

Large type exposes spacing that is invisible at text size. Apply all of these to anything over 40px:

```css
.display {
  font-size: var(--step-display);
  line-height: 0.95;              /* 0.85–1.05; tighter for capitals and condensed faces */
  letter-spacing: -0.035em;       /* -0.02 to -0.05em; use the value on the direction sheet */
  font-kerning: normal;
  text-wrap: balance;
  max-width: 14ch;                /* choose the measure so lines break where you want */
  margin: 0;
}
```

- **Tracking scales with size.** The larger the type, the tighter it needs to be; a value right for
  120px will choke 32px. Set tracking per step, not once for all headings.
- **Leading below 1.0 needs checking.** Look for collisions between descenders and the ascenders or
  accents of the next line. Two-line headlines make this easy to verify by eye.
- **All capitals** want slightly open tracking (0 to +0.03em) even at display size, and leading around
  0.9.
- **Optical alignment.** Big letters with round or diagonal left edges (O, C, A, T, W) look indented.
  Pull the headline left by about 0.04–0.06em (`margin-left: -0.05em`) so it aligns optically with the
  text beneath it.
- **Viewport-wide type.** For a line that must span the screen, size it in `vw` and verify at 390 and
  1440; set `white-space: nowrap` and let the container clip rather than wrap. Calculate the size from
  the character count: `font-size ≈ container width ÷ (characters × k)` with k from `copy.md` §2.
- Never add a text shadow, an outline stroke, or a gradient fill to display type.

## 4. Setting text

```css
body { font-size: var(--step-body); line-height: 1.5; font-kerning: normal; text-rendering: optimizeLegibility; }
p { max-width: 62ch; text-wrap: pretty; margin: 0; }
p + p { margin-top: 0.9em; }
.lead { font-size: var(--step-lead); line-height: 1.35; max-width: 40ch; }
small, .caption { font-size: var(--step-small); line-height: 1.45; }
```

- Measure: 45–75 characters. Wider than that and the eye loses the next line; the inspector warns
  past about 88.
- Leading: 1.45–1.6 for body, tighter (1.3–1.4) for the larger lead size, looser for long reading.
- Secondary text is the same face in a softer ink (`--muted`), not a lighter weight and not smaller
  than 13px.
- Do not centre paragraphs longer than three lines. Do not justify.
- Light text on a dark ground looks heavier: drop one weight step or add 0.01em tracking, and raise
  leading slightly.

## 5. Loading the fonts properly

The sheet gives a `<link>` tag. Use it exactly; do not swap in a face you prefer.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="…from the direction sheet…" rel="stylesheet">
```

```css
:root {
  --font-display: "Family From Sheet", "Helvetica Neue", Arial, sans-serif;
  --font-text: "Family From Sheet", Georgia, serif;
}
```

- Request only the weights you use (usually two or three in total).
- Always give a fallback stack of the same broad kind (sans for sans, serif for serif).
- In a framework, use its font loader with the same family and weights (`next/font/google`, or a
  self-hosted `@font-face` with `font-display: swap`). Fontshare faces load from the
  `api.fontshare.com` stylesheet on the sheet.
- After building, `inspect.mjs` reports the families that actually rendered. If it warns that a face
  did not load, the screenshots show a fallback and nothing you judge from them is real. Fix the link
  first.

## 6. One family or two

A third of the studied sites use a single family for everything, and it is the safest way to look
coherent. When the dealt system has two faces:

- Give each a job and never swap them: one sets headlines, the other sets everything else.
- Do not introduce a third face for labels, numbers or quotes.
- Do not mix two faces inside one headline.
- Italic is for titles of works and real emphasis inside paragraphs, never as decoration.

## 7. Details that separate set type from typed text

- Curly quotes and apostrophes, real dashes, a real ellipsis (see `copy.md` §7).
- `font-variant-numeric: tabular-nums` for prices, tables, dates in columns; `oldstyle-nums` suits
  serif body text.
- `text-underline-offset: 0.18em; text-decoration-thickness: 0.07em` on links, so underlines clear the
  descenders.
- `hyphens: none` on headings. `overflow-wrap: anywhere` only on long URLs or emails.
- A heading belongs to the text after it: space above a heading is at least twice the space below.
- `::selection { background: var(--accent); color: var(--accent-ink); }` and a visible
  `:focus-visible` outline in the accent, so even the browser's own states belong to the design.
- Do not change weight on hover; the line reflows.

## 8. Mistakes the inspector cannot see

- A headline that passes the two-line rule but breaks badly: one orphan word on line two, or a break
  that splits a phrase ("Stools for small / kitchens"). Author the break.
- Display type so tight that letters touch, or so loose it falls apart.
- A confident hero followed by section headings almost as large. Keep one size dominant per screen.
- Body text set in the display face when that face was drawn for large sizes only.
- Everything bold. If every line is emphasised, none is.
