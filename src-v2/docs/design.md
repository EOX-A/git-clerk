# Git Clerk 2.0 — Design Specification

> **Status:** Prototype / UI concept · **Source:** "Git Clerk" canvas (`Git Clerk.dc.html`) · **Last updated:** 14 Nov 2026
> **Audience:** Product, design and engineering on the Git Clerk 2.0 AI system (EarthCODE / Open Science Catalog contributors)

---

## Table of contents

1. [Product overview](#1-product-overview)
2. [Design principles](#2-design-principles)
3. [App shell and layout](#3-app-shell-and-layout)
4. [Design tokens](#4-design-tokens)
5. [Components](#5-components)
   - 5.1 [Sidebar](#51-sidebar)
   - 5.2 [Collapsed sidebar rail](#52-collapsed-sidebar-rail)
   - 5.3 [Account menu](#53-account-menu)
   - 5.4 [New session screen](#54-new-session-screen)
   - 5.5 [Session top bar](#55-session-top-bar)
   - 5.6 [Chat panel](#56-chat-panel)
   - 5.7 [Composer](#57-composer)
   - 5.8 [Automations and fill-in blanks](#58-automations-and-fill-in-blanks)
   - 5.9 [Dropdown menus](#59-dropdown-menus)
   - 5.10 [Visualizer](#510-visualizer)
   - 5.11 [Files drawer](#511-files-drawer)
   - 5.12 [File views: Preview, Editor, Source, Diff](#512-file-views-preview-editor-source-diff)
   - 5.13 [Dialogs](#513-dialogs)
   - 5.14 [Status, feedback and loading](#514-status-feedback-and-loading)
6. [Key user flows](#6-key-user-flows)
7. [Interaction and design patterns](#7-interaction-and-design-patterns)
8. [Responsive behaviour](#8-responsive-behaviour)
9. [Accessibility](#9-accessibility)
10. [Content and voice](#10-content-and-voice)
11. [State model](#11-state-model)
12. [Prototype settings](#12-prototype-settings)
13. [Known gaps and open questions](#13-known-gaps-and-open-questions)

---

## 1. Product overview

Git Clerk 2.0 lets people change Git repositories (catalog metadata, stories, documentation) by **chatting with an AI assistant** instead of editing files by hand. Every conversation is a **session**, and every session is backed by a **pull request (PR)** on its own branch.

The UI borrows the familiar shape of Gemini, Claude and ChatGPT:

- **Sessions live in a left sidebar.** One click reopens any past or active session.
- **A new session starts as a chat.** The user describes a change; Git Clerk creates the branch and draft PR and makes the file changes.
- **Results are shown visually first.** A *Visualizer* opens next to the chat and shows a rendered **preview** of the changed file. Source and a structured Editor are hidden by default and can be opened beside the preview.
- **Advanced users keep full control.** A files drawer offers a complete file browser and a Changes list for direct editing.

### Core objects

| Object | Description |
|---|---|
| **Account / organization** | The GitHub owner the repo belongs to. A personal account (e.g. `@srijitcoder`) is listed first, then organizations (`ESA-EarthCODE`, `eo-community`). |
| **Repository** | Target repo, e.g. `open-science-catalog-metadata`, `eo-dashboard-stories`. |
| **Session** | One chat, one branch (`gc/<pr>-<slug>`), one PR. Has a title, status, check state, messages, open tabs and unsaved drafts. |
| **PR status** | `Draft`, `Open`, `Merged`, `Closed`. Merged and Closed sessions are read-only. |
| **Checks** | `Checks running`, `Checks passed`, `Changes requested`. |
| **Automation** | A guided task template: *Add product*, *Add project*, *Update dates*. |
| **Model** | The AI model used for the session (Auto, Gemini family, ESA Φ-lab EVE-Instruct). |

---

## 2. Design principles

1. **Conversation first, files second.** The chat is always reachable; files appear when they're relevant.
2. **Preview before code.** If a file can be rendered (catalog JSON, Markdown), show the rendered result. Source is one click away, never forced.
3. **Progressive disclosure.** Drawer closed by default, Editor/Source hidden by default, advanced controls behind ⋮ menus.
4. **Status is always visible and colour-coded.** PR state, check state, unsaved edits and changed files each have one consistent colour and icon.
5. **Calm, tonal surfaces.** Soft tinted backgrounds instead of heavy borders; one strong colour (primary navy) reserved for primary actions and the assistant's identity.
6. **Never lose work.** Unsaved changes are marked on tabs, and closing a tab with drafts asks to Save / Discard / Cancel.
7. **Flexible workspace.** The chat can float over the Visualizer or dock beside it, and can be moved and resized.

---

## 3. App shell and layout

### 3.1 Regions

```
┌──────────┬──────────────────────────────────────────────────────────┐
│          │  Session top bar (title · status · checks · repo · PR · ⋮) │
│ Sidebar  ├──────────────────────────────────────────────────────────┤
│  240 px  │                                                          │
│          │   Visualizer (full width)          ┌───────────────────┐ │
│ (52 px   │                                     │ Floating chat     │ │
│ when     │                                     │ 480 × ≤640 px      │ │
│ collapsed│                                     │ draggable/resizable│ │
│ )        │                                     └───────────────────┘ │
└──────────┴──────────────────────────────────────────────────────────┘
```

**Docked layout** (after "Dock chat"):

```
┌──────────┬──────────────────────────────────────────────────────────┐
│ Sidebar  │  Session top bar                                          │
│          ├──────────────────────┬─┬─────────────────────────────────┤
│          │  Chat panel          │║│  Visualizer                      │
│          │  (min 320 px)        │║│  (min 380 px, resizable)         │
└──────────┴──────────────────────┴─┴─────────────────────────────────┘
```

**Read-only session (Merged / Closed)** — no Visualizer; the chat fills the area under the top bar.

**New session screen** — no top bar; a centred composer fills the main area.

### 3.2 Layout modes

| Mode | When | Chat | Visualizer |
|---|---|---|---|
| **New** | No session selected | Centred composer (max ~520 px) | Hidden |
| **Floating** (default for live sessions) | Open/Draft session on desktop | Fixed-position card, bottom-right, 24 px inset | Full width |
| **Docked** | User clicks *Dock chat* | Left column | Right column, divider between |
| **Full chat** | Merged/Closed session, or Visualizer closed | Full width | Hidden |
| **Mobile** | Viewport < 860 px | Chat **or** Files, switched by a segmented control | — |

---

## 4. Design tokens

All colours are CSS custom properties defined on `:root`, with a full dark-theme override on `:root:has([data-gc="dark"])`.

### 4.1 Colour — surfaces and text

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#FAFBFC` | `#0F141A` | App background, main canvas, preview pane |
| `--surface` | `#F2F4F7` | `#151C24` | Secondary panels |
| `--sidebar` | `#EEF2F6` | `#151C24` | Sidebar and collapsed rail |
| `--elev` | `#FFFFFF` | `#1A222B` | Cards, composer, menus, floating chat |
| `--ws-nav` | `#ECEFF3` | `#11171E` | Visualizer tab bar and files drawer |
| `--ws-hover` | `#DCE2E9` | `#202A35` | Hover inside the Visualizer chrome |
| `--ws-seg` | `#D8DFE7` | `#2A3541` | Files/Changes segmented control track |
| `--text` | `#12202D` | `#E1E7EE` | Primary text |
| `--muted` | `#4D5E6E` | `#9AA8B6` | Secondary text, icons, labels |
| `--border` | `#BFCAD6` | `#3A4755` | Strong borders, inputs |
| `--border-soft` | `#E1E6EC` | `#26313C` | Dividers, card borders |
| `--hover` | `#E7EBF0` | `#212C38` | Default hover fill, segmented tracks |
| `--scrim` | `rgba(10,24,38,.45)` | `rgba(0,0,0,.55)` | Modal and mobile-drawer backdrop |

### 4.2 Colour — brand and accent

| Token | Light | Dark | Use |
|---|---|---|---|
| `--primary` | `#004170` | `#9ECAFF` | Primary buttons, links, assistant header, Git Clerk label, focus ring |
| `--on-primary` | `#FFFFFF` | `#003258` | Text/icons on primary |
| `--tint` | `#D9E6F2` | `#16304A` | Selected states, chips, #mentions, automation strip, count badges |
| `--blank` | `#E0E9F3` | `#1C2D40` | Fill-in blank blocks in automation templates |

### 4.3 Colour — status and semantic

| Token | Light | Dark | Meaning |
|---|---|---|---|
| `--draft` | `#55677A` | `#9AA8B6` | Draft PR |
| `--open` | `#1A7F37` | `#5FD38A` | Open PR, checks passed, "has changes" dot, saved confirmation |
| `--merged` | `#6F42C1` | `#BF9BFF` | Merged PR |
| `--closed` | `#CF222E` | `#FF7B72` | Closed PR, validation errors, changes requested |
| `--warn` | `#8F5F00` | `#E3B341` | Checks running, *Modified* file status |
| `--dirty` | `#B98100` | `#F5C451` | Unsaved-changes dot on tabs |

### 4.4 Colour — diff and syntax

| Token | Light | Dark |
|---|---|---|
| `--add-bg` / `--add-fg` | `#E3F4E7` / `#116329` | `rgba(46,160,67,.17)` / `#7EE29A` |
| `--del-bg` / `--del-fg` | `#FCE8EA` / `#A40E26` | `rgba(248,81,73,.17)` / `#FFA198` |
| `--hunk-bg` | `#E8EFF6` | `#162636` |
| `--syn-key` | `#004170` | `#9ECAFF` |
| `--syn-str` | `#8A4508` | `#F0B87A` |
| `--syn-num` | `#6F42C1` | `#CDB4FF` |
| `--syn-kw` | `#B3261E` | `#FF9C8F` |
| `--syn-punc` | `#4D5E6E` | `#8796A5` |

### 4.5 Status tone recipes

Status colour is applied as a **tone**, never as a solid fill (except primary buttons):

- **Chip:** `background: color-mix(currentColor 7%)`, inset 1 px ring of `--border-soft`, text and icon in the status colour.
- **Banner** (read-only session): `background: color-mix(status 8%, --bg)`, border `color-mix(status 32%, --border-soft)`, status icon in full colour, body text in `--text`.
- **Accent tint** (primary-tinted button): `color-mix(--primary 4%, --hover)`; hover 8%; active 12%.

### 4.6 Typography

| Role | Family | Size / line height | Weight |
|---|---|---|---|
| Page heading (new session) | Inter | 27 / 34 px, −0.022em | 600 |
| Preview title | Inter | 22 / 28 px, −0.015em | 600 |
| Session title (top bar) | Inter | 14 / 22 px | 600 |
| Body / chat messages | Inter | 14 / 22 px | 400 |
| UI labels, buttons | Inter | 12.5–13 px | 500 |
| Meta, hints | Inter | 11.5–12 px | 400–500 |
| Timeline role label (YOU / GIT CLERK) | Inter | 11 / 15 px, uppercase, +0.07em | 600 |
| Code, paths, branch names, IDs | IBM Plex Mono | 11.5–12.5 px | 400–500 |
| Wordmark "Git Clerk" | Inter | 15 px, −0.02em | 700 |

Fonts load from Google Fonts: Inter (400/500/600/650/700) and IBM Plex Mono (400/500). Fallback: `system-ui, sans-serif`.

### 4.7 Spacing, radius and sizing

- **Spacing scale (px):** 2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 22 · 24 · 28 · 32.
- **Radius:**

| Element | Radius |
|---|---|
| Chips, badges, small icon buttons | 5–7 px |
| Buttons, inputs, list rows | 8–9 px |
| Segmented controls (track) | 8–10 px |
| Menus, cards, file cards | 12–14 px |
| Floating chat window, read-only banner | 16 px |
| Composer | 20 px |
| Send / mic buttons, avatars | 50% (circle) |

- **Control heights:** 26 px (segment buttons) · 28–30 px (compact buttons) · 32 px (toolbar buttons, chips in composer) · 36–38 px (send, primary rows) · 44 px (touch targets on mobile).
- **Fixed widths:** sidebar 240 px; rail 52 px; floating chat default 480 px (min 320); files drawer 256 px.

### 4.8 Elevation

| Level | Shadow | Used on |
|---|---|---|
| 0 | none | Panels, sidebar |
| 1 | `0 1px 2px rgba(16,24,40,.04), 0 10px 30px -14px rgba(16,24,40,.18)` | Composer |
| 2 | `0 1px 2px rgba(16,24,40,.06), 0 16px 40px -16px rgba(16,24,40,.30)` | Floating chat |
| 3 | `0 16px 40px -12px rgba(16,24,40,.28)` | Dropdown menus, account menu, popovers |
| Selected segment | `0 1px 2px rgba(16,24,40,.14)` | Active segment in segmented controls |

### 4.9 Motion

| Name | Spec | Use |
|---|---|---|
| `gcspin` | rotate 360°, 0.8 s linear, infinite | Status spinner ("Creating draft pull request…") |
| `gcshim` | gradient sweep, 1.4 s ease, infinite | Visualizer loading shimmer |
| `gcdot` | 3-dot bounce | Typing/thinking indicator |
| Reduced motion | `prefers-reduced-motion: reduce` disables the shimmer animation | — |

### 4.10 Iconography

A single inline SVG sprite, 24 × 24 viewBox, 1.75 px round stroke (a few filled glyphs: GitHub mark, grip, dots). Rendered at 12–20 px. Icons are always `aria-hidden` with a text label or `aria-label` on the control.

| Group | Icons |
|---|---|
| Navigation | `panel`, `menu`, `chev-down`, `chev-right`, `x`, `collapse`, `pip`, `grip`, `dots`, `dots-v`, `sliders` |
| Git / PR | `branch`, `pr-open`, `pr-draft`, `merge`, `pr-closed`, `diff`, `repo`, `org`, `github`, `external` |
| Files | `file`, `file-plus`, `file-diff`, `folder`, `files`, `code`, `form`, `eye`, `split` |
| Actions | `new`, `plus`, `send`, `mic`, `stop`, `trash`, `pencil`, `logout` |
| Status | `check`, `check-circle`, `clock`, `alert` |
| AI | `bolt` (automation), `model` (model picker) |
| Theme | `sun`, `moon` |

---

## 5. Components

Each component lists **purpose**, **anatomy**, **states**, **actions** and **accessibility** notes.

---

### 5.1 Sidebar

**Purpose:** Global navigation. Holds every session, the entry point for new sessions and the signed-in account.

**Anatomy (top to bottom):**

1. **Header row** — logo tile (22 px navy square with branch glyph) + "Git Clerk" wordmark; *Collapse sidebar* icon button on the right.
2. **New session button** — full-width, 38 px, primary-tinted background, pencil-square icon in primary colour. Sits 14 px below the logo.
3. **Divider** — 1 px `--border-soft`, full width.
4. **Sessions header** — "Sessions" label (11.5 px, muted) + *Filter, sort and group* icon button. A 6 px primary dot appears on the button when any filter, sort or group differs from the default.
5. **Active-filter summary** (only when filters are active) — pill showing e.g. "Open, Draft · PR number" with a clear (×) button.
6. **Session list** — scrollable; optional group headers.
7. **Footer** — top border, then the **account row**.

**Session row**

| Part | Detail |
|---|---|
| Status icon | 16 px, PR status colour (`pr-draft`, `pr-open`, `merge`, `pr-closed`) |
| Title | 13 px, single line, ellipsis; weight increases when selected |
| Meta | `#176 · open-science-catalog-metadata` — 11.5 px muted, ellipsis |
| More button (⋯) | Appears on hover/focus and on the selected row |

| State | Visual |
|---|---|
| Default | Transparent |
| Hover | `--hover` |
| Selected | `--elev` background with soft shadow, `aria-current="page"` |
| Renaming | Inline text input with primary ring, status icon kept |

**Actions**

- Click row → open session (see [6.2](#62-open-an-existing-session)).
- ⋯ → **Session options menu**: *Rename session*, *Open on GitHub* (opens the PR in a new tab), separator, *Delete session* (confirmation dialog).
- Rename: Enter saves, Esc cancels, blur saves.

**Filter, sort and group popover**

| Section | Control | Options |
|---|---|---|
| Status | Multi-select toggle chips (`aria-pressed`) | Draft, Open, Merged, Closed |
| Sort by | Radio list with check mark | Recent activity, PR number, Title, Status |
| Group by | Radio segmented | None, Organization, Repository |

Groups render as collapsible headers (chevron, org/repo icon, label, count). Empty result → "No sessions match these filters."

**Accessibility:** `<nav aria-label="Sessions">`; rows are real `<button>`s with `aria-label` combining title, PR and status; the popover is `role="dialog"` and closes on Esc or outside click.

---

### 5.2 Collapsed sidebar rail

**Purpose:** Keeps navigation reachable while giving the canvas maximum width.

**Anatomy:** 52 px column — *Expand sidebar*, *New session* (icon only), flexible spacer, **account avatar** at the bottom.

**Actions:**

- Expand sidebar → restores the 240 px sidebar.
- Avatar → opens the account menu as a **popover to the right of the rail** without expanding the sidebar.

---

### 5.3 Account menu

**Account row (sidebar footer):** 26 px circular avatar (initial on primary), `@srijitcoder` (13 px, 500) above the email (11.5 px muted, ellipsis), chevron-down. 48 px tall; hover `--hover`.

**Menu (opens upward, or rightward from the rail):**

| Item | Behaviour |
|---|---|
| Header | "Signed in with GitHub" (rail version shows handle + email) |
| Theme | Light / Dark segmented control (radio group); switching keeps the menu open |
| Divider | — |
| View GitHub profile | Opens `github.com/<handle>` in a new tab |
| Sign out | Ends the session (prototype: closes the menu) |

Closes on outside click or Esc.

---

### 5.4 New session screen

**Purpose:** Start a new change request.

**Anatomy (centred column, max ~520 px):**

1. **Heading** — "What would you like to change?"
2. **Target picker row** — *Account/organization* button (org icon + name + chevron) · `/` · *Repository* button (repo icon + name + chevron).
3. **Composer** (see [5.7](#57-composer)) — placeholder "Describe a change to your repository…".
4. **Active sessions card** (when the chosen repo already has live sessions) — "2 active sessions in open-science-catalog-metadata" + *Start another session*; each row shows status icon, title, `#PR · Status`, and *Resume*.

**Account / organization dropdown:** personal account first (no heading), then an **Organizations** heading and each org. Each option shows "N repositories".

**Repository dropdown:** each repo shows "N active sessions" or "No active sessions".

**Validation:** sending without a repository shows "Choose a repository to start a session. Your message is kept."

---

### 5.5 Session top bar

**Purpose:** Identity and PR-level actions for the open session. It sits **outside the chat**, spanning the full content width above the Visualizer (floating mode) or above both chat and Visualizer (docked mode).

**Anatomy:**

| Left | Right |
|---|---|
| Line 1: **Title** (14 px, 600, ellipsis) · **Status chip** (e.g. Open) · **Checks chip** (e.g. Checks running) | *Submit for review* (Draft PRs with changes only) |
| Line 2: repo icon · `org/repo` · `PR #176` · branch name in mono | ⋮ *Session options* |

On mobile a hamburger (*Show sessions*) appears at the far left and a **Chat / Files** segmented control appears on the right.

**Submit for review** — primary button, `pr-open` icon. Disabled with tooltip "Save your changes before submitting" while any file has unsaved edits. Moves the draft PR into review.

---

### 5.6 Chat panel

**Purpose:** The conversation with Git Clerk.

**Container modes**

| Mode | Container | Header |
|---|---|---|
| Floating | Fixed card, `--elev`, 16 px radius, soft border, elevation 2. Default 480 × min(640, viewport − 94) px, bottom-right, 24 px inset. Never above y = 70 px (keeps the top bar clear). | Primary-coloured bar "Git Clerk AI Assistant"; drag the bar to move; right icon **Dock chat** (`collapse`). |
| Docked | Left column beside the Visualizer, flush, no radius | Same bar; right icon **Float chat** (`pip`). |
| Full chat | Full width, max 744 px content | No assistant bar (top bar only). |

**Floating window behaviour**

- **Move:** drag the header; the cursor shows grab/grabbing; the window stays on screen.
- **Resize:** all four edges and four corners (6 px edges, 20–22 px corner hit areas); small diagonal grip in the bottom-right corner. Min 320 × 360 px; max viewport − 16 px.
- Position and size persist while the Visualizer stays open; opening a session resets to floating.

**Message timeline**

Messages render as a vertical **timeline**, not bubbles:

| Part | Spec |
|---|---|
| Rail | 1 px `--border` line at x = 3 px connecting messages |
| Marker | 7 × 7 px rounded square; user = muted 70%, Git Clerk = `--primary` |
| Role label | `YOU` (muted) or `GIT CLERK` (primary), 11 px uppercase |
| Body | 14 / 22 px; user text keeps line breaks; `#path` mentions render as tinted chips |

**Assistant message extras**

- **Changed-files card** — bordered list; each row: file icon in status colour, `dir/` (muted mono, ellipsis) + `name` (mono), status (`Added` green, `Modified` amber, `Deleted` red). Clicking a row opens the file.
- **View changes** link — opens the Visualizer with the files drawer on *Changes*.
- **Status line** — spinner + text (e.g. "Creating draft pull request…") while the assistant works.

**Notes above the composer**

- "Resumed your active session in *repo*." + *Start another session* (after sending from the new-session screen into an existing live session).

**Read-only banner** (Merged/Closed) replaces the composer: tonal banner in the status colour with the status icon, "PR #42 is closed. Start a new session to make more changes." and a *New session* link button.

---

### 5.7 Composer

**Purpose:** Write requests to Git Clerk.

**Anatomy:**

```
┌───────────────────────────────────────────────────────────────┐
│ ⚡ Fill in the blue blanks before sending · Tab …           ×  │ ← automation strip (optional)
│ [📄 report.pdf ×] [📄 data.csv ×]                              │ ← attachment chips (optional)
│ Ask for another change…                                        │
│                                                                │
│ (+)  ⚡ Automation ▾   ✧ Auto ▾                     🎤   (↑)    │
└───────────────────────────────────────────────────────────────┘
```

| Element | Spec / behaviour |
|---|---|
| Container | `--elev`, 1 px `--border`, 20 px radius, elevation 1. Border turns faintly primary while an automation is active. |
| Text area | 14 / 22 px, auto-grows (min 34–60 px, max 220–260 px). A highlight overlay sits behind a transparent textarea so `#mentions` and blanks can be styled. |
| **+ Attach files** | Opens the system file picker (multiple). Each file becomes a chip (file icon, name with ellipsis, × remove). Chips clear on send. |
| **Automation** dropdown | `bolt` icon + label; tinted when active. See [5.8](#58-automations-and-fill-in-blanks). |
| **Model** dropdown | `model` icon + model name. |
| Labels collapse | Below ~470 px chat width, the two dropdowns show icon + chevron only (no truncated text). |
| **Mic** | Toggles dictation; placeholder changes to "Listening…"; button shows *Stop dictation*. |
| **Send** | 36 px circle. Primary when sendable, `--hover`/muted when disabled. |

**Send rules:** disabled when empty, while the assistant is busy, or while automation blanks remain. **Enter** sends, **Shift+Enter** inserts a newline.

**#file mentions**

- Typing `#` opens a **file picker popover** (above the composer in a session, below on the new-session screen) with a breadcrumb of the repo, folders (chevron to drill in) and files with change status.
- Keyboard: ↑ ↓ move · Enter pick · Esc close. Picked paths render as tinted chips.

**Model list**

| Group | Model | Description |
|---|---|---|
| Default | Auto | Chooses a model for each step |
| Google | Gemini 4 Argon | Most capable Gemini model |
| Google | Gemini 3.8 Flash | Fast, low cost |
| Google | Gemini 3.5 Flash-Lite | Lightest and cheapest |
| ESA Φ-lab | EVE-Instruct | Earth Virtual Expert, tuned for Earth observation |

---

### 5.8 Automations and fill-in blanks

**Purpose:** Turn common catalog tasks into guided prompts.

**Options** (no "None" entry — clicking the active automation again turns it off; the active item's description reads "… · click again to turn off"):

| Automation | Description | Template |
|---|---|---|
| Add product | Create a product entry and link it from the catalog | Add a product called **[product name]** under the **[parent project]** project, described as **[short description]**. |
| Add project | Create a project entry | Add a project called **[project name]**, led by **[lead institution]**, described as **[short description]**. |
| Update dates | Correct temporal extents | Change the dates of **[product or project]** to **[start date]** – **[end date]**. |

**Blank blocks**

- Written as `[ label ]` in the text; rendered as rounded `--blank` blocks with the label in primary. The brackets are invisible but still occupy space, so the block has width.
- On selecting an automation, the **first blank is selected** so typing replaces it.
- **Tab** or **Enter** jumps to the next blank (wraps around).
- Send stays disabled until every blank is filled.

**Template insertion rules**

| Composer state | Result |
|---|---|
| Empty, or still an untouched template | Replaced by the new template |
| User has typed their own text | Template appended on a new line |
| Automation turned off and text is an untouched template | Text cleared |

**Automation strip** — slim tonal bar attached to the top of the composer (11.5 px text, 12 px bolt icon, 4 px vertical padding):

- With blanks: "Fill in the blue blanks before sending · Tab jumps to the next one"
- All filled: "All filled in · press Enter to send"
- **×** hides the strip only (the automation stays on). The strip returns when the automation changes.

---

### 5.9 Dropdown menus

Shared listbox menu used by Account, Repository, Automation and Model pickers.

| Spec | Value |
|---|---|
| Container | `--elev`, `--border-soft`, 12 px radius, elevation 3, min 250 px, max 360 px, max height 460 px |
| Title | Small muted heading (hidden for the Account picker) |
| Section headers | 11 px, 600, muted (e.g. "Organizations", "Google") |
| Option | Label + sub-description; selected option has `--tint` background and a check |
| Placement | Opens below the trigger, or above when the trigger is low on screen |
| Keyboard | ↑/↓ on the trigger opens it; arrows move; Enter selects; Esc closes and returns focus |

---

### 5.10 Visualizer

**Purpose:** Shows the files a session touches, preview-first.

**Anatomy:**

1. **Tab bar** (`--ws-nav`, 40 px)
   - **Files panel button** (left, 44 px) — `file-diff` icon; a **green dot** marks unsaved/changed files in the PR; tooltip "Show files panel (1 change)".
   - **File tabs** — icon + name (+ " · diff" for diff tabs) + ×. A yellow `--dirty` dot at the very start marks unsaved edits.
   - **Close Visualizer** (×) at the far right.
2. **File toolbar** (44 px) — path (`dir/` muted + **name**, mono), view toggles, save state, GitHub link.
3. **Content** — one of: empty state, file view, diff view; optional files drawer on the left.

**Chrome-style tab shrinking**

- Tabs share the bar (basis 200 px) and **shrink** instead of scrolling; names truncate with ellipsis.
- Below ~92 px a tab hides its ×; it can shrink to icon only (min 40 px).
- The **active tab** never shrinks below 104 px, so its name and × stay visible.

**File toolbar controls**

| Control | Shown when | Behaviour |
|---|---|---|
| **Editor** toggle | File has a preview (catalog JSON or Markdown) | Opens the structured editor beside the preview; click again to close |
| **Source** toggle | File has a preview | Opens the code beside the preview; click again to close |
| (Editor and Source are mutually exclusive; both off by default.) | | |
| Unsaved changes / Saved to PR #N | After edits / after save | Text status; saved shows green check |
| **Save changes** | Not read-only | Primary when dirty, quiet when clean; Ctrl/⌘ + S |
| Read-only · *Status* | Merged/Closed | Replaces save controls |
| **View on GitHub** | Always | Icon-only button; opens `github.com/<org>/<repo>/blob/<branch>/<path>` |
| +N / −N, *Open in editor* | Diff tab | Line counts and a button that opens the file |

**Split view**

- Side panel (Editor or Source) on the left, preview on the right; default side width 40% (preview stays the main view).
- Draggable divider (also ← / → keys), 25–75% range.
- In narrow Visualizers (< 620 px), the open side panel takes the full width temporarily.

**Empty state** (all tabs closed) — the Visualizer **stays open**, the files drawer opens automatically on **Changes** (or **Files** if nothing changed), and the centre shows a file icon tile, "Open a file to view it", and a hint ("Pick a changed file from the Changes list.").

**Loading state** (first reply of a new session) — the whole Visualizer is covered by a **shimmer skeleton** (tab bar, toolbar and a preview card) until Git Clerk answers; then a relevant file opens in preview.

---

### 5.11 Files drawer

**Purpose:** Full file browsing for advanced users. **Closed by default.**

**Anatomy (256 px, `--ws-nav`):**

- **Files | Changes N** segmented control (`--ws-seg` track; count badge on Changes).
- **Files view:** toolbar with *New file* (repos that allow it), tree with folder chevrons, file icons, status letters/colours for changed files, active file highlighted. "No files or folders match." when filtering.
- **Changes view:** "Files changed in PR #176", rows with status icon, name, folder path, status label and `+N −N`. Click opens a diff tab. Empty: "No files have changed yet."
- **New file:** inline path input, "Enter a full path with a file name, like products/my-product/collection.json." · "Enter to create · Esc to cancel".

In narrow Visualizers the drawer overlays the content.

---

### 5.12 File views: Preview, Editor, Source, Diff

**File types**

| Type | Detection | Preview | Editor | Source |
|---|---|---|---|---|
| Catalog collection | `products/`, `projects/` or `variables/<id>/collection.json` | Catalog card | JSON form | ✓ |
| Markdown | `.md` | Rendered story/guide | Markdown form | ✓ |
| Other | — | — | — | ✓ (default view) |

**Catalog preview card** — centred card (max 560 px) on the light canvas: kicker "Project · Open Science Catalog", title (22 px), description, divider, definition list (ID in mono, License, Time period e.g. "28 Mar 2017 – 30 Jun 2024", Keywords as chips), footer "Listed in the projects catalog". Header line notes "· includes unsaved edits" when the preview reflects drafts.

**Markdown preview** — hero with kicker ("Story · EO Dashboard" or "Guide"), title, subtitle, author; body supports paragraphs, lists, quotes, headings, **bold** and *italic*.

**JSON form editor (catalog)** — "Project collection schema · fields marked * are required"

| Field | Validation |
|---|---|
| Title * | Required |
| ID * | Required; lowercase letters, numbers, hyphens; must match the folder name |
| Description * | Required (textarea) |

Errors show red borders and messages under fields; invalid JSON shows an alert: "This file isn't valid JSON. Fix it in Source to use the form."

**Markdown editor** — one labelled input per front-matter key (Title, Subtitle, Author…) plus a large **Content** textarea, with a hint about supported Markdown. Edits write back into the file and update the preview live.

**Source view** — line numbers (sticky gutter), syntax colouring for JSON and Markdown, 12.5 / 20 px IBM Plex Mono, editable unless read-only.

**Diff view** — unified diff with hunk headers (`--hunk-bg`), added/removed line tints, +/− counts in the toolbar. "No saved changes in this file." when identical.

---

### 5.13 Dialogs

| Dialog | Trigger | Content | Actions |
|---|---|---|---|
| **Delete session** | Session options → Delete | "Delete this session?" + explanation | *Cancel* (focused) · *Delete session* (destructive) |
| **Unsaved changes** | Closing a tab with drafts | "Save changes to *file*?" / "Your edits haven't been saved to PR #N. If you discard them, they're gone." | *Cancel* · *Discard* · *Save* (focused, primary) |

Both are `role="alertdialog"`, `aria-modal`, on a scrim; Esc cancels.

---

### 5.14 Status, feedback and loading

| Signal | Where | Treatment |
|---|---|---|
| PR status | Sidebar rows, top-bar chip, read-only banner | Icon + colour (Draft grey, Open green, Merged purple, Closed red) |
| Checks | Top-bar chip | Running (amber clock), Passed (green check-circle), Changes requested (red alert) |
| Changed files | Chat file cards, drawer, files-panel button dot | Added / Modified / Deleted colours |
| Unsaved edits | Tab dot (amber), toolbar text, save button state | Amber dot + "Unsaved changes" |
| Saved | Toolbar | Green check + "Saved to PR #N" |
| Assistant working | Chat | Spinner + status text; Send disabled |
| First load | Visualizer | Full shimmer skeleton |

---

## 6. Key user flows

### 6.1 Start a new session

1. Sidebar → **New session**.
2. Pick account/organization and repository.
3. Optionally pick an **automation** → template with blanks appears → fill blanks (Tab between them).
4. Optionally attach files, mention files with `#`, choose a model.
5. **Send** → a Draft session appears at the top of the sidebar; the status line "Creating draft pull request…" shows.
6. The **Visualizer opens immediately** with the shimmer; the chat becomes **floating**.
7. Git Clerk replies → shimmer ends and a relevant file opens in **preview** (products/ or projects/ file for those automations, otherwise the README).

### 6.2 Open an existing session

| Session status | Result |
|---|---|
| Draft / Open | Visualizer opens; chat floats; if no tab is open, the first changed file (or a relevant file) opens in preview. Drawer stays closed. |
| Merged / Closed | Full-width chat, read-only banner, no Visualizer. |

### 6.3 Review and edit a file

1. Preview shows the rendered result.
2. Open **Editor** for structured fields or **Source** for raw text, beside the preview.
3. Edits mark the tab dirty and show "Unsaved changes".
4. **Save changes** (Ctrl/⌘ + S) commits to the PR → "Saved to PR #N".

### 6.4 Submit for review

Draft PR with changes and no unsaved edits → **Submit for review** in the top bar moves it into review.

### 6.5 Rearrange the workspace

- **Dock chat:** icon in the chat header (floating) → chat moves into a left column.
- **Float chat:** icon in the chat header (docked) → chat becomes a movable window.
- **Move / resize** the floating chat by its header, edges and corners.
- **Close Visualizer:** × at the far right of the tab bar.

### 6.6 Close all tabs

The Visualizer stays open, the drawer opens on Changes (or Files), and the empty state invites the user to open a file.

---

## 7. Interaction and design patterns

| Pattern | Where | Notes |
|---|---|---|
| **Preview-first progressive disclosure** | File views | Show the outcome; reveal Editor/Source only on request. |
| **Tonal status colour** | Chips, banners, badges | Colour carries meaning but always paired with an icon and text. |
| **Segmented controls** | Theme, Files/Changes, Chat/Files, Light/Dark | Hover-track with an elevated selected segment. |
| **Toggle buttons** | Editor/Source, status filters | `aria-pressed`; second click turns off. |
| **Click-again-to-deselect** | Automation menu | Removes the need for a "None" option. |
| **Inline templates with blanks** | Composer | Structured input without leaving chat. |
| **Highlight overlay on textarea** | Composer | Keeps a native, accessible textarea while styling mentions and blanks. |
| **Floating/docked panel** | Chat | Picture-in-picture model; drag to move, edges to resize. |
| **Shrinking tabs** | Visualizer | Chrome-like; no horizontal scroll. |
| **Skeleton loading** | Visualizer | Shape-matched shimmer; respects reduced motion. |
| **Hover-reveal actions** | Session rows (⋯), tab × | Always visible on the selected/active item. |
| **Confirm destructive actions** | Delete, discard | Alert dialogs with safe default focus. |
| **Dismissible hints** | Automation strip × | Hiding a hint never changes underlying state. |
| **Status dots** | Files-panel button (green), tabs (amber), filter button (primary) | Small 6–7 px dots with a 2 px ring in the surface colour. |
| **Popover anchoring** | Account menu | Opens upward from the sidebar footer, sideways from the rail. |

### Keyboard reference

| Context | Keys |
|---|---|
| Composer | Enter send · Shift+Enter newline · Tab / Enter next blank · `#` file picker |
| File picker | ↑ ↓ · Enter · Esc |
| Menus | ↑ ↓ open/move · Enter select · Esc close |
| Tabs | ← → move between tabs |
| Split divider | ← → resize |
| Editor | Ctrl/⌘ + S save |
| Rename | Enter save · Esc cancel |
| Dialogs, popovers | Esc close |

---

## 8. Responsive behaviour

| Breakpoint | Behaviour |
|---|---|
| ≥ 860 px | Sidebar (or rail) + content; floating or docked chat. |
| < 860 px ("narrow") | Sidebar becomes an overlay drawer with scrim (hamburger in the top bar). Chat and Visualizer are separate views switched by **Chat / Files** in the top bar. No floating chat. |
| Visualizer < 620 px | Split view collapses: the open Editor/Source takes the full width; drawer overlays content. |
| Chat < ~470 px | Composer dropdowns become icon-only. |
| Chat < 560 px (content area) | Top-bar buttons drop their text labels and keep icons/counts. |

---

## 9. Accessibility

- **Semantic controls only:** real `<button>`, `<a href>`, `<input>`, `<label>`; no click handlers on divs for primary interactions.
- **Icon-only buttons** carry `aria-label` and `title` (e.g. "Dock chat beside the visualizer", "View on GitHub", "Attach files").
- **Roles:** `nav` (sidebar), `tablist/tab` (file tabs, mobile view switch, drawer views), `radiogroup/radio` (theme, sort, group), `listbox/option` (pickers), `menu/menuitem` (session options, account), `dialog` / `alertdialog` (popovers, confirmations), `status` (spinner, automation strip, saved state, loading).
- **Focus:** global `:focus-visible` 2 px primary outline with 2 px offset; menus return focus to their trigger; dialogs focus the safe action.
- **Contrast:** body text and labels meet 4.5:1 on their surfaces in both themes; status is never colour-only (icon + text).
- **Motion:** shimmer disabled under `prefers-reduced-motion`.
- **Known gap:** floating chat move/resize is pointer-only; docking provides a keyboard-accessible alternative.

---

## 10. Content and voice

- **Plain, direct, task-focused.** "What would you like to change?", "Open a file to view it".
- **Sentence case** for all labels and buttons ("Save changes", "Submit for review").
- **Say what happens next.** "PR #42 is closed. Start a new session to make more changes."
- **Name objects consistently:** *session*, *PR*, *branch*, *Visualizer*, *files panel*, *Changes*.
- **Errors explain the fix.** "Use lowercase letters, numbers and hyphens." / "Fix it in Source to use the form."
- **Assistant voice:** first person, short, confirms what changed ("I changed the project's start date to 28 March 2017 and left the end date as it was.").

---

## 11. State model

### Session object

| Field | Meaning |
|---|---|
| `id`, `pr`, `org`, `repo`, `branch`, `title` | Identity |
| `status` | Draft / Open / Merged / Closed |
| `checks` | pending / passed / changes |
| `messages[]` | `{ role: user | assistant | status, text, files? }` |
| `composer`, `attachments[]`, `automation`, `model` | Composer state |
| `files{}`, `drafts{}` | Repo snapshot and unsaved edits per path |
| `tabs[]`, `active` | Open file/diff tabs |
| `modes{}` | Per file: `none` (preview only), `form` (Editor beside), `source` (Source beside) |
| `wsOpen`, `drawer`, `drawerView` | Visualizer open, drawer open, Files/Changes |
| `previewFrac` | Side-panel width in split view (default 0.4) |
| `loading` | Visualizer shimmer active |
| `busy` | Assistant working |

### App-level UI state

`activeId`, `theme`, `sbCollapsed`, `sbOverlay`, `sbFilter/sbSort/sbGroup`, `chatDocked`, `chatPos`, `chatSize`, `acctOpen`, `hintClosed`, `menu`, `rowMenu`, `renaming`, `mention`, `mobileView`, `wsWidth`.

---

## 12. Prototype settings

Exposed in the canvas **Tweaks** panel:

| Prop | Values | Default |
|---|---|---|
| `initialTheme` | light / dark | light |
| `sidebarStart` | expanded / collapsed | expanded |
| `simSpeed` | 0.5× – 3× | 1× (speed of simulated assistant replies) |

Sample data: six seeded sessions across `ESA-EarthCODE` and `eo-community` covering all four PR states.

---

## 13. Known gaps and open questions

| Area | Note |
|---|---|
| Attachments | Prototype stores file names only; upload and use by the assistant are not designed yet. |
| Sign out | Prototype only closes the menu. |
| Avatar | Initial-based; GitHub avatars are blocked in the prototype environment. |
| Email | Placeholder `srijitcoder@users.noreply.github.com`. |
| Reopening the Visualizer | With the top-bar button removed, the Visualizer reopens via *View changes* in the chat; consider a dedicated control. |
| New-file links | *View on GitHub* 404s for files not yet pushed. |
| Floating chat a11y | Add keyboard move/resize or rely on docking. |
| Floating chat overlap | The floating chat can cover the Visualizer's empty-state message; consider auto-offset. |
| Dictation | The mic button simulates listening; real speech-to-text is not designed yet. |
