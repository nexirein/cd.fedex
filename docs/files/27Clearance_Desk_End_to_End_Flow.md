# The End-to-End User Flow — What We Build Now, What Comes Later

**Prepared for:** Gateway Manager · Shobin
**Purpose:** the full cargo flow in plain terms, what gets built now, what the environment unlocks later, and the manual-work reduction each stage delivers.
**Status:** proposal. Nothing built yet.

---

## 1. What you got right

Your flow is correct and I should not have complicated it. Written out:

> Pre-alert send → fetch invoice via API, convert TIF to PDF → fixed docs go on the shared link, not in the mail → reply engine classifies → show which AWBs need a human and which AI handles.

**That is the whole product.** Everything else in the design docs is detail hanging off those five steps, not additional steps.

And you added the right correction: **IGM is in the flow.** I had been treating IGM as a downstream team to hand off to. That is wrong for a demo — IGM is where the money and the data are, and their step is the one that proves the loop closes. IGM is now a first-class actor in this design, not a recipient of a notification.

---

## 2. The flow, end to end

### The five steps

| # | Step | What happens | Who touches it |
|---|---|---|---|
| 1 | **Trace captures the AWB** | Agent types AWB once. Consignor, consignee, freight, clearance type pulled automatically | Trace |
| 2 | **Documents fetched and normalised** | System calls the API, gets the invoice as `.tif`, converts to PDF, adds the fixed docs. Nothing attaches to the email — all of it sits behind the customer's link | System |
| 3 | **Pre-alert sent** | One link in the email. Customer opens it, sees their AWB, their invoice, the fixed docs, and the documents they owe | System → Customer |
| 4 | **Customer submits; IGM confirms** | Customer uploads their documents on the link. **IGM confirms payment and raises the DO.** Both land on the same AWB | Customer, IGM |
| 5 | **System classifies and shows the board** | Every reply is classified. Two lists on one screen: **AI handles** and **needs a human** | System |

**The link replaces every attachment.** That was already a locked decision (L2) and your instinct matches it. The mail is now short: a link, a due date, a fee. The heavy documents live on the link where the customer can see exactly what is outstanding.

### Where IGM fits

This is the correction. IGM is not "notified later" — IGM is in step 4, on the same AWB record:

| IGM action | What it changes | Why it matters for the demo |
|---|---|---|
| Raise the **MAWB / IGM** | IGM state on the AWB becomes *generated* | Proves the handoff, without a phone call |
| **Verify payment** against the UTR | Payment state becomes *confirmed* | This is the money step. Showing it verified is the single strongest moment in the demo |
| **Issue the DO** | AWB state becomes *released* | The terminal output. The process is complete |
| **Not found** after the UTR check | IGM state becomes *needs review*, with a reason | Shows the exception path is real, not assumed |

**The demo audience should see IGM confirming a payment and the shipment releasing.** That is the moment a GCC developer stops thinking "form demo" and starts thinking "system." Everything else is supporting.

---

## 3. The board — the one screen that matters

Your point about "showcase what AWBs they need to work and what AI handles" is the heart of it. One screen, two columns:

| **AI handles** | **Needs a human** |
|---|---|
| Document received — auto-acknowledged | Invoice value mismatch |
| Payment UTR matched — auto-confirmed | UTR not found after check |
| Status query — auto-answered from the AWB | Broker needs a document the customer did not send |
| Out-of-office / auto-responder — silently absorbed | Customer dispute |
| Duplicate submission — absorbed | SLA breached, no customer response |
| Fee query — answered from the fee table | Any message the system is under 85% confident on |

Every row on the right: **the AWB, the reason, who owns it, how long it has waited.** No AI guessing in the background. Anything under the confidence threshold goes to a person, and the audit trail says why.

**The 85% threshold is the safety mechanism, and it should be said out loud in the demo.** "We automate the clear cases and escalate anything the model is not sure about" is the sentence that gets this approved for real use.

**This exact model is already built and working** in `cargo-paf` — three paths, auto-send / draft-for-human / escalate, with the audit entry. It is not a proposal. It is a port.

---

## 4. What we build NOW

**Two weeks. Demo only. Synthetic data. Trial environment — does not need the FedEx tenant.**

| # | Build | Why it is in now |
|---|---|---|
| 1 | **Trace input screen** — AWB, type, freight | The manual step that disappears |
| 2 | **Document fetch + TIF→PDF** | Ported from `cargo-paf`. ~200 lines, already written |
| 3 | **Customer link** — invoice, fixed docs, upload | Step 3. Where the attachments went |
| 4 | **IGM panel** — MAWB/IGM, payment, DO | **Added per your correction.** The money step |
| 5 | **The two-column board** | Your point. AI vs human |
| 6 | **Three-path classifier** | Already built. Auto-send / draft / escalate |
| 7 | **Event history per AWB** | Every state change, one screen. This is the asset |

**Deliberately out of now:** real data, real email to customers, the 34-table schema, Azure AI services, bank feed integration, courier flow, mobile app.

### The honest framing

Call it what it is: **a working slice of the real process, on the real platform, with synthetic data.** Not a prototype, not a mock-up. The flows are the production flows. The data is invented.

That is defensible to GCC, and it is a far better story than a polished UI that does nothing.

---

## 5. What the ENVIRONMENT unlocks

This is Shobin's point and it is correct. Here is exactly what changes.

### Stage 1 — Demo, no tenant access. **Manual work: 100% → 20%**

| Working now | Why |
|---|---|
| Trace types an AWB once instead of building an email by hand | The single biggest time sink, removed |
| Invoice auto-fetched and converted | No download, rename, convert, attach |
| Documents on the link, not in the mail | No attachment handling at all |
| Reply classified before a human sees it | 60%+ of routine replies absorbed |
| IGM state visible on the same AWB | No chasing, no phone calls |
| DO issuance tracked | No spreadsheet reconciliation |

**20% is what is left**: genuine exceptions, judgement calls, escalations, and the IGM human confirmation that should never be automated away.

### Stage 2 — With the FedEx environment. **Manual work: 20% → 5%**

| Unlocked by the environment | Manual work removed |
|---|---|
| **Real ACCS API write-back** | Trace stops keying the same data twice. **This is the single biggest remaining chunk** |
| **Bank statement feed** | UTR matching becomes automatic every 30 min. IGM stops opening individual mails — today that is 100% manual, per the PRD |
| **Production email with send-as-agent** | Real sends, replies routed to team mailboxes |
| **Real Power Pages customer portal** | Same flow, production-grade, publicly reachable |
| **Data across teams in one place** | Trace, IGM and CHA stop reconciling separate copies |
| **Full 34-table schema** | Courier joins the same system; no second build |
| **Azure AI services** | Classification improves from rules to document understanding. The 85% gate gets smarter |
| **Compliance sign-off** | The only thing that can never be automated, and the only thing that must be human |

**5% is irreducible.** Someone must judge the exceptions, and Compliance must sign the wording. A system claiming 0% manual work in customs clearance is a system nobody will trust.

### The pitch, in one line

> **The flows do not change between the two stages. The environment changes what they connect to.** That is why the demo is worth building — it is not throwaway, it is the same logic running against smaller data.

---

## 6. What we show, in order

| # | Show | The point |
|---|---|---|
| 1 | **Trace types one AWB** | The manual step gone |
| 2 | **Link opens** — invoice converted, fixed docs listed, nothing attached | Attachments replaced, as decided |
| 3 | **Customer uploads** their document | The external half works |
| 4 | **IGM confirms payment, DO issues, shipment releases** | **The loop closes. The money and the data.** Lead with this if time is short |
| 5 | **The two-column board** — 14 auto, 3 waiting on a human | The reduction is visible, not claimed |
| 6 | **A deliberately broken case** | Missing invoice, unmatched UTR, unassigned broker. Credibility moment |
| 7 | **Event history on one AWB** | A process model, not a mailer |

**Item 4 is the new addition and it is the strongest.** A GCC audience does not need to see the input form. They need to see a payment verified and a shipment released, then a human looking at exactly three things.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| Real data appears in a demo | Synthetic only. Also lets us demo broken cases |
| IGM panel too shallow | Show payment verify → DO issue, not just a status field. If it is only a status, it proves nothing |
| "The board looks like a filter" | Show the **reason** and **confidence score** per row. That is the substance |
| Trial environment too slow | 30 synthetic shipments, not 500. Fast on a demo laptop |
| Tenant access delayed | Demo does not depend on it. Stage 1 still lands |
| Overclaiming | State plainly: synthetic data, demo scope, production needs Compliance |

---

## 8. Decisions needed

| # | Decision | Recommendation |
|---|---|---|
| 1 | **IGM in the demo scope?** | **Yes** — payment verify and DO issue. It is the strongest moment |
| 2 | **SharePoint or Dataverse?** | **Dataverse.** SharePoint cannot do per-customer isolation, so the customer link breaks |
| 3 | **Synthetic data only?** | **Yes** |
| 4 | **Trial environment OK for now?** | **Yes.** Does not need the tenant |
| 5 | **Two weeks acceptable?** | First checkpoint end of week 1 |
| 6 | **Frame it as 100→20 now, 20→5 later?** | **Yes.** Shobin's numbers, with the reason each stage moves |

---

## 9. The ask

1. **Confirm IGM is in scope** — payment verification and DO issuance, not just a notification
2. **Approve Dataverse over SharePoint**, or accept the customer link coming out
3. **Confirm synthetic data only**
4. **Confirm the two-stage framing** — 20% manual after the demo, 5% once the environment and bank feed land

**Contact:** Bipul Sikder · Trace / Clearance Desk
