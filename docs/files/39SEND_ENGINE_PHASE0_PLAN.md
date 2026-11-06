# 39 · Pre-Alert Sending Engine — Phase 0 Plan (incremental build)

**Status:** Phase 0 in progress — Slice 1 built and compiling green; engine still blocked on
the mail connector and the normalised columns.

**Rule from management:** launch in parts — *execute, measure, improve*. Test on our own
laptops first, configure on teammates' systems later. This plan follows that shape: every
slice ends with something measurable, not just something built.

---

## 1. Where we actually are (verified 22 Oct 2026)

| Check | Result |
|---|---|
| Canvas app connection | ✅ connected, env `Default-b945c813-…`, app `7bd4b8e4-…` |
| Screens | ✅ 12 screens, `ScrHome` shell built (818 lines) |
| Local YAML vs live | ✅ identical (server drops default-valued properties and re-orders keys) |
| SharePoint data sources | ✅ 18 lists, all writable + delegatable |
| **Batch Board (Slice 1)** | ✅ `ScrBatchBoard` builds the intake gate over all seeded rows |
| **Compile** | ✅ **0 errors**, 14 files validated |
| **Accessibility checker** | ✅ **0 errors** |
| **API connectors** | ❌ **0 — no mail connector attached** |
| **Row data** | ⚠️ app seeds its own demo dataset; production rows still need the script |

### What Slice 1 actually does today

`ScrBatchBoard` is a working, measurable **pre-flight + dry-run** surface:

* picks the most recent batch (or any batch from the picker gallery),
* parses every shipment in that batch out of `CD_Shipment.RawJSON`,
* runs the **intake gate** row by row and classifies each as `PASS` or `BLOCKED`,
* shows the reason and the fix for every blocked row,
* renders the real subject and body from `CD_Template` with the placeholders substituted,
  including the case tag, and
* lets you pick a row and see the **allow-list decision** for it — "will receive" vs
  "will be SKIPPED" — before anything is sent.

Sending itself is still a dry run: the button reports how many ready rows are allow-listed
and says plainly that the connector is not attached, so nothing left the app.

## 2. The two blockers (neither is code)

### 2.1 No mail connector
`Office365Outlook` is not attached to the app, so `SendEmailV2` does not exist and no
email can leave the app. Connectors can only be added through the Studio UI.

### 2.2 The lists do not carry what the engine must read
The provisioned `CD_*` lists were cut from an earlier draft of doc 38 §4. Gap against spec:

| List | Have | Spec | Engine-critical missing fields |
|---|---|---|---|
| `CD_Shipment` | 23 | 45 | **ContactEmail, ClearanceType, Broker, Pipeline, Batch, Status, SendState, TemplateName, LinkToken, ClaimedBy, Location** |
| `CD_Batch` | 11 | 17 | Pipeline, Status, SourceFile, UploadedBy |
| `CD_Case` | 8 | 15 | AWB, CaseType, Priority, Status, ClaimedBy |
| `CD_Message` | 10 | 17 | Direction, ToEmail, FromEmail, AWB, Path, MatchedBy, RiskFlag |
| `CD_ShipmentEvent` | 3 | 9 | AWB, EventType, Actor, Batch, From/ToStatus |
| `CD_Task` | 7 | 11 | Status/CallStatus, TaskType, Owner, AWB |
| `CD_Participant` | 5 | 10 | Email, Role, Phone, AWB |
| `CD_AIDecision` | 5 | 9 | AWB, Path, RiskFlag, MessageRef |
| `CD_AISummary` | 5 | 8 | AWB, Pipeline, RiskLevel |
| `CD_Metric` | 5 | 8 | Batch, Pipeline, MetricName |
| `CD_Template` | 6 | 8 | ClearanceType, Broker |
| `CD_Broker` | 3 | 5 | BrokerCode, BrokerName |
| `CD_Attachment` | 3 | 11 | AWB, FileName, FileId, MatchQuality, ConvertStatus |
| `CD_Document` | 5 | 9 | AWB, DocType, MatchNote, Source |

Without `ContactEmail` and `ClearanceType` there is no recipient and no template choice —
the engine has nothing to send.

**Fix (ready):** `tools/00-Reconcile-SharePoint.ps1` — add-only, idempotent, dry-run by
default. Adds the missing columns and seeds `CD_Setting` (23 config rows incl. the 5 kill
switches + `sendTestAllowlist`), `CD_Template` (NFBRK, FEBRK-JEENA, FEBRK-SUNIMPEX),
`CD_Broker`, `CD_DocumentType`, 2 batches, 6 shipments covering every branch of the
intake gate, 2 cases, participants and an audit trail.

**Interim bridge (built):** until the script runs, the engine reads the business fields from
`CD_Shipment.RawJSON`, a canonical JSON contract
(`Batch, AWB, Company, Email, EndResult, Broker, Location, Freight, Currency`). All access
goes through one generator function, so swapping to typed columns later is mechanical.

---

## 3. The build slices

### Slice 0 — Unblock *(half a day, mostly not code)*
- **0a** Add the **Office 365 Outlook** connector in Studio *(you, ~5 min)*.
- **0b** Run the reconcile + seed script *(you, ~15 min)*.
- **Exit criteria:** `list_apis` shows the Outlook connector; `CD_Shipment` has 6 rows
  with emails and clearance types; `CD_Setting` has 23 rows.

### Slice 1 — One pre-alert, one shipment, to me *(1–2 days)*
Build the send path end to end, deliberately thin:
pick a shipment → render subject + body from `CD_Template` (placeholders `{AWB}`,
`{CONSIGNEE_NAME}`, `{FREIGHT}`, `{CURRENCY}`, `{LOCATION}` + `[CASE_REF]` tag) → preview →
`SendEmailV2` → write `CD_Message` (`Direction=OUTBOUND`, `AttachmentCount=0`) → stamp
`CD_Shipment.SendState=SENT` → `CD_Batch.SentCount++` → append `CD_ShipmentEvent`.

- **Measure:** latency per send, whether the template renders correctly, exactly what the
  connector demands (permissions, body format, attachment handling).
- **Exit criteria:** one email lands in your inbox, correct subject and body, counters and
  audit row correct.

### Slice 2 — The intake gate (§4.14.1)
Per-row pre-flight: AWB 11–12 digits · clearance type resolved · email valid · broker
resolved. Rejections shown **with reason and fix**, never a count alone. Formatting defects
D-1..D-8 are normalised and flagged, never rejected. Unknown columns HOLD the row and name
the column.

- **Measure:** block rate on the real UBOND Excel — and specifically that bare `FEBRK`
  with no broker is caught and routed to a human, never defaulted.
- **Exit criteria:** the 6 seeded shipments produce exactly the expected 4 accept / 2 block.

### Slice 3 — The paced sub-batch loop
Sub-batches of 25, paced, per-sub-batch result, **a failed sub-batch is retryable on its
own** while the rest keep going, live progress, `SendStartedAt` / `SendFinishedAt` stamped.

- **Measure:** wall-clock for 142 sends against the 1.5-hour baseline. **This is the number
  leadership will quote**, so it has to be measured, not estimated.
- **Exit criteria:** 142 sent in ≤ 5 minutes, no row lost, one retry demonstrably works.

### Slice 4 — Production sender + teammate rollout
Move the send into a **Power Automate flow** using the shared mailbox
(`Office 365 Outlook` → *Send from*), so:
- the send is not tied to whoever clicks SEND,
- it survives the app being closed,
- teammates do not each need their own mailbox connection.

Then reply ingest → `CD_Message`, classification → `CD_AIDecision`, auto-handle vs escalate.

- **Measure:** send success rate per sub-batch, reply-to-case match rate, auto-handle %.

> **Why the flow waits until Slice 4:** canvas + connector gives instant feedback while we
> are still discovering the rules. A flow adds a second moving part (connection, trigger,
> response schema) before the rules are settled — we would be debugging two unknowns at
> once. It is the right *end state*; it is the wrong *first step*.

---

## 4. Safety rails for the laptop phase

| Rail | Where |
|---|---|
| Nothing leaves for a real consignee | `CD_TestMode=Yes` → only recipients on `CD_Setting.sendTestAllowlist` are sent. Every other row is **SKIPPED**, never redirected to a different inbox |
| The allow-list is visible before anyone sends | Batch Board send panel shows the allow-list and, for the selected row, "will receive" vs "will be SKIPPED" |
| Master send switch off | `autoSendEnabled=No`; test mode forces it off regardless of the toggle |
| No attachments on outbound mail | the link **is** the document delivery (`CD_Message.AttachmentCount=0`) |
| Bare `FEBRK` never auto-defaults | → `CHA_UNRESOLVED` case with a fix, never a guess |
| Every send is auditable | `CD_Message` + `CD_ShipmentEvent` appended, never edited, never deleted |

> **Allow-list, not hard redirect (decided).** A hard redirect would quietly deliver a
> consignee's pre-alert to the wrong inbox and hide the fact that the real address was
> never exercised. An allow-list means a skipped row stays visibly skipped, so the
> pre-flight result tells the truth about what would have happened in production.

---

## 5. Open decisions for the team

1. **Sender — decided.** Personal Outlook during Slices 1–3 (fastest to iterate) → shared
   mailbox via flow in Slice 4 (required before teammates roll out).
2. **Shared mailbox address.** Needed for Slice 4 and for the Jeena/Sunimpex CC lists. *Still open.*
3. **Test-mode recipient policy — decided.** Allow-list (`sendTestAllowlist`), not a hard
   redirect. Rows off the list are skipped, never re-pointed. See §4.
4. **Who runs the first send.** One tester (recommended: one real row, one inbox, one
   recorded result) rather than a group test. *Still open.*

---

## 6. Power Fx constraints found while building Slice 1

These cost real compile cycles to discover, so they are recorded here. They are properties
of **this** canvas app, not of Power Fx in general. A probe harness lives in
`tools/gen_canvas.py` (`PROBE`) that emits one formula per candidate so a single compile
reports every verdict.

| Construct | Verdict here | What to use instead |
|---|---|---|
| `JSONValue(text, "$.path")` | **does not exist** | `Text(ParseJSON(RawJSON).Field)` |
| `ParseJSON(dynamicText).Field` | works | — |
| `Let(x = 1, ...)` / `Let(x, 1, ...)` | **does not exist** | chain values through `AddColumns` passes |
| `contains` operator | **not recognised** | `Find(needle, haystack) > 0` |
| `Concat("a", "b")` | rejects plain text | `&` |
| `Ceiling(n)` | **does not exist** | `RoundUp(n, 0)` |
| `Split(t, s).Result` | column is not called `Result` | the column is `.Value` |
| `AddColumns(t, "Name", expr)` | **parse error** | `AddColumns(t, Name, expr)` — bare identifier |
| column added by the *same* `AddColumns` call | not visible to a sibling column | layer the passes |
| column added by an *earlier* `AddColumns` pass | visible implicitly | — |
| `ThisItem` in a screen property (`OnVisible`) | **not bound** | refer to source columns implicitly |
| `ThisItem` inside a gallery | works | — |
| `If(cond, recordA, recordB)` then `.Field` | record type is lost | look the field up per branch |
| `Text(number, "#,##0")` | works | — |

### Consequences for this build

* **Why the pre-flight is six layered `AddColumns` passes.** A column can only see columns
  from an *earlier* pass, so the gate is built in the order it reasons: raw fields → validity
  flags → template + case → placeholder verdict → PASS/BLOCKED → reason / fix / rendered mail.
* **Why the board reads `CD_Shipment.RawJSON`.** The typed columns do not exist yet. The
  accessors are one function (`jv()` in the generator), so switching to typed columns after
  `tools/00-Reconcile-SharePoint.ps1` runs is a one-line change per field.
* **Why `Title` is dropped from the pre-flight source.** `CD_Shipment.Title` holds the AWB
  and `CD_Template.Title` holds the template key. Dropping `Title` from the shipment scope
  means a bare `Title` inside a template `LookUp` can only mean the template.


---

## 7. Bugs found by inspecting the built tree (not Power Fx)

A green compile only says the formulas parse. It says nothing about whether a control ended
up **inside** the container it was written for. Two of these were live for a while with zero
compile errors, so the check now run after every generate is: dump the control tree, then
confirm each block's parent by name.

| Bug | Symptom a compile cannot show | Fix |
|---|---|---|
| Content blocks emitted as **siblings** of `conContent`, not children | the content frame keeps its `FillPortions=1` but is empty, so the page renders as a blank area with the real content pushed out of view | `place(content, 24)` normalises the block to the child indent instead of blindly shifting by `−CANON` |
| `varAllowlist` read **before** the settings seed wrote it | first run on empty lists gives an allow-list of `";;"`, so every row would be SKIPPED until the app restarts | re-read `CD_TestMode`, `sendTestAllowlist` and `SubBatchSize` in the board's `OnVisible`, which also makes a kill-switch flip take effect on the next visit |
| `SubBatchSize` of `0` divides by zero when counting sub-batches | board error on load | fall back to 25 when the setting is blank or non-positive |
| `locStat` navigation parameter passed by the Home tiles, never consumed | AppChecker "unused variable"; the hand-off felt random | the stat card the user came from is tinted, so the tile and the destination visibly agree |

Structural verification used on this build:

* 105 controls on both sides, identical names and nesting
* **0** value differences between local YAML and the live coauthoring session
* only default-valued properties are dropped by the server (`FillPortions: 0`,
  `LayoutGap: 0`, `LayoutAlignItems: Start`, `X/Y: 0`, `VerticalAlign: Middle`,
  `Appearance: Primary`) — cosmetic, not behavioural
* compile: **0 errors**, accessibility checker: **0 errors**

---

## 8. What the real workbook changed (23 Oct 2026)

The first real UBOND paste turned up four things the seeded demo data could never have
shown. All four would have produced *silently wrong* mail rather than an error.

### 8.1 The real columns (25)

```
Loc · Date · AWB Numbers · Consignee Name · Freight · Currency · End Result · Mode
PIN Code · Standard Remarks · FedEx Broker · Contact · ConsigneeEmailID
Duty Bill Account · Value · PieceQty · KiloWgt · IEC · InstructionCD · Commit date
Account · SQL Account Customer Name · Primary CEP · Secondary CEP
```

### 8.2 End Result is richer than three values

Real rows carry `NFBRK`, `FEBRK`, **`Calling`** and **`HOLD`**. The original gate accepted
only `NFBRK`, `FEBRK-JEENA`, `FEBRK-SUNIMPEX`, so five of eight live rows would have been
reported as *data errors* — burying the one genuine error (a missing email) in noise.

**Change:** there are now three outcomes, and the sendable list is a **setting**, not code.

| Result | Meaning | Badge |
|---|---|---|
| `PASS` | would send | green |
| `BLOCKED` | meant to send, data is wrong — a person fixes it | amber |
| `SKIPPED` | not a pre-alert at all (HOLD, Calling, bare FEBRK) | grey |

`sendableEndResults` (semicolon separated) controls the list. Adding a type is a settings
edit, not a release. `HOLD`, `Calling` and bare `FEBRK` each get their own reason and fix
text; anything else says "add it to the setting if it should be pre-alerted".

### 8.3 The email column cannot be trusted by position

In the live rows the *consignee email* appears in the column headed **Standard Remarks**,
while **ConsigneeEmailID** holds a phone number, and **Contact** sometimes holds an email
and sometimes a phone. Depending on the export, any of three columns can carry the address.

**Consequence for the importer:** resolve the recipient by **shape** (`Find("@", …)` and a
domain dot), not by column index, and record which column won so the pre-flight can show it.
Never take `ConsigneeEmailID` on faith.

**Confirmed by the owner, 23 Oct 2026:** the address is in **`Standard Remarks`**. That column
is now tried first; `Contact` second; `ConsigneeEmailID` only if it actually contains an
address. The full 25-column contract is `40EXCEL_IMPORT_MAP.md`.

### 8.4 FedEx Broker is empty or `0` in every row

Broker-based template choice cannot read `FedEx Broker`. For a bare `FEBRK` the broker has to
come from somewhere else — `SQL Account Customer Name`, `Account`, or the free text in
`InstructionCD` (one row carries "ALL SHIPMENT SELF CLEARANCE IN SEZ JAIPUR") — or the row
stays `SKIPPED` until a person names it. **Do not guess.** This is defect C11 territory.

### 8.5 The header row itself is not clean

The first cell of the paste was a timestamp (`10:22 AM`), not a column name, and at least one
header carries a trailing space (`Duty Bill Account `). The importer therefore matches headers
**case-insensitively, trimmed, with known aliases**, and refuses to import when a required
header is missing rather than shifting every column by one. *Open: confirm the exact header
alignment between `Standard Remarks` and `ConsigneeEmailID` for the live export.*

### 8.6 Decision: the customer link is a Power Pages site

A Canvas app cannot be opened by an outside consignee (licence/login required), and the
approved mockup needs the customer to **upload documents**, so the unified link becomes a
Power Pages site: one page per AWB token showing the clearance package, the checklist and the
document upload, backed by the same SharePoint lists. Design reference:
`design/customer-link.html`.

**Prerequisite to confirm:** Power Pages capacity on this tenant, and anonymous access enabled
for the site. If that is not available, the fallback is a tokenised SharePoint page.

**Checked 23 Oct 2026:** `pac pages list` fails with *missing `prvReadpowerpagesite` privilege*,
so this account cannot read — let alone create — a Power Pages site. There is also no Power
Pages tool in the assistant session. Setup, the flow-endpoint architecture and the exact
unblock steps are in `41POWER_PAGES_SETUP.md`.

### 8.7 Revised build order

1. **UI density pass** — done: one stat card with inline pairs (per the mockup), proportional
   table columns (no clipping below 1100px), hairline row rules, send progress in the stats card.
2. **Real-data rules** — done: sendable-end-results setting, `SKIPPED` state, honest demo rows
   (bare `FEBRK`, `HOLD`) and per-batch demo data.
3. **Upload** — needs the typed columns (reconcile script) and the Excel Online connector.
   Validation is *accepted vs rejected side by side*, per `design/upload.html`.
4. **Send** — needs the Office 365 Outlook connector.
5. **Customer link** — Power Pages, after 3 and 4 prove the data is right.

---

## 9. Navigation: only screens that work (23 Oct 2026)

The app had **12 sidebar links, 9 of which opened a screen whose only text was
`ScrAllCases placeholder`**. That is the single biggest reason the app read as
"where is what" — most clicks were dead ends that looked like bugs.

Changes:

- Sidebar and Home stat tiles now point at **`Home`, `Upload batch`, `Batch board`** only.
  The generator's `NAV` list is the one source of truth for generated screens.
- The five Home stat tiles open the **Batch board** (three of them tint the matching board
  stat via `locStat`); none of them open a screen that does not exist.
- The nine unbuilt screens still exist but are unreachable, and each now says what it will do
  and why it is not wired yet, instead of the word "placeholder". `ScrBatchUpload` additionally
  states the three rules confirmed from the real workbook, so the screen teaches the contract
  in §8.1–8.4 rather than pretending to accept a file.
- Verified: compile **14 files, 0 errors**; accessibility 0 errors; live session value
  difference **0** (only default-valued properties dropped by the server).

Rule going forward: **a screen joins the nav on the day it does something real.** No
placeholder link is ever added to make the sidebar look fuller.
