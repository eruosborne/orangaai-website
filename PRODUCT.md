# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Existing codebase: static HTML, CSS and vanilla JS pages with Vercel serverless functions in `api/`. Clean URLs and redirects live in `vercel.json`. Deploys to Vercel on push to `main`, and Eru confirms before any push.

## Users
Every visitor is an owner-operator in Australia or New Zealand who is the bottleneck in their own business. Everything runs through them and stops when they stop. Most arrive on a phone from Instagram or Facebook. Set by Eru on 2026-11-11, the site has two kinds of page, and each speaks to that owner differently.

**Public pages, kept broad:** home (`/`), how it works (`/how-it-works`), about (`/about`), results (`/results`), the Bottleneck Score quiz (`/admin-exposure`) and the Bottleneck Audit booking (`/bottleneck-audit`). These speak to owners of owner-operated service businesses in general, in any trade or service.

**Landing pages, specific to the ad that sends people there:** `/watch`, `/webinar`, `/workshop` and `/brain-booking`. Each one is the second half of an ad. It speaks to the audience the ad targeted, in the ad's own words. When the ad leads with crane, rigging and civil construction owner-operators, the page does too.

The decision every visitor makes is whether to book a free 30-minute strategy call.

## Product Purpose
Oranga AI installs The Core in a customer's business in less than a day. It reads the inbox, prepares replies and quotes, follows up and keeps working overnight, and the owner approves anything that goes out. The site exists to get the right owner onto a call. Success is a booked call, then a signed install. It is a high-ticket, consultative sale and nothing is sold self-serve on the site.

## Positioning
The Core is built around one business and installed for the owner, not bought as a tool they set up themselves. It changes as the business does, because the owner can add their own playbooks later without calling Oranga AI. It is guardrail-first: a charter the assistant cannot edit locks six actions, including reaching an outside person and moving money. The promise is more done in the same hours and getting the owner out of the middle, not hours saved. Full wording and approved lines live in `01-knowledge/positioning.md` in the Oranga workspace, which wins over this file on copy.

## Operating Context
- Eru runs Oranga AI alone and approves every page before it goes live.
- Traffic comes from reels, Meta ads, organic posts and referrals. Visitors arrive mostly on a phone, inside a social app's browser.
- Conversion paths are the Bottleneck Audit booking, the Bottleneck Score quiz, webinar sign-up and `/watch`. Older addresses (`/admin-audit`, `/strategy-call`, `/oranga-core`) redirect to the current ones.
- Meta Pixel `1601510988349512` tracks `PageView`, `ViewContent`, `Lead` and `Schedule`, alongside Google Analytics. The content security policy in `vercel.json` blocks new third-party scripts and frames other than YouTube's no-cookie player.
- Price is sold on the call and never appears in public copy.

## Capabilities and Constraints
- The product name is **The Core**, with a capital T even mid-sentence. The business is Oranga AI. "Oranga Core" never appears in anything public.
- **Public pages describe it as an AI admin system** (Eru, 2026-11-11). Landing pages use whatever term their ad uses, which is often "AI brain".
- No AI jargon about the technology, such as agents, prompts, automations or workflows.
- Never write that The Core sends anything. It prepares and the owner sends.
- Quoting is standard. Tenders and invoices are not, so say "once you've shown it how" unless Eru approved the broader line for that page, as he did on `/watch` and on `/how-it-works` (2026-11-12). Eru, 2026-11-12: out of the box it does any computer job tied to the customer's connected tools, such as quote and proposal PDFs, documents, tender summaries and answers from Xero. Some jobs need setting up properly first, so public copy shows these as examples, not a fixed list.
- No comparisons to chatbots or other tools, no "who it's not for" lists and no "10x".
- Never claim hours saved for crane or civil clients, and never claim the AI won contracts.
- The spoken guarantee is "More done in 7 days, or your money back." A stronger wording from 2026-11-10 is not approved.

## Brand Commitments
- Voice: premium but human. Calm, confident, direct and warm. Sell freedom of choice rather than features, in plain first-person words that read like Eru talking.
- Writing rules: no exclamation marks, no em dashes, no comma before "and", and no stacks of five-word sentences.
- Tagline "Freedom of choice.", with "Grow more. Do less." as the supporting line.
- The orb "O" is the brand mark.
- The visual identity is set in `01-knowledge/positioning.md` section 10 in the Oranga workspace and is not restated here.
- Testimonials keep the customer's exact words with only the product name swapped. Customers are named by sector only unless they agreed to a name.

## Evidence on Hand
Real and in writing, used in this order:
1. Chanse Perham, Private Lending (named with his agreement on 2026-10-28): "I don't need an admin at all now... triple the work done in the same hours."
2. A hospitality lodge sorted a multi-year tour group booking mess in 15 minutes instead of half a day. Sector only.
3. A civil construction business recovered $20,000 after The Core found a payment condition buried in a roughly 30-page contract. Sector only.
4. A crane company, by email: "Since using this we have successfully been awarded over $5m in contracts", and the biggest change was "speed from thought to execution". Cleared for the site by Eru on 2026-11-11 as "a crane company", never named.
5. A civil construction owner: "this has fast tracked me about 2 years in 2months." Sector only.

Absent: no customer video, no logos, no measured time saved and no 10x testimonial. Do not invent any of these.

## Product Principles
1. Sell the outcome, freedom of choice, and show the product as the way there.
2. The owner stays in control, and any page that shows the product keeps that visible.
3. Proof comes only from what exists in writing, and demo numbers are labelled as demos.
4. A landing page finishes its ad. It matches the ad's audience and words and has one job, the call.
5. Honest over polished. A page should sound like the founder, not a brochure.

## Accessibility & Inclusion
No formal standard has been set. Visitors are mostly on phones, often between jobs or on site, so every page has to work one-handed at small sizes and in an in-app browser.
