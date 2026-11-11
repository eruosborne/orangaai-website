---
name: Oranga AI
description: The marketing site and funnel for The Core, Oranga AI's AI admin system for owner-operators.
colors:
  night-stage: "#121517"
  night-raised: "#1B2124"
  night-sunk: "#0D1012"
  night-deepest: "#0B0E0F"
  warm-ink: "#F2EBE1"
  warm-ink-muted: "#B9AFA3"
  warm-ink-faint: "#9A9085"
  teal: "#3DBF9F"
  teal-deep: "#1B6B5E"
  teal-text: "#6FDCC0"
  mint-glow: "#5EF2C4"
  sage-success: "#A3B585"
  coral-alert: "#E8866E"
  tag-seafoam: "#9DC4BC"
  demo-bg: "#161B1E"
  demo-raised: "#22292D"
  demo-dot: "#343B3F"
  demo-ink: "#ECE6DC"
  demo-body: "#D8D1C6"
  demo-muted: "#A39A8F"
  lit-1: "#63C0A9"
  lit-2: "#56B49D"
  lit-3: "#52AE97"
  demo-avatar-tan: "#E0B884"
  demo-avatar-rose: "#C9A7A0"
typography:
  display:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(2.4rem, 6vw, 4rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4.6vw, 2.75rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 1.875rem)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  body-large:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
  ui:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
  label:
    fontFamily: "DM Mono, ui-monospace, SF Mono, Consolas, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.04em"
  eyebrow:
    fontFamily: "DM Mono, ui-monospace, SF Mono, Consolas, monospace"
    fontSize: "0.72rem"
    fontWeight: 500
    letterSpacing: "0.14em"
  small:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  default: "6px"
  large: "10px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  2xl: "64px"
  3xl: "96px"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.night-stage}"
    typography: "{typography.ui}"
    rounded: "{rounded.default}"
    padding: "13px 24px"
  button-primary-large:
    backgroundColor: "{colors.teal-deep}"
    textColor: "{colors.warm-ink}"
    rounded: "{rounded.default}"
    padding: "16px 32px"
  button-ghost:
    textColor: "{colors.warm-ink}"
    typography: "{typography.ui}"
    rounded: "{rounded.default}"
    padding: "13px 24px"
  glass-card:
    textColor: "{colors.warm-ink}"
    rounded: "{rounded.large}"
    padding: "18px 44px 18px 20px"
  input-field:
    backgroundColor: "{colors.night-sunk}"
    textColor: "{colors.warm-ink}"
    rounded: "{rounded.default}"
    padding: "11px 12px"
---

# Design System: Oranga AI

> Updated 2026-11-11 with the taste-skill redesign: body text is Figtree and labels DM Mono (Karla and IBM Plex Mono retired on the site), headlines are Bricolage Grotesque at weight 400, buttons are pills in Working Teal with charcoal text, small labels are sentence case, and drawn product windows sit on a lit teal ground. Where the sections below still describe the older build (uppercase mono eyebrows, deep teal buttons, glass cards on the homepage), this note wins. The shared page CSS is `site.css`; the kit is in `assets/`.

## Overview

**Creative North Star: "The Night Shift"**

The site is a calm dark room where the work keeps going after the owner has left. Everything sits on a near-black charcoal stage, lit by one source: the glowing glass orb on the homepage and the mint and teal light that comes off it. Nothing is loud. Text is a warm off-white rather than pure white, so the room reads as lamplit rather than screen-bright, and the accent appears where something is working or where the visitor can act.

Density is low and the pace is unhurried. Sections breathe with tall vertical padding, headlines are short and balanced, and the homepage replaces a menu with a row of glass cards that act as the ways in. Details read as instrumentation: small uppercase mono labels with a short teal rule, thin hairline borders and square-cornered buttons. The feeling is a system quietly running under control, not a product demanding attention.

**Key Characteristics:**
- Dark mode only, on a charcoal stage (#121517), with warm off-white text.
- One light source: teal and mint, used sparingly for action and life.
- Glass cards with blur, a thin mint edge and a soft shadow.
- Engineered details: mono eyebrows, hairlines and 6px corners, never pills on buttons.
- Slow, eased motion that settles rather than bounces.

## Colors

A warm charcoal night lit by a single teal-to-mint glow, with warm paper-coloured text.

### Primary
- **Working Teal** (#3DBF9F): the accent for text, icons, borders, eyebrow rules and focus rings. It has 8:1 contrast on the stage.
- **Deep Teal** (#1B6B5E): button fills only, always with Warm Ink text (5.4:1).
- **Bright Teal Text** (#6FDCC0): small teal text that has to stand out, button borders and hover states (11:1).
- **Mint Glow** (#5EF2C4): the orb's own light. It is used in the hero only, for the highlighted word in a headline, the card arrows and glow shadows.

### Neutral
- **Night Stage** (#121517): the canvas of the whole site.
- **Night Raised** (#1B2124): raised surfaces such as cards, the top bar and chat panels.
- **Night Sunk** (#0D1012): recessed surfaces such as the footer, input fields and mock-up chrome.
- **Night Deepest** (#0B0E0F): the darkest zone background, for sections that need to step back further.
- **Warm Ink** (#F2EBE1): primary text (15.5:1).
- **Warm Ink Muted** (#B9AFA3): secondary text and subheadings (8.5:1).
- **Warm Ink Faint** (#9A9085): labels, captions and metadata (5.9:1).
- **Hairline** (rgba(242, 235, 225, 0.10)) and **Strong Hairline** (rgba(242, 235, 225, 0.22)): borders and dividers.

### Status
- **Sage** (#A3B585): success and done states.
- **Coral** (#E8866E): alerts only.
- **Seafoam** (#9DC4BC): tags.

### Demo windows
The drawn product UI (inbox, chat, notes, panels) uses its own steps, one notch warmer and dimmer than the page, so a window reads as a screen and not as page text. Tokens live at the top of `site.css`: `--demo-bg` (#161B1E), `--demo-raised` (#22292D), `--demo-dot` (#343B3F), `--demo-ink` (#ECE6DC), `--demo-body` (#D8D1C6) and `--demo-muted` (#A39A8F, about 6:1 on demo-bg). The lit teal frames behind the windows use `--lit-gradient`, built from `--lit-1` to `--lit-3`. Inbox avatars use Teal, Seafoam and two demo tints (#E0B884, #C9A7A0) with charcoal initials. Every window carries the "Example" tag.

### Named Rules
**The One Light Rule.** Teal and mint are the only light in the room. Any other hue appears only as a status colour, and the accent stays a small share of any screen.

**The Glow Stays Home Rule.** Mint Glow belongs to the hero and the orb. Elsewhere use Working Teal or Bright Teal Text.

**The Warm Ink Rule.** Text is never pure white. Use Warm Ink, Muted or Faint.

## Typography

**Display Font:** Bricolage Grotesque (with system-ui)
**Body Font:** Figtree (with system-ui)
**Label Font:** DM Mono (with ui-monospace)

**Character:** Bricolage gives headlines a confident grotesque with a little personality, Karla keeps long reading plain and friendly, and Plex Mono adds the readout feel to labels.

### Hierarchy
- **Display** (600, clamp(2.4rem to 4rem), 1.05, -0.02em): page heroes. The homepage hero headline runs smaller (clamp(1.9rem to 3rem)) so the orb stays the centrepiece.
- **Headline** (600, clamp(2rem to 2.75rem), 1.1): section headings, with the section head held to about 40ch.
- **Title** (500, clamp(1.5rem to 1.875rem), 1.2): sub-sections and card titles.
- **Body** (400, 1rem, 1.6) and **Body Large** (400, 1.125rem, 1.6): reading text, held to about 42 to 56ch. The page base is 17px.
- **UI** (500, 0.9375rem, 0.01em): buttons and controls.
- **Label** (Plex Mono 500, 0.8125rem, 0.04em, uppercase): card labels and data captions.
- **Eyebrow** (Plex Mono 500, 0.72rem, 0.14em, uppercase): the section label above a heading, led by an 18px Working Teal rule.

### Named Rules
**The Readout Rule.** Small uppercase text is always Plex Mono, tracked wide, in Warm Ink Faint or Muted.

**The Balanced Headline Rule.** Hero and section headlines use `text-wrap: balance` and stay short enough to sit on two or three lines on a phone.

## Layout

Content sits in a centred container with a 1200px maximum width and side padding of clamp(20px, 5vw, 56px). Sections stack vertically with tall padding (clamp(80px, 12vh, 96px), and more on alternate sections), so each section reads as its own screen. The spacing scale is 4, 8, 16, 24, 40, 64 and 96px.

The homepage hero fills at least the full viewport height. The headline is at the top, the orb is behind it and the glass cards run in a five-column row at the bottom. Inner pages use a slim page bar instead of a nav: the logo, a Book button and a fixed round back button in glass.

Grids collapse at 900px (three or more columns down to two) and at 600px (to one column). The 767/768px breakpoint switches hero and card arrangements for phones.

## Elevation & Depth

Depth is mostly tonal, with three surface levels: Night Sunk below the stage, the stage itself and Night Raised above it. Separate sections use hairlines rather than shadows. Real shadows appear only on glass elements, where they pair with blur to suggest a pane floating over the dark stage, and on small chat and booking UI.

### Shadow Vocabulary
- **Glass rest** (`box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 12px 32px rgba(0, 0, 0, 0.35)`): glass cards and the back button at rest. The inset line catches light on the top edge.
- **Glass lift** (`box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 16px 40px rgba(0, 0, 0, 0.4), 0 0 24px rgba(94, 242, 196, 0.18)`): glass cards on hover or focus, adding a faint mint halo.
- **Mint halo** (`box-shadow: 0 0 18px rgba(94, 242, 196, 0.18)`): badges and photos inside glass cards.
- **Small UI** (`box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4)`): chat bubbles and small controls.

### Named Rules
**The Tonal First Rule.** Separate with surface tone and hairlines. A shadow appears only where something is glass or floats.

## Shapes

Corners are gently squared: 6px on buttons, inputs and focus rings, and 10px on glass cards and larger panels. Buttons are rectangular and engineered, never pills. Fully round shapes are kept for the orb, the back button and status dots. Borders are 1px hairlines in Warm Ink at low opacity or in mint on glass.

## Components

### Buttons
Rectangular and engineered, not pills.
- **Shape:** gently squared corners (6px).
- **Primary:** a Deep Teal fill with Warm Ink text and a Bright Teal Text border, padded 13px 24px (large: 16px 32px). On hover it fades to 85% opacity.
- **Ghost:** transparent with a Warm Ink border and text. On hover the border and text turn Bright Teal Text.
- **Focus:** a 2px Working Teal outline, offset 3px.
- An optional 14px arrow icon sits after the label.

### Glass Cards
The signature component and the ways into the site.
- **Corner Style:** 10px.
- **Background:** smoked glass (rgba(18, 26, 28, 0.55)) with a 14px blur and 140% saturation. The primary card is tinted teal (rgba(40, 150, 128, 0.28)) with a stronger mint border.
- **Border:** 1px mint at 18% opacity, rising to 50% on hover.
- **Content:** a Plex Mono uppercase label above a Bricolage title, pinned to the bottom, with a Mint Glow arrow at the bottom right.
- **Hover:** lifts 4px and tilts back 6deg in perspective, adds the mint halo and nudges the arrow 3px right. Reduced motion removes the movement.

### Inputs / Fields
- **Style:** a Night Sunk fill, a Strong Hairline border, 6px corners, padded 11px 12px, Karla at 1rem.
- **Labels:** 0.88rem Karla in Warm Ink Muted, with optional fields marked in Faint.
- **Focus:** the border turns Bright Teal Text, with no glow.

### Navigation
- **Public pages:** the centred nav: orb and wordmark, four links (Product, Results, About, Quiz), a Book a call button and a menu toggle on phones.
- **Landing and funnel pages** (watch, webinar, workshop, brain-booking, booked): the orb and wordmark with at most one button, pointing at that page's own action.

### Eyebrow (retired 2026-11-11)
No small label above headings. A heading carries its own weight. Where a label held real information (a date, a time), it moves into the hero notice or the lead.

### FAQ
A list of `details` rows separated by hairlines, each with a Bricolage question and a Plex Mono "+" in Bright Teal Text.

### The Orb
A live 3D glass orb in icy blue and mint on the homepage stage. It fades in and settles from 103% scale once its first frames draw. Visitors without WebGL, JavaScript or motion get a static image of it instead.

## Do's and Don'ts

### Do:
- **Do** keep every page on the Night Stage (#121517) with Warm Ink text.
- **Do** use Deep Teal (#1B6B5E) for button fills and Working Teal (#3DBF9F) for text, icons and borders.
- **Do** lead section headings with the mono eyebrow and its teal rule.
- **Do** use the glass recipe exactly (55% smoked fill, 14px blur, 18% mint border, 10px corners) wherever a card floats over the stage.
- **Do** ease motion with cubic-bezier(0.22, 1, 0.36, 1) and give every movement a reduced-motion fallback.

### Don't:
- **Don't** use pill-shaped buttons. Buttons have 6px corners.
- **Don't** use pure white text or a light background. The site is dark only.
- **Don't** spread Mint Glow beyond the hero and glass elements.
- **Don't** add a second accent hue. Sage, Coral and Seafoam are status colours only.
- **Don't** use robot, neon or circuit-board imagery.
- **Don't** use drop shadows on flat sections. Separate them with tone and hairlines.
