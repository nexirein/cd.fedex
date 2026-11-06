# Clearance Desk — Home Screen: Leadership Demo Script

**Deck scope:** `ScrHome` only (Phase 1 · Cargo). One screen, presented well.
**Audience:** FedEx leadership / GCC team.
**Length:** ~7–9 minutes live.
**Asset:** Power Apps canvas app **FedEx Clearance Desk** → screen **Home**.

> How to use this doc: each numbered section is one **slide**. Each gives
> **On screen** (what they see), **Say this** (the words), **Do this** (the click),
> **Leader takeaway** (the one line they remember).

---

## The FedEx palette we present in

| Token | Value | Used for |
|---|---|---|
| FedEx Purple | `#4D148C` | App accent, numbers, sidebar base `#3A0F6A` |
| FedEx Orange | `#FF6600` | Brand mark, active nav item, primary action |
| Page Grey | `#F5F6F8` | App background |
| Ink | `#1A1A1A` | Headings, labels |
| Muted | `#787884` | Helper text |
| Alert tint | `#FFF4EB` | "Need attention" tile |

---

## Slide 1 — Title

**On screen:** A real app shell. Dark-purple **sidebar** on the left with the orange **FX** mark and the app name **"Clearance Desk"** at the top. White **top bar** across the app with the page title **"Home"**, a `PHASE 1 · CARGO` badge, a `TEST MODE` badge and a live timestamp.

**Say this:**
> "This is the Clearance Desk. It's a working console, not a slide. Down the left is everything the desk does; across the top is where you are. Right now we're on Home — the front door."

**Leader takeaway:** *One console for the whole desk.*

---

## Slide 2 — The problem we're replacing

**On screen:** (Talk over Home.)

**Say this:**
> "Today the desk runs on inboxes, spreadsheets and WhatsApp. Nobody can answer 'how many shipments are waiting on us right now?' without asking three people. Home answers that in one look."

**Leader takeaway:** *From chasing status to seeing status.*

---

## Slide 3 — The shell: a real sidebar

**On screen:** The left sidebar — **Home · Upload batch · Batch board · Column mapping · All cases · Needs attention · Case detail · IGM panel · AI vs human · Customer link · CHA call queue · Batch metrics**. Active item is filled orange; footer shows the signed-in user.

**Say this:**
> "Every part of the desk is one click away, always in the same place. Twelve areas, same shell on every screen — so once the team learns it, they know the whole app. Nothing is buried in a menu."

**Do this:** Click **All cases** in the sidebar, then **Home** to come back.

**Leader takeaway:** *Learn one screen, you know them all.*

---

## Slide 4 — Safety first: the kill switches

**On screen:** White bar: **"Automation switches — kill switches, safe off by default"** with four toggles: **AI · Send · Follow-up · Call AI**.

**Say this:**
> "Before anything automates, the desk decides. Turn **AI** off and the system still routes work but never makes the call. Turn **Send** off and nothing leaves the building. Every switch is off until a person flips it — and each flip is written back to the settings list, so it's auditable."

**Do this:** Toggle **Send** on, then off.

**Leader takeaway:** *Humans hold the on/off, not the automation.*

---

## Slide 5 — The five numbers that matter

**On screen:** "Today at a glance" — **Rows in · Pre-alerts sent · Docs received · Need attention · Claimed**. Big numbers, one-line captions; "Need attention" is orange-tinted.

**Say this:**
> "Five numbers, the whole day. **Rows in** — what we received. **Pre-alerts sent** — what we pushed out. **Docs received** — what came back. **Need attention** — cases waiting on a person. **Claimed** — closed by the CHA. The orange tile is the one you watch: it's the work that stops if nobody acts."

**Do this:** Click the **Need attention** tile.

**Leader takeaway:** *The whole workload in five numbers.*

---

## Slide 6 — Batch actions

**On screen:** "Batch actions" — **Upload UBOND batch** (solid orange) and **Upload CONSOL batch** (purple outline).

**Say this:**
> "The two ways work enters the desk: UBOND and CONSOL. Today someone re-keys a spreadsheet. Here it's one button — upload the file and the desk gets structured rows."

**Do this:** Click **Upload UBOND batch**.

**Leader takeaway:** *Re-keying spreadsheets becomes one button.*

---

## Slide 7 — Navigation & drill-down

**On screen:** Back on Home. Point at the sidebar and the clickable tiles.

**Say this:**
> "Every number is a door, and every door is also in the sidebar. 'Needs attention' always carries its count, so you know how deep the queue is before you open it. 'AI vs human' is the trust screen — where the machine decided and where a person overruled it."

**Leader takeaway:** *Nothing is a dead-end number.*

---

## Slide 8 — System status

**On screen:** "System status" badges: **Test mode ON/OFF · SharePoint connected · 18 lists loaded**.

**Say this:**
> "The screen even tells you it's healthy — whether we're in test mode, whether the data layer is connected, and how many lists it's reading. No guessing about whether the data is real."

**Leader takeaway:** *It shows its own health.*

---

## Slide 9 — Under the hood (say it, don't show it)

**Say this:**
> "Home reads from SharePoint lists — settings, batches, cases, shipments — the same data model across the app. The numbers are live counts, so this screen is always current. It's built so Mumbai or Chennai could run the same console on their own data."

**Leader takeaway:** *Reusable across gateways, not a one-off.*

---

## Slide 10 — Live demo click-path (run in this order)

1. Land on **Home** — let them read the sidebar name and badges.
2. Sweep the **sidebar** top to bottom, naming the areas.
3. **Automation switches** → toggle **Send** on, then off.
4. Sweep the **five tiles**; dwell on **Need attention**.
5. Click **Need attention** tile → queue → sidebar **Home**.
6. Click **Upload UBOND batch** → upload screen → sidebar **Home**.
7. Click sidebar **AI vs human** → trust screen → sidebar **Home**.
8. Finish: "Everything you saw is one click from Home, in the same shell."

**Timing:** ~7 minutes. If short: steps 1, 2, 4, 5, 6.

---

## Slide 11 — Proof & guardrails

**Say this:**
> "Three things to leave with. **Controlled** — kill switches, test mode, a data layer we can wipe and reseed. **Measurable** — every tile is a live count. **Auditable** — the 'AI vs human' view exists so you can audit the machine, not just trust it."

**Leader takeaway:** *Controlled, measurable, auditable.*

---

## Slide 12 — The ask / what's next

**Say this:**
> "Home is screen one of twelve, and it's the shell every other screen plugs into. Next we light up upload → column-mapping → batch-board, then case detail and the IGM panel. What I need is a decision on which gateway we pilot with, and one week of their real files."

**Leader takeaway:** *Approve the pilot gateway; give us one week of real data.*

---

## Appendix A — Likely questions

| Question | Answer |
|---|---|
| "Is this live or a mock-up?" | Live. Counts come from SharePoint; the timestamp shows the refresh. |
| "What if the AI is wrong?" | Kill switches + the **AI vs human** screen; AI never sends unless **Send** is on. |
| "Can we see it for Mumbai?" | Yes — same console, different data. That's the Phase 2 ask. |
| "Who can change the numbers?" | Only through the app's actions; Home itself is read-only counts. |
| "Is it auditable?" | Every switch and case action writes back to lists with a timestamp. |

## Appendix B — Presenter checklist

- [ ] App open, coauthoring on, screen = **Home**.
- [ ] Widescreen (tablet/desktop) so the sidebar + five tiles sit cleanly.
- [ ] Zoom to 100%; sidebar name and top bar fully visible.
- [ ] Know the two numbers you'll quote out loud (**Need attention**, **Claimed**).
- [ ] Have the Studio URL ready as a fallback if the live app misbehaves.

---

*End of Home deck. Next decks: `02-Upload`, `03-BatchBoard`, `04-CaseDetail`, `05-AIvsHuman`.*
