# Clearance Desk — Showcase, Guides and Runbook

*The outward-facing content: the showcase site, the per-role user guides, the admin runbook, and the in-app guidance.*

*Implements decision **L13**.*

---

## 1. Three different audiences

| Audience | Wants | Deliverable | Where |
|---|---|---|---|
| **FedEx leadership / other gateways** | "What does this look like, and could it work at Mumbai?" | A showcase site with a guided demo path | §2 |
| **Agents, Team Leads, IGM, Admin** | "How do I do my job here?" | Short per-role guides, plus in-app guidance | §3, §5 |
| **The person holding the pager** | "What do I do at 07:00 on day 1, and what do I do when it breaks?" | The runbook | §4 |

**Rule for all three: show the work, not the feature list.** A customs clearance desk has no interest in a platform pitch. The showcase's job is to make a Team Lead think *"they've seen my actual mess."*

---

## 2. The showcase site

### 2.1 What it is

A public, read-only site. Not the production portal, not a login, not a demo tenant. It shows the system as a **narrated story** with real screenshots of the real screens, using **fabricated data**.

**No customer data, ever.** Not real AWBs, not real company names, not real email addresses, not real amounts. Fabricated data that *looks* like Delhi — 874515906172, "Aashita Enterprises", "Delhi" — because recognition is the point, and `aashita_engg@yahoo.com` in a screenshot is a real customer's address.

### 2.2 Structure

```
clearance-desk (public)
│
├── HOME ─────────────────────────────────────────────────────
│   "Every customs notice, generated, linked, and tracked."
│   The Delhi pilot. Courier first. One link per shipment.
│   [ See the courier flow ]  [ See the cargo flow ]  [ Read the guides ]
│
├── HOW IT WORKS ─────────────────────────────────────────────
│   Three screens, one idea: the customer never gets an attachment.
│   1. The agent uploads a sheet
│   2. The system picks the template, the documents, the deadline
│   3. The customer gets a link, uploads, done
│
├── COURIER FLOW ── the send, and the rows nobody owns ────────
│   ▸ The pull sheet arrives, already split by the division
│   ▸ 267 rows land on a named person. They just work.
│   ▸ 65 rows land on a desk, not a person
│   ▸ The desk lead clears them  ← the queue nobody has today
│   ▸ The system detects the issue type and picks the template
│   ▸ The agent reviews the pre-ticked documents
│   ▸ Auto-send, or a review queue with the failing reason named
│   ▸ The customer opens one link
│
├── CARGO FLOW ── pre-alert to post-arrival ─────────────────
│   ▸ The UBOND pre-alert arrives
│   ▸ One row, one AWB
│   ▸ Bulk invoice retrieval for the whole batch
│   ▸ NFBRK / Jeena / Sunimpex packs, pre-ticked
│   ▸ Send with the historical subject and the historical CC
│   ▸ CONSOL merge, MAWB and IGM back into the same thread
│   ▸ Cutoff reminders, then DO
│
├── THE LINK ── what the customer sees ───────────────────────
│   What is needed, by when, what to download, what to upload.
│   One page. No attachment, no zip, no chasing.
│
├── DOCUMENTS ── the pre-ticked pack ────────────────────────
│   Fixed documents come pre-selected.
│   Agents edit, delete, add — at one AWB, a selection, or a whole batch.
│   PDF and DOCX only. Internal documents never appear on a customer link.
│
├── THE API ── bulk document operations ─────────────────────
│   One call for a 500-AWB batch. One flow run. Per-item results.
│
├── FOR TEAMS ── division, value class, identity ────────────
│   Cargo, Courier LV/MV/HV. AAD sign-in, a profile that decides
│   the division, teams that decide the scope.
│
├── GUIDES ───────────────────────────────────────────────────
│   Cargo agent · Courier agent · Team Lead · IGM · Admin · Supervisor
│
├── PILOT ── what we are measuring ───────────────────────────
│   Time from pull sheet to send. Errors per batch. Mails still typed by hand.
│   Licence cost per agent. The savings case, stated plainly.
│
└── CONTACT ─────────────────────────────────────────────────
```

### 2.3 Design rules

| Rule | Reason |
|---|---|
| Fabricated data only | A real AWB in a screenshot is a privacy incident |
| No login, no demo tenant | A public site that needs a licence is a site nobody visits |
| Every screenshot captioned with the **decision** it illustrates, not the control | "65 rows are held because they have a desk, not a person" beats "Pool queue with checkboxes" |
| One claim per screen | If a screen proves two things, it proves neither |
| Show the failure states | A reviewer trusts a system more when it shows what happens when something is wrong. The review queue screenshot is the most persuasive image on the site |
| Mobile screenshots of the portal | The customer is on a phone at the airport gate. Show the phone |
| Version dated | "Delhi pilot, October 2026" — so a stale screenshot is visibly stale |

### 2.4 The demo path

For a 20-minute walkthrough, in this order:

1. **Home** — 30 seconds on the problem: 40 cargo agents, 20 courier agents, hand-typed mail, attachments that get lost
2. **Courier Flow**, stopping at the **pool queue** — 65 real rows that have a *desk* as their owner and no person. The first question is always *"we do that in a spreadsheet, is this the same thing?"*, and the honest answer is *"the spreadsheet already has the split — we're not re-doing it, we're making sure nobody sends from nobody's mailbox"*
3. **The `category_conflict` banner** — 19 real rows where the spreadsheet disagrees with itself, surfaced not hidden
4. **The pre-ticked pack** — *"so the agent can still change it?"*
5. **The link** on a phone — *"this is what the customer gets"*
6. **The review queue** — *"and when it's not sure, it stops and tells you why"*
7. **Pilot metrics** — what we are measuring, and what it costs

Skip the AI section unless asked. For a clearance team, "it drafts the reply" is a detail; "it never sends the wrong template, and it never sends from a desk that has no person behind it" is the feature.

---

## 3. Documentation set

| # | Document | Audience | Read when |
|---|---|---|---|
| 1 | `1Clearance_Desk_PRD.md` | Everyone | Once, for the story |
| 2 | `2Clearance_Desk_Architecture_Decisions.md` | Technical | Before building |
| 3 | `3Clearance_Desk_Data_Model.md` | Technical | Before the schema |
| 4 | `4Clearance_Desk_AI_Engine_Spec.md` | Technical | Before Phase 4 |
| 5 | `5Clearance_Desk_Build_Guide.md` | Build team | Phase 0 |
| 6 | `6Clearance_Desk_Template_Config_Guide.md` | Managers, Managers of teams | Before writing templates |
| 7 | `7Clearance_Desk_Screen_Design_and_Flows.md` | Build team, agents | Before building screens |
| 8 | `8Clearance_Desk_Locked_Decisions.md` | **Everyone** | **Read §1 before anything else** |
| 9 | `9Clearance_Desk_Identity_and_Division_Model.md` | Build team, Team Leads | Before provisioning |
| 10 | `10Clearance_Desk_Document_Pack_System.md` | Build team, Managers | Before packs |
| 11 | `11Clearance_Desk_Documents_API.md` | Technical | Before Phase 3 |
| 12 | `12Clearance_Desk_Unified_Flows.md` | Build team | Before any flow |
| 13 | `13Clearance_Desk_Data_Model_v2.md` | Technical | Before the schema |
| 14 | `14Clearance_Desk_Access_Provisioning.md` | IT, Team Leads | Phase 0 |
| 15 | `15Clearance_Desk_Build_Sequence.md` | Build team | Before Phase 1 |
| 16 | `16Clearance_Desk_Showcase_and_Content.md` | This document | Before publishing anything |
| 17 | `17Clearance_Desk_Source_Fidelity_Contract.md` | Build team, Managers | **Before writing any template** |
| 18 | `18Clearance_Desk_Template_Approval_Packet.md` | **Manager, Compliance** | **Before any customer-facing mail** |
| 19 | `19Clearance_Desk_Onboarding_and_Signoff.md` | Manager, IT | **Before build starts** |
| 20 | `20Clearance_Desk_Process_and_Licence_Model.md` | Build team, Manager | **Before any template or flow** |
| **21** | **`21Clearance_Desk_What_We_Are_Building.md`** | **Everyone** | **Read this one first** |

### Template source files (not documents — the sendable artifacts)

| Path | Contents | Status |
|---|---|---|
| `templates/cargo/README.md` | Source → revision map, all fixes, the six findings | Read first |
| `templates/cargo/01`–`11` | 10 cargo templates revised from 10 sources | **Draft, held** |
| `templates/courier/00_config.md` | 11 category configs, **2 shapes**, 82 `Reason` substitutions | **Draft** |
| `templates/courier/shape_A/B.md` | The 2 courier mail shapes. A "brief your broker" shape was **withdrawn** — FedEx files courier BOEs | **Draft** |
| — | `7Clearance_Desk_Screen_Design_and_Flows (1).md` | — | **Duplicate of 7. Deleted.** |

**Reading order for a new joiner:** 1 → 8 → 7 → 12 → the guide for their role. Nothing else, at first.

**Precedence:** doc 8 wins on any conflict. Doc 13 wins over doc 3 on schema. Doc 12 wins over doc 7 §5 on flows. Where docs 1–7 contradict doc 8, the contradiction is recorded in doc 8 §2 and resolved there — not silently.

**Doc 17 is a build input, not a design choice.** It records the exact strings, fees, columns and PDF geometry the legacy systems emit. If a template being written disagrees with doc 17, one of them is wrong and it is found now, not after a customer receives it.

---

## 4. Admin runbook

*Operational. Keep this printable.*

### 4.1 Daily — the first 15 minutes

| Time | Task | Where |
|---|---|---|
| 07:00 | Open **Home**. Anything in **Needs attention** from overnight? | App |
| 07:05 | Check **Flow alerts** in Teams. A red X is a stopped flow, not a warning | Teams |
| 07:10 | Check `Error log` for `customer_impacted = Yes`, sort by that column | App |
| 07:15 | Confirm `CD_TestMode` is what you expect it to be. **The first thing to check, every day** | Doc 14 §7 |

### 4.2 Daily — the running checks

| Check | Threshold | If breached |
|---|---|---|
| Cases with `send_state = needs_review` older than 4h | > 5 | The team is blocked. Find out why — usually a template or an email problem |
| `blocked_no_template` | > 0 | A `clearance_type` is resolving to a path with no template. C8 |
| `blocked_placeholder` | > 0 | **A template is broken.** No customer should ever have hit this. Fix the template |
| Reminders sent today | vs. yesterday | A drop means F17 stopped |
| Any document exposed with `visibility = internal` | > 0 | **Incident.** Revoke tokens, set test mode, investigate |

### 4.3 Incident playbooks

**A wrong mail reached a customer**

1. `CD_TestMode = Yes` — the system goes inert
2. Identify every case sent in the affected window (`Mail message`, by template and time)
3. Decide with the team: individual correction, or a corrected notice in the same thread
4. Fix the root cause: template, rule, or detection
5. Do not turn test mode off until the cause is fixed **and** verified on a test case
6. Write it up. This is the incident the runbook exists for

**A link shows an internal document**

1. Revoke the token (F20 on demand) — the document stops being reachable
2. `CD_TestMode = Yes`
3. Verify the visibility filter in `GET /s/{token}/documents` — the bug is server-side, not in the page
4. Check `cd_accessrule` for a missing `deny`
5. Incident review. **Treat as a security incident, not a bug**

**A flow stopped**

1. `Flow alerts` shows the run that failed
2. `Error log` has the plain-language reason
3. Retry from `Needs attention`
4. If it fails twice, disable the flow and switch to the manual process for that step. **A stopped flow must not become a silent queue**
5. Fix outside business hours, not during the arrival peak

**ACCS is down**

1. F02 marks the rows `ACCS fail`; the batch still processes
2. Fall back to the `Inputs` file export if one exists
3. The review screen shows the ACCS status per row (doc 7 §3.2a) so the agent knows what is missing

**The service account is unavailable**

1. This is the highest-risk failure in the system (doc 14 §4.3)
2. Nothing sends. Escalate immediately
3. Rebuild the connections under a new service account, re-point every connection reference, run a test send
4. Expect a maintenance window

### 4.4 Weekly

- [ ] Review the `Error log` for `is_resolved = No`
- [ ] Review the `cd_profile_request` backlog (doc 14 §10.3)
- [ ] Spot-check 3 sent cases end to end: the mail, the link, the documents, the audit trail
- [ ] Check the AI approval rate by situation. A drop in a previously-good situation means something changed in the data

### 4.5 Monthly

- [ ] **`cd_doclibrary` freshness review** — the highest-value task in this list. A stale fixed document is sent to customers every single day
- [ ] Review `cd_apilog` for rate-limit trends (doc 11 §7)
- [ ] Review AI classification accuracy against a sample of 20
- [ ] Confirm holiday and cutoff rows for the next quarter
- [ ] Review who holds `CD_Builder` and `CD_Admin`
- [ ] Rotate the API client secret if due

### 4.6 Quarterly

- [ ] Re-run doc 14 §9 verification end to end
- [ ] Review autonomy levels against measured performance. **Level 1 is earned, never assumed**
- [ ] Review value-class thresholds with Compliance (O12)
- [ ] Full offboarding check for anyone who has left
- [ ] Update the showcase site if the UI has moved

### 4.7 The kill switches

| Switch | Effect | Who |
|---|---|---|
| `CD_TestMode = Yes` | All sends route to `CD_TestRecipient`. **The master stop** | Manager+ |
| `autoSendEnabled = No` | Everything queues for review. Templates still generate | Manager+ |
| `aiEnabled = No` | Templates only. No classification, no drafts | Manager+ |
| `followupEnabled = No` | No reminders, no call tasks | Manager+ |

**These are not debug switches.** They are the operational control surface, and the reason auto-send is safe to offer at all.

---

## 5. Per-role user guides

Each guide is one page, screen-by-screen, with a picture per step. No architecture, no flow names, no jargon the team does not already use.

### 5.1 Courier agent — `Courier_Agent_Guide.pdf`

```
1. Sign in
   Open the app from Teams. You land on Home. You only see Courier.

2. Your work is in Send → Courier
   "23 need review, 4 blocked"
   Everything assigned to you, newest first.

3. Open a case
   You see: the AWB, the company, the detected issue type and how
   confident the system is, the documents, and the mail that will go.

4. The issue type is wrong? Fix it.
   Pick the right one. The system re-picks the template. Your change
   is remembered for this company next time.

5. The documents
   The right documents are already ticked. You can:
     - untick one you don't need
     - delete one
     - add another from the library
     - upload a new one
   Scope: this AWB / the rows I ticked / the whole batch.

6. Send
   [ Send all ready ]
   Green rows go. Amber rows wait for you and say why.

7. If a row stops
   It names the reason. Fix the reason, not the row.
     "No email"        → ask the team for the address
     "Low confidence"  → check the category yourself
     "No template"     → tell your Team Lead
     "Unresolved field"→ tell your Team Lead, the template is broken

8. The customer replies
   It lands in your Inbox, already read, already classified, with a
   suggested action. You approve or change it. You never write the
   mail yourself.

9. Reminders
   Sent for you at 4 hours, 8 hours, and then a call task. Never more
   than three. If a customer keeps not responding, you will see a
   call task, not a fourth mail.
```

### 5.2 Team lead — `TeamLead_Guide.pdf`

```
1. The pool queue
   Home → "65 need an owner".
   You already split this. The spreadsheet says these 65 belong to the
   BOM desk, not to a person — so the system refuses to send them
   from a mailbox that does not exist.
   Every row: AWB, company, category, value class, remark, age, and
   each BOM agent's current load.

2. Assign
   Tick rows, pick agents, see the projected load before you commit,
   then [ Assign ].
   You cannot accidentally lose a row. Everything is written to the
   assignment history with your name on it.
   Until you do, these rows are blocked from sending. They are not
   hidden and they are not overdue — they are waiting on you.

3. Reassign
   Something went wrong. Open the case → Reassign → pick someone →
   give a reason. One line. It is recorded.

4. The other 267
   You do not need to do anything. The system loaded the division's
   own split from the sheet, exactly as published.

5. Shared with
   A case can show extra people who are following it. They can see
   the case. They do not own it, and they cannot take it over.

6. Leave cover
   Settings → Agents → Set cover. When that person is marked away,
   their open cases and drafts move automatically.

7. Add a new agent
   People → Pending requests. Pick team, role, gateway, capacity.
   [ Approve ]. They can sign in immediately.

8. What you cannot change
   Templates, fee rules, and the autonomy switches are Manager+.
   You can see them. If one is wrong, ask your manager.
   This is deliberate: you assign the work, someone else owns the rules.
```

### 5.3 Cargo agent — `Cargo_Agent_Guide.pdf`

```
1. Send → Cargo → Upload pre-alert
   Drop the UBOND file. 28 rows found.

2. Check the status strip
   22 Ready · 4 New customer · 1 No email · 1 ACCS fail
   Nothing sends until you decide. Every row is in exactly one bucket.

3. The amber rows
   Value band: the system proposed LV/MV/HV from the invoice value.
   Confirm or correct. It is remembering, and it gets better.

4. "End Result = FEBRK but no broker"
   The system will not guess between Jeena and Sunimpex. Look it up,
   pick it, continue. It will never fall back to NFBRK.

5. Invoices
   Fetched for the whole batch in one go. You will see which invoice
   matched how — an exact name match, or a loose one. If one is wrong,
   attach the right file yourself.

6. The documents
   Pre-ticked from your clearance type. Edit, delete, add, same as
   courier. "Whole batch" is where the time is saved — untick bank
   details once for 28 AWBs.

7. Preview, then send
   The subject is the format your customers already know. The CC
   list is the one your brokers already expect. There are no
   attachments. The link is in the mail.

8. After arrival
   The IGM merges CONSOL. The post-arrival notice goes into the same
   thread. The same link gains the MAWB, the IGM number and the live
   fee band. You do not send a second link.
```

### 5.4 IGM agent — `IGM_Guide.pdf`

```
1. Payments
   Pending payments, UTR matched where the bank file allowed it.
   Matched, needs review (with the reason), or awaiting the bank file.

2. DO issued
   Upload the DO, press [ DO issued ].
   The customer sees the DO and the invoice on their link.
   Nothing is emailed as an attachment.

3. Ready for ACCS
   The agent hands a case to you. It is in your queue with everything
   the customer uploaded.

4. ICEGATE
   A flight is delayed. [ ICEGATE delayed ] → every affected case
   gets a status note. One click.
```

### 5.5 Admin team — `Admin_Guide.pdf`

```
1. Handoffs
   Cases arrive from agents marked "Ready for ACCS". Open, file the BOE,
   [ BOE filed ] — or send it back with a reason. The agent sees the reason.

2. Returned cases
   Each one carries the reason you gave. Fix it and send it back.

3. Search
   By AWB, company, agent, or date. Every action on a case is in the history.
```

### 5.6 Supervisor and manager — `Supervisor_Guide.pdf`

```
1. The dashboard
   Queue by team. Ageing. Blocked counts. Where work is stuck.

2. The list that matters
   "Cases with no app activity in 24 hours."
   These are people working outside the system. Talk to them, don't
   email them a policy.

3. Accuracy
   AI approval rate by situation, and what it is being used for.

4. The switches
   Templates, item rules, fees, holidays, packs, and the autonomy levels.
   Changing a template changes every future mail. Version it.

5. Autonomy
   Level 0 templates only · Level 1 auto-send · Level 2 draft for approval ·
   Level 3 human only. Raise a level on evidence, never on schedule.
```

---

## 6. In-app guidance

Guidance lives where the work happens, not in a PDF.

| Surface | Content |
|---|---|
| **First-run tour** | Three steps per role, skippable, shown once. Role-specific |
| **Empty states** | Say what goes here and which button fills it. *"No cases assigned to you. Your Team Lead splits the pull sheet."* Never a blank list |
| **The tick-list** | A one-line hint above it: *"These are the documents your clearance type needs. Change anything."* The pre-ticked state must be obvious or it looks like the system decided for the customer |
| **Gate failures** | Name the gate, name the fix. Never "error" |
| **Kill-switch state** | A persistent banner when `CD_TestMode = Yes`. An agent must never wonder whether what they are looking at is live |
| **The link preview** | A "what the customer will see" tab next to the mail preview. One click, and it removes the most common support question |
| **The document panel** | Shows `visibility`, `original_format`, and how it matched. The three things people ask about |
| **Footer** | Case reference on every screen, and a help link |

### 6.1 Error message catalogue

Plain language, the reason, and the next action. Carried in a single table so every flow writes the same way.

| Code | Message | Next action offered |
|---|---|---|
| `E-101` | This file is missing a column: `ConsigneeEmailID`. Check you uploaded the current pre-alert template. | Download the template |
| `E-102` | `End Result` is FEBRK but no broker is given. Choose Jeena or Sunimpex. | Pick the broker |
| `E-103` | No email address for this AWB. It cannot be sent. | Search the company, add an address |
| `E-104` | The template for this clearance type is missing. | Tell your Team Lead. The send is stopped |
| `E-105` | The mail could not be built: `{FEE_AMOUNT}` has no value. Nothing was sent. | Tell your Team Lead. **The send is stopped** |
| `E-201` | ACCS did not respond for this AWB. It will be retried. | Send anyway without ACCS data, or wait |
| `E-202` | The invoice could not be matched. Attach it manually. | Upload |
| `E-210` | This pull sheet is missing a column: `Master`. Check you uploaded the current clearance sheet. | Download the template |
| `E-211` | AWB `15939426501` is 11 digits, not 12. It has been accepted — please confirm it is correct. | Confirm the AWB |
| `E-212` | The commit date on this row reads `31-Dec-99`, which cannot be right. | Enter the real date |
| `E-213` | This row has no owner — it belongs to the BOM desk, not a person. It cannot be sent until someone is assigned. | **Assign it** |
| `E-214` | The spreadsheet's `Master` and `Reason` disagree on this row. We are using `Master` (`RBOE`). | Confirm or change |
| `E-215` | A checklist was already sent on this shipment, so none has been requested again. | — (informational only) |
| `E-216` | A colleague named in the `CEP` column could not be found in the system. They may not get the update. | Ask your Team Lead to check the name |
| `E-301` | This file is not PDF or Word. Upload a PDF or DOCX. | — |
| `E-302` | Zip files are not accepted. Upload the files one at a time. | — |
| `E-401` | The link has expired. Ask us for a new one. | Request a new link |
| `E-402` | This document is not shared. | — (internal, never seen) |
| `E-501` | The mail was already sent for this case. | — |

**`E-210`–`E-216` are new** and are specific to the courier pull sheet (doc 12 §2.10). Four of the seven are warnings, not errors — an 11-digit AWB, a sentinel date, a category conflict and an unresolvable colleague are all real data conditions that still produce a working case. The wording matters: the agent should feel informed, not accused, because in every one of these cases the source data is real and the spreadsheet is what the team already uses.

**No message says "an error occurred", and no message contains a stack trace, a GUID, or a flow name.** The trace lives in `Error log` for the person who can act on it.

---

## 7. Training

| Session | Audience | Length | Content |
|---|---|---|---|
| **T1** What changed and why | Everyone | 30 min | The one-link idea. Why there are no attachments. What the system will never guess |
| **T2** Courier end to end | Courier agents, Team Lead | 90 min | Live in a sandbox. Each person sends a case and handles a reply |
| **T3** The pool queue | Team Leads | 30 min | Clearing the 65 unowned rows, re-assignment, cover, and why a shared case is not yours to send |
| **T4** Cargo end to end | Cargo agents | 90 min | Live in a sandbox, including the ACCS-failure path |
| **T5** Documents and packs | Cargo agents, Managers | 45 min | Pre-ticked, untick, delete, add, batch scope, the library |
| **T6** IGM and Admin | IGM, Admin | 60 min | Handoffs, DO, payments, the BOE |
| **T7** The switches and the runbook | Managers, admins | 45 min | Kill switches, incident playbooks, the daily checks |

**Rules:**

- [ ] Every session is in a **sandbox** with fabricated data, not in production
- [ ] Every attendee **sends a case themselves**. A person who has watched is not trained
- [ ] Attendance is recorded. A person who missed T2 gets a repeat, not a summary
- [ ] The **quick reference card** is a single printed A4: sign in, find your work, send, handle a reply, who to call. Nothing else

---

## 8. Glossary

The team's own words. Used in every guide, every screen, every error message.

| Term | Meaning |
|---|---|
| **AWB** | Air waybill. The shipment number |
| **UBOND** | The pre-alert file, issued ~2–3 days before arrival |
| **CONSOL** | The consolidation list IGM receives on arrival |
| **MAWB** | Master air waybill. The consolidation number |
| **IGM** | The interline flight manifest number, issued when the flight lands |
| **ICEGATE** | The customs system where the BOE is filed |
| **BOE** | Bill of entry. The customs declaration |
| **CHA** | Customs House Agent. The broker who files it |
| **DO** | Delivery order. Releases the shipment |
| **UTR** | The bank transaction reference that proves payment |
| **ACCS** | The internal air cargo system holding the shipment and invoice data |
| **NFBRK / FEBRK** | The two clearance paths. FEBRK splits into **Jeena** and **Sunimpex** |
| **FEBRK** with no broker | A real, unresolvable case. The system stops and asks |
| **LV / MV / HV** | Low / Medium / High value. Drives the route, the items, and the fee |
| **CCI MEIS** | A legacy export document, present in the Jeena and Sunimpex packs |
| **KYC** | Know Your Customer documents |
| **tp_hold** | A courier shipment held at the terminal pending a resolution |
| **ROD** | Release on Demand |
| **SVB** | SVB Express — appears in historical courier remarks |
| **A case reference** | `CG-000118` (cargo) or `CD-000142` (courier). Appended to every subject, and the reason replies match |
| **The link** | `/s/{token}` — what the customer opens. The only delivery mechanism |
| **A gate** | A precondition for sending. Named, visible, and blocking |

---

## 9. Change governance

| Change | Who approves | Recorded where |
|---|---|---|
| A template body or subject | The division's **Manager**, with the team lead | `Template.version_status`, approver, date |
| A fixed document in the library | **Manager +**, and the change is **dated** | `cd_doclibrary` version and `superseded_by` |
| A pack's contents | **Manager+** | `cd_docpack` version |
| An item rule | **Manager+** | `Item rule` version |
| A fee, cutoff, or penalty | **Compliance + Finance** | `Fee rule`, with the source cited |
| An autonomy level | **Operations Manager**, on measured evidence | `Autonomy rule`, with the approval rate that justified it |
| A team or a scope | **Admin** | `cd_team` |
| A new clearance path or template family | **Manager + Admin + Compliance** | All three, and a new ADR |

**The recurring failure mode is the fixed document.** Not the code, not the flows — a circular from 2021 that nobody replaced because nobody owned it. `cd_doclibrary` exists so that ownership is a row, a version, and a date. The monthly review in §4.5 is the control.

---

## 10. Go-live comms

**One week before**

> From Monday, Clearance Desk handles your courier exceptions in the new system. Same contacts, same templates, same deadlines. The one change: your customer gets a link instead of attachments. Everything you send today gets the link.

**Day 1, 07:00**

> It's live. The old process is available all week if you need it. Tell us where it's slow — that's what this week is for.

**End of week 1**

> What we changed because of what you told us. Three things, and why.

**Never**

- Do not say "this replaces your job"
- Do not say "the system knows better" — it does not, and the day it guesses wrong the trust is gone
- Do not remove the old process during the pilot. The parallel run is what makes adoption safe
