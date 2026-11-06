# 47 — FedEx Design System (Clearance Desk Web App)

**Purpose:** Visual/UX design file for a proper, impressive Clearance Desk web app (agent/admin + customer portal). FedEx-aligned, clean, accessible, and operational.

---

## 1. Brand direction
- **Tone:** professional, trustworthy, operational, high-clarity. Not marketing-heavy.
- **Primary identity:** FedEx Purple + FedEx Orange accent, neutral surfaces, strong typography.
- **Inspiration cues (from provided FedEx style):** bold purple hero accents, orange action highlights, generous whitespace, clear hierarchy, rounded-but-structured cards.

> Use FedEx-aligned colors and patterns; follow internal brand/legal guidelines for official logo assets in production. For the app build, use the token system below and placeholders only where official assets are not provided.

---

## 2. Design tokens

### 2.1 Color
```css
:root {
  /* Brand */
  --fx-purple-900: #2F0A57;
  --fx-purple-800: #3B0F6B;
  --fx-purple-700: #4D148C; /* primary */
  --fx-purple-600: #5F1DB3;
  --fx-purple-100: #F3ECFB;
  --fx-orange-600: #E55B00;
  --fx-orange-500: #FF6600; /* accent */
  --fx-orange-100: #FFF1E8;

  /* Neutrals */
  --fx-bg: #F4F5F7;
  --fx-surface: #FFFFFF;
  --fx-surface-2: #FCFCFD;
  --fx-border: #E4E7EC;
  --fx-border-strong: #D0D5DD;
  --fx-text: #101828;
  --fx-text-muted: #475467;
  --fx-text-subtle: #667085;
  --fx-text-inverse: #FFFFFF;

  /* Status */
  --fx-success: #067647;  --fx-success-bg: #ECFDF3; --fx-success-border: #ABEFC6;
  --fx-warning: #B54708;  --fx-warning-bg: #FFFAEB; --fx-warning-border: #FEDF89;
  --fx-danger:  #B42318;  --fx-danger-bg:  #FEF3F2; --fx-danger-border:  #FECDCA;
  --fx-info:    #175CD3;  --fx-info-bg:    #EFF8FF; --fx-info-border:    #B2DDFF;
  --fx-neutral: #344054;  --fx-neutral-bg: #F2F4F7; --fx-neutral-border: #EAECF0;

  /* Focus / overlay */
  --fx-focus: rgba(77, 20, 140, 0.24);
  --fx-overlay: rgba(16, 24, 40, 0.45);
}
```

### 2.2 Typography
- **Font:** `Inter` (UI), fallback `system-ui, -apple-system, Segoe UI, sans-serif`.
- **Scale:**
  - Page title: 24/32, 600
  - Section title: 18/28, 600
  - Card title: 16/24, 600
  - Body: 14/20, 400–500
  - Small/meta: 12/18, 500
  - Table header: 11/16, 600, uppercase/letter-spacing subtle
- **Numbers/IDs:** tabular/mono hint for AWB, tokens, timestamps where useful (`ui-monospace` for codes).

### 2.3 Spacing, radius, shadow
- Spacing base: 4px grid (`4,8,12,16,20,24,32,40`).
- Radius: `8px` inputs/buttons-sm, `10px` buttons, `12px` cards, `14–16px` modals/hero cards, `999px` pills/badges.
- Shadows: subtle (`0 1px 2px rgba(16,24,40,.06)`), elevated (`0 12px 32px -16px rgba(16,24,40,.22)`).
- Borders: 1px `--fx-border`; hover/active can use `--fx-border-strong` or purple tint.

### 2.4 Motion & accessibility
- Transitions: 150–200ms ease for hover/focus/drawer.
- Focus visible: 2px outline/ring using `--fx-focus` on all interactive elements.
- Contrast: meet WCAG AA for text/status badges; never rely on color alone (icon/label + badge text).
- Hit targets: min 36–40px for primary actions in dense tables.

---

## 3. Layout & navigation

### 3.1 App shell (Agent/Admin)
```text
┌──────────────┬──────────────────────────────────────────────────┐
│ Sidebar      │ Topbar: title · breadcrumbs · search · actions   │
│ (fixed)      ├──────────────────────────────────────────────────┤
│ Brand        │                                                  │
│ Nav items    │  Content (max width fluid, padded 24/32)         │
│ TEST MODE    │  Cards / tables / drawers                        │
│ User/role    │                                                  │
└──────────────┴──────────────────────────────────────────────────┘
```
- **Sidebar (260px desktop, collapsible optional v1.1):** FedEx purple background, white/light nav text, active item = white pill or left indicator + stronger contrast; orange dot/mark in brand; TEST MODE badge; user block at bottom.
- **Topbar (sticky):** white surface, border-bottom, page title + context, global search (AWB/company/email), primary CTA (e.g., “Import Batch”, “Create User”).
- **Mobile:** sidebar becomes drawer/hamburger; tables become horizontally scrollable/cards where needed.

### 3.2 Public shell (Customer Portal)
- Minimal header with FedEx/Clearance Desk mark + “Secure document upload”.
- Centered content (max ~960px), card-based, mobile-first.
- No sidebar; clear token-invalid state.

---

## 4. Core components

| Component | Spec |
|---|---|
| **Button** | Primary = purple fill; Accent/CTA = orange fill (use sparingly, e.g., Send Pre-Alerts); Secondary = white + border; Ghost = text/subtle. Sizes sm/md; loading/disabled states. |
| **Status badge/pill** | Rounded pill, 12px 600, status bg/border/text tokens. Always text-labeled. |
| **Card** | White, 1px border, radius 12, shadow-sm; header/body/footer slots. |
| **KPI stat card** | Label, large value, meta/subtext; optional status color accent (not loud). |
| **Table** | Sticky header, row hover, clickable rows, right-aligned actions, empty state. Dense but readable (12–14px padding). |
| **Filters/chips** | Segmented chips for Link Status/preflight; active = purple. |
| **Drawer** | Right-side (shipment trace quick view), overlay, Esc/close, scroll body. |
| **Timeline** | Vertical events with dot, type, actor, timestamp, detail. |
| **Toast/alert** | Success/error/info; non-blocking; clear copy. |
| **Form fields** | Label, input/select, helper/error text; visible focus ring. |
| **Upload/dropzone** | Dashed purple-tinted border, clear accepted types/size, progress/result. |

### Status mapping (visual)
| Domain status | Badge style |
|---|---|
| `PASS` / `SENT` / `DOCS_RECEIVED` / `Received` | Success |
| `SENT_NOT_OPENED` / `LINK_OPENED_AWAITING_DOCS` / `SKIPPED` / Required | Info/Warning (use consistently: opened-awaiting = warning/amber, sent-not-opened = info/blue) |
| `BLOCKED` / `REJECTED` / `FAILED` / Missing | Danger |
| `NOT_SENT` / Neutral | Neutral gray |

**Link Status labels (canonical):** Not Sent · Sent · Not Opened · Link Opened · Awaiting Docs · Docs Received.

---

## 5. Screen designs (UI/UX spec)

### 5.1 Login
- Centered card on subtle purple-tinted/neutral background.
- Brand mark + “FedEx Clearance Desk”.
- Email, password, sign in (purple primary). Error inline.
- Minimal; no public signup.

### 5.2 Dashboard
- KPI row: Batches, Shipments, Pre-alerts Sent, Sent-Not Opened, Docs Received.
- Two-column: Recent Batches table + “Needs Attention” (awaiting docs / not opened).
- Optional simple funnel strip: Sent → Opened → Docs Received (counts).

### 5.3 Import Batch
- Card: drag/drop `.xlsx` (UBOND/CONSOL), file pill, “Validate & Create Batch” (accent/primary).
- Rules panel: Standard Remarks email, AWB 11–12, HOLD/CALLING/bare FEBRK, broker rule.
- Results (post-import): summary chips (Accepted/Blocked/Skipped/Rejected) + table with row-level reasons and source (`Standard Remarks`).

### 5.4 Batches list
- Table: batch code, type, file, rows, PASS/blocked/skipped, sent, docs received, created, owner. Row → Batch Board.

### 5.5 Batch Board
- TEST MODE/allow-list banner (warn/info).
- KPI cards + filters: Link Status chips, preflight, search.
- Table: AWB, company, recipient, end result, broker, preflight, send state, link status, actions.
- Bulk/primary action: **Send Pre-Alerts** (orange accent) with confirmation/summary toast (sent/blocked/skipped).
- Row click opens **Shipment Trace drawer**.

### 5.6 Shipment Trace (drawer or page)
- Header: AWB + status badges.
- Pre-flight reason callout (success/warn/danger).
- Sections: Shipment details (2-col KV), Customer link (copy/open), Documents, Messages, Event timeline.
- Admin/agent can see full audit.

### 5.7 Admin Link Open Dashboard (key screen)
- **Purpose:** instantly answer “who opened, who didn’t, who uploaded”.
- Top filters: batch, date range, status (Not Sent/Sent-Not Opened/Link Opened-Awaiting Docs/Docs Received), broker, search.
- KPI strip: total sent, opened, not opened, awaiting docs, docs received, open rate.
- **Main table (high signal):**
  - AWB, Company, Recipient (email), Batch, Pre-alert Sent At, **Opened? / Opened At**, **Doc Count / Last Doc At**, Link Status badge, action “View Trace”.
- Visual cues: not-opened rows subtle neutral; docs received success; stale sent-not-opened (optional age indicator v1.1).
- Empty state: “No pre-alerts sent yet”.

### 5.8 Users (Admin)
- Table: name, email, role, active, created.
- “Create User”: email, name, role, temporary password (generated or admin-set) + copy/share helper text. Simple, secure-enough for v1 (admin shares out-of-band).

### 5.9 Customer Portal (`/c/:token`)
- Public, calm, trust-focused.
- Shipment package card (AWB, consignee/company, location, clearance, broker, freight).
- Required documents checklist with status pills.
- Upload dropzone + file list; success confirmation.
- Invalid token: friendly error, no sensitive details.

---

## 6. Content & microcopy
- Be explicit: “Email source: Standard Remarks”, “TEST MODE: allow-listed recipients only”.
- Reasons are human-readable (not codes alone).
- Actions confirm outcomes: “3 sent, 2 blocked by allow-list, 1 already sent”.

---

## 7. Implementation notes (frontend)
- Centralize tokens in `styles/tokens.css`; map to Tailwind/theme if used.
- Build a small `ui/` kit first (Button, Badge, Card, Table, Drawer, Input, Toast) to ensure consistency.
- Use canonical status helpers (`lib/rules.ts`) so badges/labels never diverge.
- Icons: simple consistent set (Lucide or similar) — navigation, status, upload, copy, external link.

---

*This design file is the source of truth for UI/UX during implementation. Pair with `46_ARCHITECTURE_SUPABASE_CLEARANCE_DESK.md`.*
