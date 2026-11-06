# 22 — Power Pages Specification: The One Link

**Every number on this page is traced to a source file. Nothing is invented.**
**Status:** spec, ready to build once the environment is connected. Legal lines marked **HELD** are not final.

---

## 1. What the customer sees

One token-protected page per AWB. Same page for courier and cargo; the panels that don't apply are hidden.

```
┌──────────────────────────────────────────────────────────────┐
│  FedEx  ·  Your shipment                                      │
│                                                              │
│  AWB 872150525885      Delhi · Cargo      ● Arrived           │
│  Consignee: Acme Pharma Ltd                                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ● WHAT WE NEED FROM YOU                                     │
│                                                              │
│    Commercial invoice                        [ Upload ]      │
│    End-use statement                         [ Upload ]      │
│    KYC documents                             [ Upload ]      │
│                                                              │
│  ● PAYMENT                                                    │
│                                                              │
│    Delivery Order charges      INR 4,248      [ Pay now ]     │
│    Bank details                                      ▾        │
│    UTR / IMPS reference          [____________]  [ Submit ]    │
│                                                              │
│  ● FROM FEDEX                                                 │
│                                                              │
│    Post-arrival notice         19 Jul 2026      [ View ]       │
│    Duty assessment             20 Jul 2026      [ View ]       │
│    Delivery Order              —                 [ Pending ]    │
│                                                              │
│  ● WHO IS CLEARING THIS                                       │
│                                                              │
│    Jeena & Co.  (nominated broker)          ▾ Change         │
│                                                              │
│  ● STATUS                                                     │
│                                                              │
│    ●─ Arrived 19 Jul ──●─ IGM filed 20 Jul ──○─ BOE pending     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Seven panels *(FR-05)*: needs-from-you · payment · from-FedEx · broker choice · status timeline · today's computed fee · documents.

**Why one page.** Today the customer receives up to 7 near-identical mails with hand-edited fee tables and no way to tell what is still outstanding (PRD §1). Six of the 11 cargo templates exist only to tell them something this page shows.

---

## 2. Money — every figure, with its source

### 2.1 Delivery Order charges — authoritative

Rebuilt from the one intact table in the source set (`script for IGM send/mail.md:88-118`). All four fee-bearing templates were repaired from this.

| | Day of arrival | Next day onwards |
|---|---|---|
| DO charges | 2,600 | 3,600 |
| Admin fee | 0 | 1,000 |
| GST (18%) | 468 | 648 |
| **Total** | **INR 3,068** | **INR 4,248** |

**Arithmetic verified:** 2,600 × 1.18 = 3,068 · 3,600 × 1.18 = 4,248. Both reconcile against the source.

| Fact | Source |
|---|---|
| DO tariff effective 6 Jan 2025 | `nfbrk.md:40` · `1st day reminder:34` · `2nd day:9` |
| Admin fee effective 22 Nov 2023 — INR 1,000 + 18% GST if not collected on arrival day | `nfbrk.md:46` · `IGM script:122` |
| Do not pay before IGM is filed | both FEBRK files |

**The ₹1,180 figure.** Several templates quote "₹1,180 admin fee". That is **the difference** between the two totals (4,248 − 3,068 = 1,180), not a separate fee. It is a derived number and must be computed, never stored.

### 2.2 Cargo clearance charges — Kolkata route

| Particulars | Basis | Amount | Source |
|---|---|---|---|
| Customs clearance | Fixed | **INR 3,000 + GST**, effective 5 Jan 2026 | `cargo arrival mail template` |
| Customs duty | Actual receipt | As assessed | same |
| AAI / warehouse | Actual receipt | As per actual | same |
| EDI charges | As notified | As notified | same |
| Duty advancement fee | **⚠️ DISPUTED** | See 2.3 | — |
| Service tax / GST | Applicable rates | **GST** | both FEBRK — see 2.4 |

### 2.3 ⚠️ Duty advancement fee — unresolved, and it is a billing decision

| Route | Basis | Source |
|---|---|---|
| Kolkata | 2% of **duty + EDI** or INR 800, whichever is higher | `cargo arrival mail template` |
| Delhi FEBRK | 2% of **invoice** or INR 800, whichever is higher | `febrk-Jeena.md:67` · `febrk-sunimpex.md:67` |

2% of *invoice* on a cargo consignment is many multiples of 2% of *duty*. **I have not chosen.** The page must not display a duty-advancement figure until this is settled by Commercial.

**Interim behaviour:** show the INR 800 floor only, labelled *"or as calculated on the assessed basis — to be confirmed."* Never show a computed percentage.

### 2.4 Service tax → GST

Both FEBRK files say *"Service Tax: As per applicable rates"* (lines 62 / 64). Service tax was subsumed by GST in July 2017; every other line in every other template says GST.

**Changed to GST.** If a pre-2017 rate is genuinely being applied, that is a separate billing question.

### 2.5 Bank details

Verbatim from `script for IGM send/mail.md:132-164`. **Portal only — never in a mail** (locked decision, L2 sibling of the attachment rule).

| Particulars | Details |
|---|---|
| Company | FedEx Express Transportation & Supply Chain Services (India) Pvt. Ltd. |
| Address | Boomerang, Unit No. 801, Wings A & B1, 8th Floor, Chandivali Farm Road, Near Chandivali Studio, Andheri (E), Mumbai – 400072 |
| Bank | Bank of America |
| Branch | A Wing, One BKC, G Block, Bandra Kurla Complex, Bandra (East), Mumbai 400051 |
| Account | 72790060 |
| Type | Current |
| IFSC | BOFA0MM6205 |
| MICR | 400032002 |

---

## 3. Regulatory content — HELD, shown but not final

### 3.1 Late Bill of Entry filing penalty

| Station | Penalty | Source |
|---|---|---|
| **Delhi** | INR 5,000/day days 1–3 · INR 10,000/day from day 4 | `nfbrk.md:52-54` · `pre alert:52-54` · both FEBRK |
| **Kolkata** | INR 5,000/day **from day 2** · INR 10,000/day from day 5 | `cargo arrival mail template` |

**B3-2 — held.** Delhi wording is locked (C18). Kolkata disagrees and we cannot tell whether that is a genuine policy difference or a copy error.

### 3.2 Customs citation — HELD

Source says **Notification no. 34/2021 dated 29-03-2021**. The template folder contains `Circular-No-08-2021.pdf`. One is the authority; the mail cites the other.

**B3-1 — held.** The page shows the penalty *amounts* (they are stable) and withholds the instrument *name* until Compliance confirms. Citing the wrong instrument in a customer-facing penalty notice is not a documentation decision.

### 3.3 Document deadlines — four different values, HELD

| Value | Where |
|---|---|
| 3 hours | `nfbrk.md:96` · `pre alert:56` · both FEBRK |
| 16:30 | `cargo arrival mail template:57` |
| 14:30 hrs | same file, 68–70 |
| 18:00 | both FEBRK — *"office closes at 6:00 pm"* |

**B3-3 — held.** The reminder engine needs one number per gateway. Config key `deadline.<gateway>.<process>`; no default, because a wrong default silently manufactures penalties.

---

## 4. The blocked field — `PIECES`

**Status: BLOCKED. Do not display a piece count until verified.**

The arrival notice prints `PIECES` commercially. The courier sheet's only candidate is `MPS` (332/332 populated, values 1–27, `1` on 245 rows).

**`MPS` is not proven.** `arrivalNotice.js:112` distinguishes `Pcs` from `Pcs code`:

```js
if (c === 'T') return 'T (All Pieces Arrived)'
if (c === 'P') return 'P (Partially Arrived)'
```

The courier sheet has **neither** column, so `MPS` matches neither.

**The test — one AWB, two minutes:** open a row where `MPS = 27` in ACCS. If it shows 27 pieces, `MPS` is the piece count. If it shows 1, `MPS` is something else and a real ACCS field is needed.

**Interim behaviour:** the page omits the piece count and shows Pcs code status only:

| Pcs code | Meaning |
|---|---|
| `T` | All pieces arrived |
| `P` | Partially arrived |

**No customer-facing piece count changes on inference.**

---

## 5. The three access levels

| Who | What they see | Mechanism | Expiry |
|---|---|---|---|
| **Customer** | Their AWB: status, FedEx documents, upload boxes, payment, fee | Token link | **7 days**, config per gateway |
| **CHA** | BOE packet for that AWB, once the checklist is complete | Token link | **Per filing** — released when "BOE filed" is recorded |
| **IGM team** | MAWB, IGM no, flight, weight, PIECES, payment queue | **Dataverse table — no link** | n/a |

### 5.1 IGM deliberately has no link

An IGM is a **live record that customs amends without notice**. A link is a one-shot fetch against a static file — it would be wrong within the hour with no way to know it had changed. It lives in a table with an audit trail, which is what `FR-17` and the §4 metrics require.

**The IGM team never sees a customer link, and the customer never sees the IGM record.**

### 5.2 Security rules

| Rule | Requirement | Source |
|---|---|---|
| Token on every link | Non-negotiable | NFR-03 |
| Configurable expiry | Per gateway | NFR-03 |
| One-time code | KYC, checklist approval | NFR-03 |
| No cross-AWB visibility | A customer can never see another AWB | NFR-03 |
| Tenant residency | All data in FedEx's tenant; AI on FedEx's own Azure subscription | NFR-04 |
| Broker link is a third party | Shortest workable expiry | NFR-03 |

---

## 6. The 6 events that trigger a mail

One link. Six notifications. Each says *"something changed — open your page."* None restates the content.

| # | Event | Template | Trigger |
|---|---|---|---|
| 1 | **Pre-alert** | `cargo/01` `02` `10` `11` | UBOND data available, pre-arrival |
| 2 | **Arrival notice** | `cargo/03` `04` | CONSOL ↔ UBOND merge matched (FR-11) |
| 3 | **Payment ask** | `cargo/05` | Documents complete, payment outstanding |
| 4 | **Reminder** | `cargo/06` `07` | 4h / 8h / 24h, **only what is still missing** (FR-10) |
| 5 | **DO ready** | `cargo/08` | Payment confirmed, DO issued (FR-14) |
| 6 | **ICEGATE delay** | `cargo/08` | IGM blocked — customer needs the portal URL |

**Event 6 is why IGM still matters to the customer.** When ICEGATE is down the IGM cannot be generated, the BOE cannot be filed, and the customer is blocked. The page keeps showing current status, which is the one thing a link does better than a mail.

### 6.1 Courier events

| # | Event | Shape |
|---|---|---|
| 1 | Document request | A |
| 2 | Reminder | A |
| 3 | Confirmation request | B |
| 4 | Filed confirmation | — |

**Courier has no payment panel and no broker panel** (doc 20 §2). The same page, two configurations.

---

## 7. What the page must never show

| Never | Why |
|---|---|
| Any piece count, until `MPS` is verified | §4 — commercial and regulatory |
| Bank details in a mail body | §2.5 — portal only |
| A named FedEx individual | A-2 — the desk name is the contact |
| A clearance or delivery **date** promise | The desk cannot commit to it |
| The IGM record to a customer | §5.1 |
| Another AWB's data | NFR-03 |
| A duty-advancement percentage | §2.3 — disputed basis |
| The customs instrument name | §3.2 — B3-1 held |

---

## 8. Build order

Nothing here needs the blocked items. Build in this order:

| Step | Needs | Blocked? |
|---|---|---|
| 1. Page shell + token auth | Environment access | Environment |
| 2. Status timeline | `Case`, `Shipment phase` | No |
| 3. Needs-from-you + upload | `Item`, `Case item` | No |
| 4. From-FedEx documents | SharePoint + `Document` | No |
| 5. Payment panel | `Fee rule`, `Payment`, `UTR` | No |
| 6. Broker panel | `Broker`, `Case broker` | No |
| 7. Six mail events | Flow F05 | **Doc 18 sign-off** |
| 8. CHA link | `Case` + expiry | Doc 18 |
| 9. Piece count | `MPS` verification | **§4** |
| 10. Penalty block + citation | Compliance | **B3-1, B3-2** |
| 11. Reminder deadlines | Compliance | **B3-3** |
| 12. Duty advancement calc | Commercial | **§2.3** |

**Steps 1–6 are unblocked** and are the entire customer experience. Steps 9–12 are four specific answers from four specific people.

---

## 9. Open items

| # | Item | Owner | Blocks |
|---|---|---|---|
| 1 | `MPS` = pieces? one AWB check | Courier lead | §4, step 9 |
| 2 | Customs citation — 34/2021 or 08/2021 | Compliance | §3.2, step 10 |
| 3 | Kolkata penalty from day 1 or day 2 | Compliance | §3.1, step 10 |
| 4 | Document deadline per gateway | Compliance | §3.3, step 11 |
| 5 | Duty advancement basis | Commercial | §2.3, step 12 |
| 6 | Link expiry per gateway | You | §5 |
| 7 | `FR-12` — alert on 1st miss, or shorten 90-min silence | You | §6, payment |
| 8 | UTR, if no ACCS/ICEGATE API | FedEx IT | Steps 1–6 degrade |
