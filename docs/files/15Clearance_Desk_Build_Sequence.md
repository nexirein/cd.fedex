# Clearance Desk — Build Sequence

*What gets built, in what order, and what proves each phase is finished.*

*Expands doc 5 into phase gates. Courier first (L7). Every phase has an exit test that a person, not a checklist, can run.*

> **Phase 1/2 numbers are measured, not estimated.** Every count in the Courier scope — 332 rows, 267 named owners, 65 pool rows, 84 `CEP` share rows, 43 of them unresolvable, 19 category conflicts, 118 checklists already sent — comes from the real pull sheet, verified against it. Do not replace them with round numbers. They are the acceptance criteria, and a build that hits 18 conflicts instead of 19 has a bug in `Category map`, not a better dataset.

---

## 1. Sequencing principles

These five decisions shape the whole order. Every phase obeys them.

| # | Principle | Consequence |
|---|---|---|
| 1 | **Courier before cargo** (L7) | Courier has no ACCS dependency, no bank feed, and a much smaller document set. It proves send, pool assignment, pack, and link on real work in weeks, not months |
| 2 | **The send engine before the AI** | F05 in Phase 2 works from templates alone. If the AI never ships, the system still replaces hand-typed mail. AI is an *addition*, never a dependency |
| 3 | **Documents before sending** | The pack, the format rules and the visibility rules must exist before the first customer mail, because L2 means the link **is** the delivery. There is no attachment fallback to hide behind |
| 4 | **Test mode from the first flow** | `CD_TestMode = Yes` is created in Phase 1 and stays on until the go-live gate in §7. It is not a production toggle added later |
| 5 | **One division in the environment at a time** | Courier goes live alone first. Cargo follows once the courier pilot is stable. Two divisions debugging each other is how a pilot dies |

**A phase is not done because the code exists.** It is done when the exit test in that section passes on real data, in test mode, with a person from the team driving it.

---

## 2. The build at a glance

| Phase | Name | Flows | Weeks | Gate |
|---|---|---|---|---|
| **0** | Access, decisions, material | — | 1–2 | IT granted, workshops held, test data in hand |
| **1** | The record | F19, F20, F21, F26, F28 | 2 | 34 tables, roles, app shell, People screen, pool queue working |
| **2** | **Courier MVP** | F01b, F01c, F08b, F03c, F22, F23, F05, F10 (basic) | 3–4 | **An agent sends a real courier notice end to end without writing mail** |
| **3** | Cargo + documents | F01, F02, F03, F06, F24, F25, F27 | 3–4 | A real cargo batch enriches, packs, sends, and the customer opens the link |
| **4** | Reply + AI | F07, F08, F09, F17, F18 | 3 | A real customer reply is classified, acted on, and closed |
| **5** | IGM, Admin, Finance | F04, F06b, F11, F12, F13, F14, F15, F16 | 2–3 | A DO is issued, paid, matched, and the BOE is filed |
| **6** | Supervisor and control | metrics, autonomy UI | 1 | The Supervisor can see and change the system's behaviour |
| **7** | Pilot | all | 2 parallel + 2 live | Go-live gate in §10 signed |
| **8** | Scale | — | — | Gateways, divisions, licences |

Phases 3–5 partly overlap in practice, but each **gate** is sequential. Phase 5 does not start until Phase 4's gate passes, because the IGM work depends on the reply engine writing to the same record.

**F26 moved from Phase 2 to Phase 1.** It is the assignment engine, and F28 — the pool resolution queue — is its only exit from `awaiting_pool_assign`. F05's Gate 0 depends on both, so building them in Phase 2 would mean the very first courier send has no mailbox behind 65 of 332 rows.

---

## 3. Phase 0 — Access, decisions, material

*No building. Doc 5 §1–§2.*

### Deliverables

- [ ] **Access pack granted** (doc 14 §2) — the slow items first: SharePoint, mailboxes, Exchange permissions, then the environment, then Azure
- [ ] **10 week-0 questions answered** (doc 5 §1). Q1, Q6, Q9 and Q10 are the ones that change the design; the rest change only the implementation
- [ ] **4 workshops held** (doc 5 §2.2). Courier, Cargo, IGM, Compliance/Finance
- [ ] **Test material collected** (doc 14 §2.8) — especially the 5 real TIFF invoices and the 20 best hand-typed mails
- [ ] **Compliance sign-off on C7** (penalty rate, citation number, which deadline the reminder engine uses) — **this is the only item that cannot go to pilot unresolved**
- [ ] Solution `ClearanceDesk` created; environment variables created with `CD_TestMode = Yes` (doc 14 §7)

### Gate

- [ ] A test user exists in AAD, in a `CD-*` group, and can sign in to the environment
- [ ] A test mail sends from the service account with `Reply-To` on a team mailbox, and the reply comes back with a conversation ID
- [ ] The compliance answers to C7 are written down, with a name against them

---

## 4. Phase 1 — The record

*Doc 5 §3. The system exists before it does anything.*

### Build

**Schema (doc 13)**

- [ ] 20 tables from doc 3, extended to the **34 in doc 13 §2** — 14 new, with `clearance_type` / `workflow_state` / `phase` already split (C6)
- [ ] The 14 new tables from doc 13 §2, including the filtered unique index on `cd_assignment` and the `is_pool` / `assignment_role` columns
- [ ] `Gateway` = 1 row: `DEL`
- [ ] `Company` import: 40,000 rows with `name_key` computed using the **full cargo-paf normalisation chain** (doc 13 §2.4), not the simple version in doc 3
- [ ] `cd_companyclearance` seeded from the historical `.eml` sets (doc 10 §4)
- [ ] `cd_team` seeded (doc 9 §3), `cd_valuerule` seeded with **placeholder thresholds pending O12** — the seed must be obviously wrong so nobody trusts it
- [ ] Config tables seeded: `Holiday` (doc 6 §5), `Fee rule` (doc 6 §3), `Routing rule` (doc 6 §6), `Autonomy rule` (doc 6 §7 — **all set to Level 0, templates only**)

**Security (doc 14 §4)**

- [ ] 6 business units, 12 security roles, DLP policy applied
- [ ] `CD_Builder` held by 2–3 people. Nobody else

**Screens (doc 7 §3, doc 9 §9)**

- [ ] App shell: division-scoped navigation (doc 9 §9). An agent sees only their division's tiles
- [ ] **People screen** — the first screen built after the schema, because provisioning blocks everyone else
- [ ] **Settings** read-only screens for templates, items, fees, packs — read-only at this phase, write comes in Phase 6
- [ ] Home, empty state, with a clear "nothing to do"

**Flows**

| Flow | Phase 1 scope |
|---|---|
| **F19** | Built first. Every subsequent flow calls it in its Catch block. A system with no error path is not shippable |
| **F21** | Nightly + Sync now |
| **F20** | Daily link expiry sweep — needed before any link exists, so the pattern is established |
| **F26** | Built here, together with **F28**. F01b hands the 65 pool rows to F28 and F26 writes the resulting assignment, so a Courier MVP in Phase 2 can never reach a row with no person behind it |

### Test

- [ ] F21 finds the test user and creates a `cd_profile_request`; approving it creates the profile and assigns the role
- [ ] A user in no `CD-*` group produces nothing
- [ ] A Team Lead cannot see a Settings edit control
- [ ] A courier agent cannot read another agent's case
- [ ] Raise a deliberate error in a test flow → it lands in `Error log` with plain language and a retry button
- [ ] 40,000 companies imported; a fuzzy name match lands in "Unsure", not auto-linked

### Gate

- [ ] You can add an agent in under a minute, from the People screen, and they can sign in and see an empty but correctly-scoped app
- [ ] No table exists that the app cannot explain the purpose of

---

## 5. Phase 2 — Courier MVP ★

*The critical phase. This is where the project proves or fails.*

### Why courier first

No ACCS. No bank feed. No BOE. **Eleven** defect categories, one document pack, one team, and 65 rows that genuinely need a human to name an owner. **It touches every architectural decision in this document set** — L1, L2, L4, L5, L6, L8, L9, L11, L12 — with the smallest possible surface area.

And the data is already in hand. `docs/files/courier_pull_from_clerence.md` is 332 real rows with a real allocation, which means Phase 2 is built against a known input, not a guess.

### Build

**Configuration**

- [ ] `Template` rows for `courier_{category}` — **11 categories**, built from the **real hand-typed mails** collected in Phase 0, not invented
- [ ] `subject_live` set per template, `subject_tag = " [{CASE_REF}]"` (L1)
- [ ] `placeholders_required` extracted and verified per template
- [ ] `Item rule` per category (doc 6 §2.2), all `is_default = Yes` (L11)
- [ ] `cd_docpack` = `COURIER_{CATEGORY}`, `cd_docpackitem` from Workshop 1
- [ ] `cd_doclibrary` seeded with the courier fixed documents
- [ ] `cd_team` seeded with the 5 real desks; `value_class_scope` from the observed `Team` × `Class` cross-tab
- [ ] `cd_agentprofile` seeded with the **16 named people** plus the **2 pool rows** (`BOM`, `BOM CEP`, `is_pool = Yes`) — 18 `Agent` values total — doc 13 §2.2.1
- [ ] `Category map` seeded with the 11 categories and the `Master` → category bindings, incl. the `CI Missing` / `Missing CI` merge (C17)

**Flows**

| Flow | Deliverable |
|---|---|
| **F01b** | Pull intake against the real 22-column contract (doc 12 §2.10). **Consumes** `Team`/`Agent` as the division's own split; `CEP` → share rows |
| **F26** | Assignment engine. Writes the 267 owner rows from the sheet, the 84 share rows, and **queues the 65 pool rows**. Manual **Reassign** for any row, audited (L5) |
| **F28** | Pool resolution queue for the BOM desk lead. The **only** exit from `awaiting_pool_assign`. Blocks F05 |
| **F01c** | Agent uploads their share; **matches to existing cases, never creates duplicates** |
| **F08b** | `Master` authoritative; `reason_prefix` parsed; the 19 conflicts surfaced as **non-blocking warnings**, never auto-corrected (C17). Cargo rules later |
| **F03c** | Template selection, item creation, token, **fail-closed pre-flight** (C2). `checklist_suppressed` honoured |
| **F22** | Pack apply, pre-ticked |
| **F23** | Pack edit: untick, delete, add, upload, visibility — at AWB / selection / batch scope |
| **F05** | **The send engine**, all **six** gates including **Gate 0 — owner resolved, not a pool** (doc 12 §5.3) |
| **F10** | Portal intake: upload, tick items, confirm. Rejects non-PDF/DOCX and `.zip` (L12) |
| **F17** | Reminder sweeper, 15-min, max 3 reminders |
| **F20** | Link expiry |

**Screens**

- [ ] **Send → Courier** upload, with the row grid, the preview, the **gate column**, and `Send N now`
- [ ] **Pool queue** — 65 unowned rows with the BOM desk's agents and their current load. Not a full split screen: the other 267 rows already have an owner
- [ ] **Case detail** with the document tick-list, the `category_conflict` banner, and the shared-with list
- [ ] **Batch board**
- [ ] **Inbox** — read-only at this phase, showing unprocessed replies as raw rows
- [ ] **Portal**: the unified shipment page and the upload checklist

### Test script

Run this in full, in test mode, with the real BOM desk lead and a real agent in the room, **using the actual 332-row sheet**.

1. Clearance uploads the real 332-row pull sheet → 332 cases. All 22 headers validate; 3 eleven-digit AWBs raise `awb_length_warning` and still load; `31-Dec-99` raises `commit_date_is_sentinel`
2. **267 cases land with the division's named owner. 65 land in the pool queue.** The `Team` × `Agent` pivot on screen reconciles to the sheet's own pivot exactly
3. The 84 `CEP` values produce share rows and **none of them changed an owner**. Assert exactly **43** rows carry `cep_name_unresolved` — 6 of 21 names resolve, 15 do not (doc 13 §2.3.1). Confirm the system created **no** agent profile from a name
4. **19** cases show the `category_conflict` banner, and **not 173**. If the count is 173 the `Category map` equivalence seed is wrong and the warning is already useless (doc 8 C17)
5. The BOM desk lead assigns the 65 pool rows → 65 owner rows with `assigned_by`. **F05 Gate 0 clears on all 332**
6. An agent uploads their share → matched, 0 duplicates; one deliberately altered AWB → `Needs Attention`
7. The 118 rows with `EDI = CHECKLIST_SENT_E` / `CHECKLIST_SENT` send **without** a checklist request
8. F03c picks templates; all pass the pre-flight. One row seeded with a missing placeholder is blocked
9. F05 sends in test mode. Every mail: correct template, ` [{CD-000142}]` subject tag, static + `Standard Remarks` CC, **zero attachments** (L2)
10. A pooled case that was never resolved is attempted → **blocked by Gate 0**, not sent
11. A case whose `CEP` sharee is unresolved is attempted → **sends anyway**, with the warning recorded. A share is not a delivery precondition
12. F22 applies the pack, pre-ticked. The agent unticks one, deletes one, adds one from Library
13. A low-confidence row and a bad-email row both land in `needs_review` — **the screen names the failing gate**
14. The customer opens the link, sees their ask, uploads a PDF → the item ticks
15. The customer tries to upload a `.zip` → refused with a readable message
16. A reminder fires at T+4h listing only missing items
17. F19 shows no unexplained errors

### Gate

- [ ] **A real courier case went out with nobody typing the customer's mail.** A person on the team says so, unprompted.
- [ ] No case was sent with an unresolved placeholder
- [ ] No case was sent with an attachment (L2)
- [ ] **No case was sent while its owner was a desk pool** — Gate 0 held every time (C15)
- [ ] The 332-row sheet reconciles exactly: 267 named owners, 65 pool rows resolved, 84 share rows, 0 ownership changes from `CEP`
- [ ] **No agent profile was created from a name in a data cell.** 15 `CEP` names stayed unresolved (doc 13 §2.3.1) and a person, not the system, decided what happens to them
- [ ] No `category_conflict` was auto-corrected — all 19 were confirmed by a human, and the count was 19, not 173 (C17)
- [ ] No checklist was re-requested on the 118 already-sent rows
- [ ] The assignment history is reconstructable: who had what, when, and why it moved
- [ ] The BOM desk lead resolves the pool queue without being asked twice

---

## 6. Phase 3 — Cargo and documents

*The largest phase. ACCS, the pre-alert Excel, the fixed-document packs, the conversion pipeline, and the API.*

### Build

**Configuration**

- [ ] Cargo templates with the **real** `subject_live` values (doc 12 §5.1) — the historical formats, not new ones
- [ ] CC static lists exactly as they are today (C4) — Jeena 10, Sunimpex 2, NFBRK team
- [ ] Cargo packs seeded with the historical `.eml` sets (doc 10 §4)
- [ ] `cd_valuerule` seeded with **real thresholds once O12 is answered**
- [ ] `Item rule` per `End Result` + `InstructionCD` (doc 6 §2.1)

**Flows**

| Flow | Deliverable |
|---|---|
| **F01** | 27-column intake (doc 12 §2.9), row buckets, C8 surfaced, L4 amber rows |
| **F02** | ACCS enrichment, per-AWB, rate-limited |
| **F24** | **Bulk invoice retrieval — one call for the whole batch** (doc 7 §2), loose→strict→fuzzy matching, `match_strategy` logged |
| **F25** | TIFF/XLSX/DOC → PDF. Word Online first, Function App fallback. **Proven on the 5 real TIFFs** |
| **F03** | Build request, fee figures, fail-closed |
| **F06** | Arrival Notice PDF, pre and post arrival |
| **F27** | The Documents API, all 12 endpoints, one-run-per-bulk-call (doc 11 §3) |
| **F23** | Bulk pack edit at batch scope |

**Screens**

- [ ] Send → Cargo with the enrichment status buckets (doc 7 §3.2a) and the row grid
- [ ] The tick-list with **scope switching** — this AWB / selected / whole batch. This is the screen the user described: *"pre-ticked, they can edit, delete and add more"*
- [ ] The value-class confirmation strip for amber rows (L4)
- [ ] Batch board, case detail

### Test script

1. Upload a real 28-row pre-alert file → 28 cases, 27 columns validated
2. A renamed column → the file is rejected with the exact column named
3. `End Result = FEBRK` + blank `FedEx Broker` → **Needs Attention, not NFBRK** (C8)
4. A row with `Value` = 250,000 → amber, awaiting a human (L4)
5. A row with no `ConsigneeEmailID` → `No email` bucket, cannot be selected
6. F24 fetches all 28 invoices in **one** flow run; `cd_docbulkrequest` shows 1 run, 28 items, per-item `match_strategy`
7. A real TIFF invoice → PDF, readable, attached to the AWB's link
8. F22 applies the Jeena pack, 6 documents pre-ticked
9. The agent unticks bank details **for the whole batch** → 28 rows change, one `cd_docbulkrequest` row
10. A `.tif` is **absent** from the portal response; an `internal` document is **absent** from the portal response
11. The preview shows the Jeena subject with the case ref and no attachment line (C3)
12. F05 sends 24; CC matches the historical list exactly
13. `POST /batches/{batchId}/documents` for 28 AWBs returns **one** run id, not 28
14. A 30-AWB batch returns `202` + `requestId`; `GET /requests/{id}` reports progress

### Gate

- [ ] A real cargo batch went out to real consignees in test mode, with the correct subject, the correct CC, and zero attachments
- [ ] The 5 real TIFF invoices converted correctly
- [ ] The portal response provably excludes `internal` documents
- [ ] One bulk operation consumed one flow run

---

## 7. Phase 4 — Reply and AI

*Now the system listens back.*

### Build

| Flow | Deliverable |
|---|---|
| **F07** | Three mailbox triggers, one logic. The 5-rule matching ladder. **Conversation ID captured on inbound** (cargo-paf's bug not ported) |
| **F08** | Document Intelligence → Azure OpenAI extraction + classification → RAG retrieval. The JSON contract in doc 4 §2 |
| **F09** | Autonomy Levels 0–3, number verification, safety gates SG-01…SG-08 |
| **F17** | Full reminder sweeper with cutoffs, holidays, the midnight fee flip, call-task escalation |
| **F18** | Nightly learning loop. Approved/edited/rejected → Azure AI Search. Metrics per situation |

**Screens**

- [ ] **Inbox** — the AI-processed reply stream, with each reply's classification, confidence, and proposed action
- [ ] **Needs attention** — errors with one-click retry, `customer_impacted` first
- [ ] Case detail: reply thread, AI draft with per-sentence source

### Test

1. Ten real past replies, replayed → each classified correctly **or** routed to human review. No silent wrong action
2. A reply with an invoice that states a **different** value than the case → the draft is blocked to Level 3 with the conflict named
3. A hallucinated number in a draft → **blocked**. This is the one AI test that must never fail
4. A bounce → `Company.bounce_count` increments; 3 bounces → the agent must confirm before sending
5. An OOO → filtered, no case touched
6. A reply with no case ref, matched only by sender → flagged *check*, not auto-linked
7. Reminder 1 at T+4h, 2 at T+8h, 3 escalates to a call task. **A 4th never sends** (C10)
8. Kill switches: `autoSendEnabled = No` → everything queues. `aiEnabled = No` → templates only
9. A holiday cutoff: no reminders, tier frozen

### Gate

- [ ] Ten real replies, ten correct outcomes, zero unflagged wrong actions
- [ ] The number-verification test passes on every AI draft
- [ ] Autonomy level 2 is the pilot default. Levels 1 and 3 exist but level 1 stays **off**

---

## 8. Phase 5 — IGM, Admin, Finance

*Where the case actually closes.*

| Flow | Deliverable |
|---|---|
| **F04** | CONSOL ↔ UBOND merge, exact and "Unsure", MAWB + IGM written back |
| **F03b** | Post-arrival notice in the **same thread**, regenerated link content |
| **F11** | HV checklist approval, code-protected, OTP, code hash only |
| **F12** | UTR matching, 30-min poll, three-state outcome |
| **F13** | DO issued → DO and invoice pushed to the **link** (L2) |
| **F14** | CHA notified with a link, not a mail attachment |
| **F15** | Admin handoff, BOE filed / returned with a reason |
| **F16** | ICEGATE broadcast — manual trigger, one click, many cases |

**Screens:** IGM payments, Ready for ACCS, Admin handoff, DO payment page, post-arrival batch screen (doc 7 §3.2b).

### Gate

- [ ] A DO issued in the app appears on the customer's link, not in an email
- [ ] A payment matched, and a mismatch landed in *needs review with a reason*
- [ ] An Admin handoff completed, and the BOE marked filed
- [ ] The post-arrival notice went into the **same thread** as the pre-alert

---

## 9. Phase 6 — Supervisor and control

| Item | Detail |
|---|---|
| Supervisor dashboard | Queue by team, ageing, blocked counts, AI approval rates, the "no app activity in 24h" list (doc 1 §7 — agents replying from personal Outlook) |
| Config write access | Manager+ can now edit templates, items, fees, packs, holidays |
| Autonomy UI | Level 0–3 per situation, with the effective level shown on the case |
| Pack/Library manager | Upload, version, supersede, assign to packs |
| Learning review | Which situations the AI is good at, and which to keep at Level 2 |

### Gate

- [ ] A template can be changed by a Manager and the change is visible on the next case
- [ ] An autonomy change takes effect on the next case, and is logged

---

## 10. Phase 7 — Pilot

### Parallel run — 2 weeks, courier only

| Day | Activity |
|---|---|
| 1–3 | Real cases processed in the app **and** the old way. The old way is the control |
| 4–7 | Every case in the app. Old way on standby. Daily 15-min comparison |
| 8–10 | App only. Old way closed. Exceptions logged by hand |
| 11–14 | App only, no comparison. **If someone reaches for the old way, that is a finding** |

**Measured every day** (doc 5 §9.2, §10.3): cases sent, time from pull sheet to send, error rate, reminders sent, AI classification accuracy, and — the only metric that matters — **how many mails an agent still typed by hand.**

### Go-live gate — all must be true

**Operational**

- [ ] 2 weeks with no unexplained error in `Error log`
- [ ] Zero cases sent with an unresolved placeholder (C2)
- [ ] Zero internal documents exposed on a customer link
- [ ] `CD_TestMode` still on at this point, deliberately

**Content**

- [ ] Every live template approved by the team that owns it, with a name and a date
- [ ] Every pack verified against the historical `.eml` set by a person from that team
- [ ] C7 compliance answers in writing

**Control**

- [ ] Named owner for every asset in doc 14 §10.1
- [ ] The four kill switches tested in the last 7 days
- [ ] Service account ownership documented, with a deputy
- [ ] DLP policy confirmed active

**Support**

- [ ] Runbook published (doc 16 §4)
- [ ] Every pilot user trained, with attendance recorded
- [ ] A named person on call for day 1 of live traffic

### Rollback

Triggers — any one of these:

| Trigger | Action |
|---|---|
| A wrong mail reaches a customer | `CD_TestMode = Yes` immediately. The system goes inert within one run |
| Internal documents exposed | Tokens revoked (`F20` on demand), `CD_TestMode = Yes`, incident review |
| Error rate > 5% of cases for 2 consecutive days | Roll back to the manual process. The app is not the fallback target |
| A team refuses to use it | Fix the friction, do not force it. A parallel run is cheaper than a silent non-adoption |

**Rollback is a one-flag operation.** That is the point of putting `CD_TestMode` in Phase 1. The old process stays available for the duration of the pilot — the parallel run is what makes rollback possible at all.

---

## 11. Phase 8 — Scale

Only after the pilot is stable:

- [ ] Additional gateways as configuration (doc 14 §5.4)
- [ ] Additional divisions: CHA Portal, Customer Self-Service, Dock Appointment
- [ ] ACCS write-back, replacing the manual ACCS update screen (doc 1 §6, Phase 2)
- [ ] Autonomy Level 1 earned per situation, from measured approval rates
- [ ] Licence expansion beyond 12 users, on the pilot's evidence

---

## 12. Cross-phase risks

Extends doc 1 §7 with the risks this build sequence creates.

| Risk | Likelihood | Impact | Mitigation in this sequence |
|---|---|---|---|
| ACCS has no API | Medium | Medium | Phase 3 only. Phases 1–2 are unaffected. F02 reads a file if it must |
| AI misclassifies | Low–Med | Medium | Phase 4 is last, level 2 is the pilot default, level 1 never turns on without evidence |
| AI invents a number | Low | **High** | Number verification blocks the draft. Tested explicitly in Phase 4 and re-tested at the go-live gate |
| Agents keep using personal Outlook | Medium | Medium | The app is faster, not just compliant. The Supervisor screen surfaces cases with no app activity |
| Customers ignore the link | Medium | Low | F07 still matches mail replies. The link is the fast path, not the only path |
| Power Pages pricing denied | Medium | Medium | Phase 0 asks first. The portal degrades to a passcode link without blocking Phases 2–3 |
| Compliance C7 unresolved | Medium | **High** | The **only** item that blocks go-live. Escalated in Phase 0, not Phase 7 |
| A team declines to adopt | Medium | High | The pilot is courier-only, and the parallel run keeps the old process alive. Adoption is measured daily |
| Service account leaves | Low | **High** | Named owner + deputy (doc 14 §4.3), documented rebuild procedure (doc 14 §10.2) |
| Fixed documents go stale | **High** | High | `cd_doclibrary` is versioned. A superseding document is a Manager action with a date. **This is the most likely long-run failure** |

---

## 13. The one-line test

Every phase is judged against the sentence from doc 14 §9.5. If a phase makes that sentence *less* true, the phase is not finished, no matter how much was built.

> An agent signs in, sees only their division, uploads a sheet, and the system produces a correct, linked, document-carrying request — **without writing a single line of customer mail by hand.**
