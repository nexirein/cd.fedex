# Clearance Desk — Access, Identity and Provisioning

*Everything that must be granted before the first line of the system is built, plus the exact runbook for adding and removing people.*

*Expands doc 5 §2.1 and doc 5 §2.4. Implements decisions **L9** (AAD + in-app profile) and **L4**.*

---

## 1. How to use this document

Three audiences:

| Audience | Read | Why |
|---|---|---|
| **FedEx IT** | §2 (the request pack), §7 (service account), §8 (licensing) | Everything they need to grant, in the order they should grant it |
| **The build team** | §3, §4, §5, §6, §9 | Identity, roles, provisioning, secrets, verification |
| **Team Leads / Managers / Admin** | §5 (provisioning), §10 (leavers) | Adding and removing their own people |

**Nothing in §2 needs a technical decision from us.** It is a list of things that either exist or are granted by IT. The only place we need a judgement is §8 (licence cost) and §4 (who is in which AAD group).

> **Order matters.** SharePoint and the mailboxes come first (weeks 1–2 lead time). The Power Platform environment can be created in a day. Azure OpenAI can take a week if InfoSec review is required (O8). Request the slow things on day 1.

---

## 2. Access request pack

Copy this whole section into the IT ticket. Tick boxes as they are granted.

### 2.1 Microsoft 365 and Exchange

- [ ] **Team mailboxes** created (doc 5 §2.1):
  - `trace.courier.del@fedex.com` — Courier Trace
  - `trace.cargo.del@fedex.com` — Cargo Trace
  - `deldo.del@fedex.com` — DO / IGM (confirm whether the existing `deldo@` is reused — **O10**)
- [ ] Each mailbox has a **full access** grant for the build service account
- [ ] Each mailbox has an **inbound rule** forwarding/redirecting to a single monitored folder or a shared inbox that F07 can read (doc 5 §1 Q8 — *is internal auto-forwarding allowed?*)
- [ ] **Send on behalf of** `trace.courier.del@`, `trace.cargo.del@`, `deldo.del@` for the **build service account**, and **send-as** for the pilot agents
- [ ] **SmtpClientAuthentication** disabled for the tenant, or explicitly approved for the service account (the send path uses Graph, not SMTP — see §7.2)
- [ ] **Microsoft 365 group** `Clearance Desk – DEL` created, with the three mailboxes as members
- [ ] Agents can **set `Reply-To`** on outbound mail (doc 5 §1 Q7 — *can agents send with Reply-To set to a different address?*). If no, F05 falls back to sending from the team mailbox and the ownership model in doc 9 must be revisited.

### 2.2 Power Platform

- [ ] **Two environments**: `ClearanceDesk-DEV` and `ClearanceDesk-PILOT`
- [ ] **Environment type**: Production for both, so managed identities and Dataverse access policies apply identically. DEV is a *smaller capacity*, not a different type
- [ ] The build service account is **System Administrator** in both environments
- [ ] **Power Apps Premium** licence for the service account (it must own the flows, not the person who built them)
- [ ] **Power Apps Premium** for the 12 pilot users (doc 5 §2.1 — one courier sub-team + IGM):
  - 1 Team Lead (CD), 5 Agents, 1 Supervisor, 3 IGM, 1 Admin, 1 Manager
- [ ] **Power Automate Premium** if any flow uses a premium connector (Dataverse + Office 365 + HTTP are all standard; Document Intelligence / AI Builder are not)
- [ ] **DLP policy** created for the new environments:
  - `CD_Allowed` — Dataverse (business), Office 365 Outlook, Office 365 SharePoint, HTTP with Azure AD
  - `CD_Blocked` — all other connectors
  - **One rule, default deny.** This is the single most important IT control in the project: it stops a flow from being repointed at a personal account
- [ ] Environment **administration** enabled for the tenant, so `cd_profile_request` and the People screen can assign security roles
- [ ] **Solution** `ClearanceDesk` created in both environments (unmanaged in DEV, managed in PILOT once it stabilises)

### 2.3 SharePoint

One site, four libraries. **The library names are the contract — F24 and F25 read them by path.**

- [ ] Site **`ClearanceDesk-DEL`** with libraries:

| Library | Purpose | Who writes | Who reads |
|---|---|---|---|
| `Inputs` | Drop zone for the pre-alert Excel, pull sheets, CONSOL, IGM sheets | Agents, IGM | Flows, Admin |
| `AWB` | `/AWB/{awb}/FedEx`, `/AWB/{awb}/Customer`, `/AWB/{awb}/CHA`, `/AWB/{awb}/Internal` | Flows | Per `Document.visibility` |
| `Customer` | The customer's own upload root | Customers (via Power Pages) | Flows |
| `Templates` | Word/HTML mail templates, the Arrival Notice master, the fixed-document Library files | Manager+ | Flows |
| `Finance` | Daily bank statement drop (O6) | Finance | F12 |
| `Archive` | Closed cases, 90-day sweep | Flows | Admin |

- [ ] Service account has **Full Control** on the site
- [ ] Agents get **Edit** on `Inputs`; **Read** on `Templates`
- [ ] **Guest access / anonymous links: disabled.** All customer access goes through Power Pages tokens, never a SharePoint link (doc 10 §9, L2)
- [ ] **Versioning on** for `Templates` and `AWB` (a fixed document changed under a customer is a dispute)
- [ ] **Retention**: 90 days on `Inputs`, case life + 2 years on `AWB` (subject to Legal — **not yet confirmed**)
- [ ] Default sharing link = **"Specific people"**, never "Anyone"

### 2.4 Teams

- [ ] Team **`Clearance Desk – DEL`** with channels: `Cargo`, `Courier`, `IGM`, `Triage`, `Flow alerts`, `Admin`
- [ ] `Flow alerts` is where F19 and the IGM/Admin notifications post. **This is the operational heartbeat** — if nothing posts there, nothing is happening
- [ ] A shared `Requests` list or channel for the profile-provisioning queue (doc 9 §7)

### 2.5 Azure

| Resource | SKU | Why | Notes |
|---|---|---|---|
| **Azure OpenAI** | Provisioned, region confirmed by InfoSec | F08 classification, F08b detection fallback | Deploy **GPT-4o**. Region must be the one InfoSec approves (doc 5 §1 Q4) |
| **Azure AI Search** | Standard, 1 replica | RAG corpus for F08/F09/F18 | Cheapest tier that works. The corpus is templates, not documents |
| **Azure AI Document Intelligence** | Standard (or the prebuilt-invoice/read capability) | Reads invoices and KYC from uploaded files | Pay-per-1000-pages is fine at pilot volume |
| **Function App** (consumption) | Consumption | The TIFF/XLSX/DOC → PDF fallback when Word Online is unavailable (doc 10 §6) | Optional in Phase 3, required for reliability in Phase 4 |
| **Key Vault** (optional but recommended) | Standard | Connection secrets, ACCS credentials | See §7.3 |
| **Application Insights** | Basic | Flow and API telemetry | Optional; Dataverse telemetry is usually enough |

- [ ] Service principal created for the flows to reach Azure OpenAI / AI Search (or managed identity — preferred, and available because the environments are Production type, §2.2)
- [ ] **No Azure resource in the default subscription** without a resource group named `ClearanceDesk-DEL` and a tag `CostCenter = <code>`

### 2.6 Power Pages

- [ ] Power Pages capacity / **external user pricing confirmed** (doc 5 §1 Q6 — **O9**). This is the one commercial unknown that can sink the portal
- [ ] Site created in the PILOT environment, **External user authentication: AAD B2C tenant with invitation**, or anonymous read with a token
  - **Recommendation: token-only, no customer account.** A customs customer should not be forced to create an identity to see their shipment
- [ ] Entra B2C tenant if the customer must sign in (only needed for the DO payment page, doc 7 §4.2)
- [ ] InfoSec sign-off that external users may upload files into `ClearanceDesk-DEL/Customer` (doc 5 §1 Q10 — **O8**)
- [ ] The portal's domain name — `cdportal.del.fedex.com` or a similar sanctioned name. **Confirm before the site is built**; renaming a live Pages site breaks every link ever sent

### 2.7 External systems

| System | What we need | If unavailable |
|---|---|---|
| **ACCS** | Read API: endpoint, auth method, rate limits, invoice retrieval by AWB (doc 5 §1 Q1) | Scheduled file export to `Inputs`. F02 reads the file. **The rest of the system is unaffected** — this is a contained dependency |
| **ACCS** (bulk) | A batch invoice endpoint, or N per-AWB calls with a documented rate limit | F24 calls per-AWB with a 20/min pace and logs the strategy |
| **Checklist approval site** | API + how the HV checklist is submitted (doc 5 §1 Q2) | Power Automate Desktop robot, or agent pastes the code into the portal. F11 degrades, does not break |
| **Finance / Treasury** | A daily bank statement in a fixed format, dropped to `Finance` (**O6**) | F12 disabled; IGM matches UTRs manually in the app |
| **ICEGATE** | **No access.** Status is entered by IGM manually. Never attempt an integration | — |
| **Duty roster / leave** | Where does leave come from? HR system, Teams, or manual (doc 3 §3.6) | Manual in `cd_agentprofile` |

### 2.8 Test material

Collected from the teams, not IT (doc 5 §2.3):

- [ ] 20 real cargo AWBs with ACCS data — **consignee names masked if needed**
- [ ] 20 real courier pull rows spanning the categories
- [ ] 10 real past customer replies (cargo + courier) — the raw material for the templates
- [ ] 5 real ACCS invoices **in TIFF** (the conversion path must be proven on real files)
- [ ] 5 real payment screenshots
- [ ] 1 sample bank statement from Finance
- [ ] The current Arrival Notice Word template
- [ ] 20 hand-typed customer mails per team — **the best ones**, because they already work

---

## 3. Identity — AAD to team mapping

### 3.1 The model

```
AAD user (created by IT, offline, days)
  │
  │  AAD group membership tells us WHERE they belong
  │  cd_agentprofile tells us WHAT they can do
  ▼
F21 (nightly) → cd_profile_request  ← a queue, not an active profile
  │
  │  Team Lead or Admin or Manager fills it in
  ▼
cd_agentprofile (is_active = Yes)
  │  → Dataverse security role assigned
  │  → Outlook connection resolves on first sign-in
  ▼
Agent works inside their division's scoped navigation
```

**AAD authenticates. The profile decides everything else.** No access without a profile; no profile without a human decision. This is L9.

### 3.2 AAD groups to create

| Group | Members | Maps to | Notes |
|---|---|---|---|
| `CD-Cargo-Trace` | Cargo agents | `cd_team = CG-PRE` | **O2** — if the Prior/Post split is confirmed, this becomes two groups |
| `CD-Courier-SD` | Courier agents, sub-team SD | `cd_team = CD-SD` | |
| `CD-Courier-RBOE` | RBOE agents | `cd_team = CD-RBOE` | HV scope |
| `CD-Courier-CD` | CD agents | `cd_team = CD-CD` | The pilot sub-team |
| `CD-IGM` | IGM agents | `cd_team = IGM` | No access to cargo/courier documents |
| `CD-Admin` | Admin team | `cd_team = ADM` | |
| `CD-Clearance` | Clearance leads who produce pull sheets | `cd_team = CLR` | Can create cases, cannot own them |
| `CD-Supervisor` | Team leads and managers | role = `TeamLead` / `Manager` | |
| `CD-Builders` | The build team | role = `CD_Builder` | Not business users |
| `CD-ServiceAccount` | The service account | — | Not interactive |

> **Group names are a convention, not an identity source.** F21 reads group membership to *propose* a team on the request. A human confirms. If IT uses different group names, only §3.2's mapping changes.

### 3.3 F21 behaviour, precisely

| Condition | F21 does |
|---|---|
| AAD user in a `CD-*` group, no `cd_agentprofile` | Create `cd_profile_request` with `detected_groups`; notify Admin + the relevant Team Lead |
| Profile exists, `is_active = Yes`, user disabled in AAD | Set `is_active = No`; raise a `cd_calltask` for leave-cover assignment |
| Profile exists, group changed | Update `detected_groups` on the profile and raise a **change request** for a human — never re-team someone automatically |
| AAD user not in any `CD-*` group | Ignore. Being in the tenant is not being on the team |
| `cd_profile_request` older than 30 days | Mark `expired`. A request that nobody answered is not a pending request |

**F21 never creates a profile and never grants access.** It only creates work for a human.

---

## 4. Security roles and business units

### 4.1 Business units

Row-level security does the division scoping, so the business-unit structure must mirror the teams (doc 9 §8):

```
ClearanceDesk
├── BU-Cargo          (CG-PRE, CG-POST)
├── BU-Courier        (CD-SD, CD-RBOE, CD-CD)
├── BU-IGM            (IGM)
├── BU-Admin          (ADM)
├── BU-Clearance      (CLR)   — pull-sheet originators
└── BU-Shared         Company, Contact, cd_doclibrary, cd_docpack, Template,
                      Item rule, Fee rule, Holiday, Routing rule, Valuerule
```

**`BU-Shared` is read-only for everyone and write-only for Manager+.** The company master, the templates and the fixed documents are shared truth. An agent editing a template is a bigger problem than an agent editing a case.

### 4.2 Roles to create

Extends doc 5 §3.3 and doc 9 §8. All table privileges are read + append + appendto + write unless noted.

| Role | Tables | Extra | Notes |
|---|---|---|---|
| `CD_Builder` | All | Delete, plus schema rights on `cd_*` tables | 2–3 people. Solution only. Never assigned to an agent |
| `CD_Admin` | All rows, all BUs | Delete on cases and documents (soft) | 1–2 people |
| `CD_Manager` | All rows in their teams + assigned gateways | Config write: templates, items, fees, packs, autonomy | |
| `CD_TeamLead_SD` / `_RBOE` / `_CD` | Cases and children in their BU | Write `cd_assignment`, `cd_agentprofile` (own team, `Agent` role only) | One per sub-team |
| `CD_Courier_SD` / `_RBOE` / `_CD` | Own assigned cases and children | Create + read. **No delete** | |
| `CD_Cargo` | Own assigned cases and children, cargo BU | Create + read. **No delete** | |
| `CD_IGM` | IGM BU cases, payments, DO | **No read on courier/cargo `Document` rows** | |
| `CD_Clearance` | Create + read cases | **Cannot own a case.** Cannot see documents | Pull-sheet originators only |
| `CD_ServiceAccount` | All rows, all BUs | Flows, not people | No interactive sign-in. Reviewed at every go-live |

**Nothing gets `Delete` on `Case`, `Document` or `Mail message` except `CD_Admin`.** Deletion is soft (doc 11 §4.8). A destroyed mail record is an unrecoverable audit gap.

### 4.3 The service account is a person, not a robot

The service account must be:

- [ ] A real licensed user with a mailbox (some Exchange features fail without one)
- [ ] Exempt from MFA for interactive sign-in only if the platform forces it; otherwise use a managed identity for everything Azure
- [ ] Not on a leave cycle, and monitored by a named human owner
- [ ] Covered by the ownership note in §10.2

---

## 5. Provisioning runbook

### 5.1 New joiner

| Step | Who | What | Evidence |
|---|---|---|---|
| 1 | IT | AAD user, mailbox, Power Apps Premium licence, added to a `CD-*` group | IT ticket |
| 2 | — | Waits for F21 (nightly) or presses **Sync now** on the People screen | `cd_profile_request` appears |
| 3 | Team Lead | Opens the request, picks team, role `Agent`, gateway, capacity per day | `cd_profile_request.status = approved` |
| 4 | System | `cd_agentprofile` created, `is_active = Yes`, `activated_by` recorded, Dataverse role assigned | Profile row |
| 5 | Agent | First sign-in. Outlook connection resolves | `Connection reference` in use |
| 6 | Team Lead | Onboards: load their first batch, or clear their first pool queue | First `Case` owned |

**Target: a new agent works within one working day of IT creating the account.** The only manual step is step 3, and it takes under a minute.

### 5.2 Leaver

| Step | Who | What |
|---|---|---|
| 1 | Manager | Set `is_active = No`, `leave_cover_for = <cover agent>` |
| 2 | System | Reassign every active `cd_assignment` to the cover agent, `source = leave_cover`, reason recorded |
| 3 | System | Open AI drafts and `needs_review` cases move to the cover agent's queue |
| 4 | System | The leaver's cases keep their full history — **never reassigned by editing `owner_agent_id` in place** |
| 5 | IT | Disable the AAD account, revoke licence |
| 6 | System | Nightly F21 sees the disabled account and raises a reminder to remove the Dataverse role |

### 5.3 Team or division change

Never re-team automatically. A change of team changes what a person can see and what they can send — that is a deliberate act.

1. The requestor raises a change on the profile
2. The Team Lead of the **losing** team releases the agent's open assignments
3. The Team Lead of the **gaining** team accepts
4. Manager approves the profile change
5. F21 re-checks the AAD group and closes the loop

### 5.4 Gateway expansion

A new airport is configuration, not a rebuild (doc 7 §0):

1. Add a `Gateway` row (code, name, timezone, cutoffs, `doc_action_deadline_hours` — pending O1)
2. Add `cd_team` rows for that gateway, or extend existing teams with a `gateway` value
3. Load `Fee rule`, `Holiday`, `Routing rule`, `cd_valuerule` rows for that gateway
4. Add the AAD groups for that gateway's users
5. Add a `cd_accessrule` scope if its document policy differs
6. Confirm the SharePoint path convention (`/AWB/{awb}/…` is global; only the site differs)

---

## 6. The People screen

A single screen for steps 3–5 above. Scoped by role (doc 9 §5, §10):

```
┌─ People ─────────────────── [ Pending requests (2) ] [ Agents ] [ Teams ] ─┐
│                                                                            │
│ PENDING                                                                    │
│ ┌──────────────────────────────────────────────────────────────────────┐   │
│ │ Neha.sharma@fedex.com   AAD group: CD-Courier-CD   detected 06:12    │   │
│ │ Team: [CD ▾]  Role: [Agent ▾]  Gateway: [DEL ▾]  Capacity: [30 ▾]   │   │
│ │                                    [ Approve ]  [ Reject ]         │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│ AGENTS (CD)                     Load today        Status                  │
│  Rahul S.   Agent      ███████░░░  18/30     ● online    cover: —          │
│  Priya M.   TeamLead   ██████████  27/30     ● online    cover: Rahul     │
│  Neha S.    Agent      —          —          ⏳ awaiting approval            │
│                                                                            │
│  [ Bulk invite ]  [ Deactivate ]  [ Set cover ]  [ Sync now ]              │
└────────────────────────────────────────────────────────────────────┘
```

**`Sync now` is F21 on demand.** Waiting for nightly is unacceptable when someone starts today.

---

## 7. Service account, connections, secrets

### 7.1 Connection ownership

Every connection is owned by the service account, not by a person. If Priya leaves, the flows keep working.

| Connection | Used by | Scope |
|---|---|---|
| Office 365 Outlook | F05, F07, F17 | Send-as the three team mailboxes; read the monitored folders |
| Office 365 SharePoint | F06, F10, F24, F25 | `ClearanceDesk-DEL` |
| Dataverse | everything | The environment's own connection |
| HTTP with Azure AD | F27, ACCS | Entra app registration (doc 11 §2) |
| Azure OpenAI / AI Builder | F08, F08b, F09 | |
| Azure AI Search | F08, F18 | |
| Azure Document Intelligence | F08, F10 | |

### 7.2 The send path

**Graph API, not SMTP.** This matters for three reasons: it gives a `conversationId` (which is how F07's first matching rule works), it honours `Reply-To` without a transport hack, and it produces a real provider message ID for the audit trail.

If Graph send is blocked by policy, the fallback is SMTP with an authenticated send-as — and **F07 then falls back to the case-ref subject rule**, which only works because of L1. That dependency is worth stating out loud: *L1 is what keeps reply matching possible if the send path degrades.*

### 7.3 Secrets

| Secret | Where it lives | Rule |
|---|---|---|
| ACCS credentials | Key Vault, or the Entra app registration's secret | Never in a flow, never in a note, never in this repo |
| AI endpoint and key | Environment variable + connection reference | Managed identity preferred |
| API client secret | Entra app registration | Rotated every 6 months. Rotation is a documented step (§9.3) |
| Any password | **Nothing.** There is no user password in this system (L9) | The `Password123!` in cargo-paf's seed script is exactly what we do not do |

**Rules that are not negotiable:**

- [ ] No credential in a Power Automate definition that is not a Key Vault reference or a connection reference
- [ ] No `.env` file committed anywhere
- [ ] Service account credentials in a password vault, with two named human owners
- [ ] `CD_TestMode = Yes` until the go-live gate in doc 15 §10 is signed

---

## 8. Licensing and cost

| Item | Quantity | Driver | Fallback if denied |
|---|---|---|---|
| Power Apps Premium | 1 service + 12 pilot | Pilot size (doc 5 §2.1) | Shrink the pilot to one sub-team of 5 |
| Power Automate Premium | 1 service | Only if a premium connector is used | Stay on standard connectors; move Document Intelligence to an Azure Function |
| Power Pages | External users = every customer who opens a link | **Volume, unpredictable — O9** | Send a one-time passcode link and a PDF instead of a hosted page; the customer mails documents back |
| Entra B2C | MAU | Only if customers must sign in | Token-only, no sign-in (recommended) |
| Azure OpenAI | Per 1K tokens | Classification volume, ~500 cases/day | Templates only, no AI (autonomy Level 0) |
| Document Intelligence | Per 1K pages | Invoices and KYC, mostly TIFF | Word Online only, and TIFF stays unconverted — a real limitation, flag it |
| SharePoint | Storage | Case life + 2 years | Archive to blob after 90 days |

**The Power Pages line is the one to get answered first.** Every customer touch is an external user, and the volume is a multiple of the pilot headcount. If pricing is per-MAU, this is a materially different conversation at 5,000 customers than at 50.

---

## 9. Once access lands — verification

Do not start building on day 1. Run this on day 2.

### 9.1 Environment

- [ ] `ClearanceDesk` solution present in both environments
- [ ] All 34 tables created (doc 13 §6), with the filtered unique index on `cd_assignment` scoped to `assignment_role = owner`
- [ ] Environment variables created (doc 13 §4) with `CD_TestMode = Yes`
- [ ] DLP policy applied: attempting a blocked connector in the portal fails
- [ ] Both environments' managed identity can reach Azure OpenAI

### 9.2 Identity

- [ ] A test user in `CD-Courier-CD` produces a `cd_profile_request` on the first F21 run
- [ ] Approving it creates the profile, assigns the role, and the user can sign in
- [ ] A user in **no** `CD-*` group produces nothing
- [ ] A **Team Lead** cannot edit a template — the UI does not show the control
- [ ] A **courier agent** cannot see another agent's case

### 9.3 Data and documents

- [ ] A 40,000-row `Company` import completes with `name_key` computed
- [ ] The 5 real TIFF invoices convert to PDF through F25 and are readable
- [ ] One AWB folder is created with the four sub-folders
- [ ] An anonymous SharePoint link **fails** (proving anonymous sharing is off)
- [ ] `GET /s/{token}/documents` returns an `internal` document? **It must not.**

### 9.4 Send path

- [ ] A test mail sends from the service account with `Reply-To` = the team mailbox
- [ ] The reply lands in the monitored folder **with** a conversation ID
- [ ] F07 matches it back to the case on rule 1
- [ ] `CD_TestMode = Yes` routes a real-looking test send to `CD_TestRecipient`

### 9.5 The one-line test

If you can say this sentence after verification, the foundations are sound:

> An agent signs in, sees only their division, uploads a sheet, and the system produces a correct, linked, document-carrying request — **without writing a single line of customer mail by hand.**

---

## 10. Ownership after go-live

### 10.1 Named owners

| Asset | Owner | Deputy |
|---|---|---|
| Power Platform environment | Platform owner | — |
| Service account | Named person (not a team) | Named person |
| SharePoint site | Named person | — |
| Entra app registration | Named person | — |
| Azure resources | Cloud team | — |
| `Template` and `Item rule` | **Manager of the division** | Team Lead reads |
| `cd_doclibrary` and packs | **Manager of the division** | Team Lead reads |
| AI autonomy levels | Operations Manager | — |

**A rule with no named owner drifts within a quarter.** The 40,000-row company master in cargo-paf is what that looks like.

### 10.2 Offboarding checklist

- [ ] `cd_agentprofile.is_active = No`, cover set
- [ ] Cases reassigned via `cd_assignment`, not by editing `Case.owner_agent_id`
- [ ] Dataverse role removed
- [ ] SharePoint removed from the site's member group
- [ ] AAD group membership removed
- [ ] Licence reclaimed
- [ ] **If the service account leaves:** all connections are recreated under a new service account, then every flow's connection reference is re-pointed, then a test send is run. Budget a maintenance window. This is the highest-risk departure in the system

### 10.3 Recurring

| Cadence | Task |
|---|---|
| Nightly | F21 profile sync |
| Weekly | Review `cd_profile_request` backlog; review `Error log` with `is_resolved = No` |
| Monthly | Review `cd_apilog` rate-limit trends; review AI approval rates; rotate the API client secret if due |
| Quarterly | Re-verify who holds `CD_Builder` and `CD_Admin`. Remove anyone who has left the project |
