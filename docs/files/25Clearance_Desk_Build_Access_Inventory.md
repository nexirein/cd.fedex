# Build-Phase Access Inventory — Clearance Desk

**Prepared for:** Bipul Sikder · Trace / Clearance Desk
**Purpose:** one list of every access item required to **build** the application, separated from what is only needed to **run** it in production.
**Status:** 4 of 14 block building today. The rest are not blocking.

---

## 1. The short answer

Building this needs **four things** and nothing else:

| # | Access | Blocks building? | Who |
|---|---|---|---|
| 1 | A non-production Dataverse environment | **YES** | Power Platform admin |
| 2 | Schema-write ability in it (MCP, or solution import) | **YES** | Power Platform admin |
| 3 | Dataverse read access to the existing 9 tables | **YES** | Dataverse admin |
| 4 | The two source data exports | **YES** | Business, not IT |

**Everything in §4 and §5 can wait.** Licences, Power Pages, Managed Environment, send-as rights, Compliance sign-off, bank feed — none of those are needed to build. They are needed to go live.

**I never need:** a password, a client secret, a connection string, or a licence to code. Every item below is granted to you, not to me, and applied by an admin.

---

## 2. Blocking items

### 2.1 Non-production Dataverse environment

**Why:** every artifact this project produces is schema. Tables, columns, relationships, choice sets, indexes. Schema cannot be designed, tested, or reviewed without somewhere to put it.

**Current state:** blocked by tenant policy. `MyFedEx (Upgrade)` is a trial environment and is not a safe iteration target.

**Request:** Sandbox, India, Dataverse database, no PAYG, restricted to the pilot group.
Full justification in `24Clearance_Desk_Manager_Access_Request.md` §3.

**Note:** a Sandbox is short-lived by design. It is enough to build and demonstrate. A Managed Environment is required before the pilot, not before the build.

---

### 2.2 Schema-write ability

**Why:** 34 tables, each with dozens of decisions on column types, choice values, relationships and indexes. Built by hand in a browser, a single mistake surfaces only after dependent work already sits on top of it.

Two acceptable routes:

| Route | What the admin does | Extra permissions |
|---|---|---|
| **A — Dataverse MCP** *(preferred)* | Enable the feature, allowlist one Microsoft app, grant tenant consent | Requests 2 and 3 in doc 24 |
| **B — Solution import** | Import a `.sln` I produce | None beyond existing Dataverse admin |

**Route B always works.** If MCP is unavailable in the India region, or InfoSec declines it, the project continues at a slower pace with no additional permission. This is not a hard dependency.

---

### 2.3 Read access to the existing 9 tables

**Why:** the schema is an **extension**, not a replacement. `Case`, `Document`, `Template`, `Company`, `Contact`, `Mail message`, `Required item`, `Error log` and `Batch` already exist and hold live data.

I need **read** to:

- map the new columns onto real existing data before changing anything
- honour the eight contracts in doc 13 §5 — placeholder (C2), subject (L1), clearance path (C6/C8), document visibility (L2), format (L12), assignment (L5), idempotency, AWB length (D7)
- confirm the two case types (courier / cargo) are distinguishable in the data as designed

**Write is not required to build.** Structural changes are applied in a sandbox, reviewed, and only then scheduled for the target environment.

**Needed:** the **System Customizer** security role. Not System Administrator — it grants read, create and modify on schema only.

---

### 2.4 The two source exports

**Why:** the application's real behaviour is defined by real data, and neither file has been loaded into any environment yet.

| File | What it gives | Why the build needs it |
|---|---|---|
| `courier_pull_from_clerence.md` | 332 rows, 22 columns | Validates the 11 category configs, the 82-value `Reason` map, the 118 bare-`RBOE` enrichment path and the 15 unresolved CEP names against live-shaped data |
| Cargo source set, 10 files | Fee tables, deadlines, notice text | Validates the 11 rewritten templates, the INR 3,068 / 4,248 fee logic and the 3 reminder variants |

**Owner:** business. Not IT. These already exist as documents.

**Not required:** the 332 real rows need not go into a sandbox. Generated dummy rows with the same column shape prove the schema works. Real data is needed for the pilot, not the build.

---

## 3. What I can start on today, without any access

| Work | Depends on | Can start? |
|---|---|---|
| 34-table schema files, version-controlled | none | **Yes** |
| Choice-set definitions and seeded values | none | **Yes** |
| Full 82-entry `Reason` normalisation lookup | none | **Yes** |
| 11 rewritten cargo templates | none | **Yes — in draft** |
| 2 courier mail shapes | none | **Yes — in draft** |
| Brand theme | none | **Yes — done** |
| Import/validation scripts | none | **Yes** |
| Solution `.sln` for route B | none | **Yes** |
| Applying any of the above to an environment | §2.1, §2.2 | No |
| Verifying the schema reads back correctly | §2.1, §2.2 | No |
| End-to-end test against real rows | §2.1, §2.3 | No |

**Roughly two-thirds of the remaining build can proceed as files today.** What stops is applying and verifying them.

---

## 4. Needed to run it, not to build it

None of these block development. Listed so the full dependency picture exists in one place.

| # | Item | Count | Why | Blocking now? |
|---|---|---|---|---|
| 4.1 | **Managed Environment** (`cleardesk-prod`) | 1 | Required for production Power Automate flows and DLP policy. Sandbox is not permitted for production | No |
| 4.2 | **Power Apps Premium** | ~56 | Trace 48 + IGM 8 | No |
| 4.3 | **Power Automate Premium** | 1 + per-user | Approvals, Office 365 Outlook connector | No |
| 4.4 | **Power Pages** | 1 | External customer portal | No |
| 4.5 | **Environment Maker** role | project members | So the team can build and iterate without me | No |
| 4.6 | **Power Platform Administrator** | 1 named sponsor | Ownership after handover | No |
| 4.7 | Exchange send-as-agent + Reply-To | policy | Mail from the agent's address, replies to a team mailbox | No |
| 4.8 | Test mailbox | 1 | `CD_TestRecipient` — validate sends without customer contact | No |
| 4.9 | InfoSec review: external uploads | review | Customer document upload in Power Pages | No |
| 4.10 | **Compliance sign-off** | sign-off | Fee, cutoff and BOE penalty wording. **Cannot go live without it** | No |
| 4.11 | Bank statement feed | Finance | Without it payment verification stays manual | No |
| 4.12 | ACCS `MPS` spot-check | ~2 min | Unblocks `PIECES` on 3 cargo templates | No |
| 4.13 | Duty-fee basis decision | commercial | 2% invoice vs 2% duty + EDI | No |
| 4.14 | `FR-12` silence decision | product | 90-minute payment-not-found escalation | No |

---

## 5. Integration connections — not Power Platform licences

These are **separate Azure and Microsoft subscriptions**, not Power Platform licensing. They are called out separately because they are the easiest line item to miss and the most likely to stall a go-live.

| Connection | Subscription | Used for |
|---|---|---|
| Office 365 Outlook | M365 | Sending requests, reminders, holds |
| SharePoint / OneDrive | M365 | Document storage and the customer upload target |
| Dataverse | Power Platform | System of record |
| **Azure OpenAI** | **Azure** | Document classification, L6 confidence gate at 0.85 |
| **Azure AI Search** | **Azure** | Document retrieval and RAG over the document library |
| **Azure AI Document Intelligence** | **Azure** | Pre-alert and IGM document parsing |
| HTTP with Azure AD | Entra | Documents API authentication |

**Note:** the last four are **Azure** subscriptions with their own cost approvals, separate from the Power Platform request in doc 24. If they are not available, the application still builds and runs — classification falls back to manual agent selection, and the confidence gate holds at 100% human confirmation. Flagged so nobody is surprised at go-live.

---

## 6. The single request to send

`24Clearance_Desk_Manager_Access_Request.md` covers items **2.1** and **2.2** in full, with justification, security answers and a fallback.

Two items are **not** in that document because they are not permissions problems:

| Item | Ask |
|---|---|
| §2.3 System Customizer role | Add to the same request. One line, no admin consent needed |
| §2.4 source exports | Business already holds both files. No action needed if they are shared with me |

So the total ask to IT is **three permission items**, and one of them has a fallback that needs no permission at all.

---

## 7. Access register

To be completed as each item is granted. Keeping this current is what stops scope drift later.

| Item | Ref | Granted by | Date | Verified |
|---|---|---|---|---|
| Non-prod Dataverse environment | §2.1 | | | |
| MCP enabled / route B confirmed | §2.2 | | | |
| System Customizer role | §2.3 | | | |
| Source exports shared | §2.4 | | | |
| Tenant admin consent | doc 24 §5 | | | |
| Managed Environment | §4.1 | | | |
| Power Apps Premium × 56 | §4.2 | | | |
| Power Automate Premium | §4.3 | | | |
| Power Pages | §4.4 | | | |
| Test mailbox | §4.8 | | | |
| Compliance sign-off | §4.10 | | | |
| Azure OpenAI / AI Search / Doc Intelligence | §5 | | | |

**Contact:** Bipul Sikder · Trace / Clearance Desk
