# Clearance Desk — Identity, Teams & the Division Model

*How a person signs in, how their division and value-class scope are determined, who creates their profile, and what each role can see.*

*Implements decision **L9** (AAD login + in-app profile) and **L5** (the division's split is authoritative; the app enforces and re-assigns it) from doc 8.*

---

## 1. The core idea

The login and the job description are **two different things**.

```
┌──────────────────────────────────────────────────────────────────────┐
│  IDENTITY  (owned by IT / Entra)                                     │
│  AAD user  →  the mailbox, the Outlook connection, the Teams identity │
│  Created by: IT. Never by a team lead.                                │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ 1:1, matched on immutable AAD object ID
┌───────────────────────────────▼──────────────────────────────────────┐
│  PROFILE  (owned inside the app)                                      │
│  cd_agentprofile  →  team · role · value-class scope · gateway        │
│  Created by: Admin, Manager, or the Team Lead of that team.           │
│  This is what makes someone a "Courier-HV agent" or a "Cargo-Pre      │
│  agent". It is data, not authentication.                              │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ 1:many
┌───────────────────────────────▼──────────────────────────────────────┐
│  ASSIGNMENT  (owned by team leads)                                     │
│  cd_assignment  →  which agent owns which case, and who decided       │
│  Owner rows: F26 writes them, F28 resolves the 65 pool rows.          │
│  Share rows:  F01b writes them from the sheet's `CEP` column.        │
└──────────────────────────────────────────────────────────────────────┘
```

**Why the separation matters:** FedEx IT controls accounts and licensing. The business controls who does what. A team lead must be able to say *"Priya is now on the RBOE sub-team, HV only"* without an IT ticket, while her login, her mailbox and her send-as rights are untouched.

**The security consequence:** because the profile carries `division` and `value_class_scope`, and because Dataverse row ownership is applied from it, a Courier-HV agent **physically cannot query** an LV case. This is enforced by the database, not by hiding a filter in the UI.

---

## 2. Sign-in flow

```
1. Agent opens the Power Apps link (or the Teams tab / shortcut).
2. Microsoft Entra ID authenticates. MFA per tenant policy.
3. Power Apps resolves the AAD object ID against cd_agentprofile.aad_user_id.
4. FOUR outcomes:
   ┌────────────────────────────────────────────────────────────┐
   │ a) PROFILE FOUND & ACTIVE                                 │
   │    → load Home, scoped to profile.division + value class    │
   │    → resolve Outlook connection as THIS agent (send-as)     │
   ├────────────────────────────────────────────────────────────┤
   │ b) PROFILE FOUND BUT INACTIVE                              │
   │    → show "Your access is paused. Contact your team lead."  │
   │    → no data access at all                                  │
   ├────────────────────────────────────────────────────────────┤
   │ c) NO PROFILE                                              │
   │    → show "Your account is not yet set up." + a button that │
   │      notifies the Admin and the agent's department lead.    │
   │    → NO data access. This is the self-service request path. │
   ├────────────────────────────────────────────────────────────┤
   │ d) PROFILE FOUND, MULTI-TEAM                              │
   │    → team picker (rare; e.g. a lead covering two sub-teams) │
   │    → choice is remembered per session, shown in the top bar │
   └────────────────────────────────────────────────────────────┘
```

**F21 (Agent profile sync)** runs nightly and on-demand. It:
- pulls new AAD users in the configured groups into a `cd_profile_request` queue (never auto-provisioned — see §7)
- flags profiles whose AAD account has been disabled
- flags profiles whose AAD account exists but was never assigned a team
- writes to `cd_apilog` for audit

> **Never auto-create an active profile from an AAD account.** A new mailbox must not silently gain access to live customer data. F21 creates a *request*, not a profile.

---

## 3. `cd_team`

One row per operating team.

| Column | Type | Example | Notes |
|---|---|---|---|
| `cd_team_id` | Guid (PK) | | |
| `name` | Text | `Courier-RBOE` | Display |
| `team_code` | Text | `CD-RBOE` | Short code, used in case refs and reports |
| `division` | Choice | `Cargo` \| `Courier` \| `IGM` \| `Admin` \| `Clearance` | The top-level split. **This is the "courier HV/MV/LV & cargo" the requirement describes.** |
| `sub_team` | Choice | `SD` \| `RBOE` \| `CD` \| `Pre` \| `Post` \| (blank) | Second-level split within a division |
| `value_class_scope` | Multi-select | `LV`, `MV`, `HV` | Which value classes this team handles. Blank or all three = unrestricted within the division. |
| `reply_mailbox` | Text | `trace.courier.del@fedex.com` | `Reply-To` for every mail from this team. Falls back to `Gateway.courier_reply_mailbox` if blank. |
| `case_types` | Multi-select | `cargo_ubond`, `courier`, `igm` | What this team can own |
| `gateway` | Lookup → Gateway | DEL | |
| `team_lead` | Lookup → cd_agentprofile | | Who can split work and create agents in this team |
| `is_active` | Yes/No | Yes | |
| `created_on` | DateTime | | |

### Seed rows (Delhi)

| team_code | name | division | sub_team | value_class_scope | reply_mailbox | case_types |
|---|---|---|---|---|---|---|
| `CG-PRE` | Cargo — Pre-Alert | Cargo | Pre | LV, MV, HV | `trace.cargo.del@` | `cargo_ubond` |
| `CG-POST` | Cargo — Post-Arrival | Cargo | Post | LV, MV, HV | `trace.cargo.del@` | `cargo_postarrival` |
| `CD-SD` | Courier — SD | Courier | SD | LV, MV | `trace.courier.del@` | `courier` |
| `CD-RBOE` | Courier — RBOE | Courier | RBOE | **HV** | `trace.courier.del@` | `courier` |
| `CD-CD` | Courier — CD | Courier | CD | LV, MV | `trace.courier.del@` | `courier` |
| `IGM` | IGM | IGM | — | LV, MV, HV | `deldo@` | `igm` |
| `ADM` | Admin | Admin | — | LV, MV, HV | (none — internal only) | `admin_handoff` |
| `CLR` | Clearance (pull-sheet origin) | Clearance | — | LV, MV, HV | (none — internal only) | (produces `courier`) |

> **`CD-RBOE` scoped to HV only** is the concrete expression of "courier HV". Doc 6 §6 already routes RBOE to HV; here it becomes a hard scope on the team rather than a routing coincidence.

> **`CG-PRE` vs `CG-POST`** is pending open item **O2** (doc 8 §6). Both rows exist; if the teams turn out to be one team, set `CG-POST.is_active = No` and the phase stays on `Batch.phase` instead.

---

## 4. `cd_agentprofile`

| Column | Type | Example | Notes |
|---|---|---|---|
| `cd_agentprofile_id` | Guid (PK) | | |
| `aad_user_id` | Text (unique) | `9f3c…` | **Immutable Entra object ID.** The join key. Not the email — emails change. |
| `email` | Text | `priya.s@fedex.com` | Display + Outlook connection resolution |
| `display_name` | Text | Priya S | Used in `{AGENT_NAME}` in mails and signatures |
| `cd_team_id` | Lookup → cd_team | `CD-RBOE` | |
| `role` | Choice | `Agent` \| `TeamLead` \| `Manager` \| `Admin` | See §5 |
| `gateway` | Lookup → Gateway | DEL | |
| `capacity_per_day` | Whole | 30 | Used by auto-split and supervisor load balancing |
| `duty_start` | Time | 06:00 | Optional, for the roster view |
| `duty_end` | Time | 15:00 | |
| `manager` | Lookup → cd_agentprofile | | Who approves leave cover |
| `leave_cover_for` | Lookup → cd_agentprofile | | Who covers this person's queue while they're on leave. Auto-reassigns on activation. |
| `send_as_allowed` | Yes/No | Yes | Whether F05 may send from this agent's mailbox. `No` = read-only / reviewer. |
| `is_active` | Yes/No | Yes | |
| `activated_on` | DateTime | | When a Team Lead made them active |
| `activated_by` | Lookup → cd_agentprofile | | |
| `created_on` | DateTime | | |
| `modified_on` | DateTime | | |

**Index on `aad_user_id`, unique.** **Index on `cd_team_id`.** Both are read on every page load.

### Derived values (do not store)

- `visible_divisions` = the `division` of this agent's team
- `visible_value_classes` = the team's `value_class_scope`
- `visible_case_types` = the team's `case_types`

These are used in every view filter and in every `FetchXML`/`OData` guard. Centralised in one Power Fx function so no screen can accidentally omit the scope filter.

---

## 5. Roles

Ported from `cargo-pre-alert-operations-model.md:230-236` and extended.

| Capability | Agent | TeamLead | Manager | Admin |
|---|---|---|---|---|
| See own cases | ✅ | ✅ | ✅ (all in team) | ✅ (all) |
| See team cases | own only | ✅ own team | ✅ own team | ✅ all |
| See other gateways | ❌ | ❌ | own + assigned | ✅ switch |
| Upload a batch (own division) | ✅ | ✅ | ✅ | ✅ |
| **Assign a case to an agent** | ❌ | ✅ own team | ✅ own team | ✅ |
| **Resolve a pool queue** (F28) | ❌ | ✅ own desk | ✅ own team | ✅ |
| **Create an agent profile** | ❌ | ✅ own team, `Agent` role only | ✅ own teams, any role | ✅ any team, any role |
| Activate / deactivate a profile | ❌ | ❌ | ✅ | ✅ |
| Set an agent's capacity | ❌ | ✅ own team | ✅ | ✅ |
| Approve an AI draft & send | ✅ | ✅ | ✅ | ✅ |
| Configure templates | ❌ | ✅ view, `Admin` to edit | ✅ edit | ✅ |
| Configure Document Packs / Library | ❌ | ❌ | ✅ | ✅ |
| Configure item rules, fees, cutoffs, holidays | ❌ | ❌ | ✅ | ✅ |
| Toggle autonomy Levels 0–3 | ❌ | ❌ | ✅ | ✅ |
| Reassign any case | ❌ | ✅ own team | ✅ | ✅ |
| Assign a case you own to a teammate | ❌ | ✅ own team | ✅ | ✅ |
| See a case you are *shared* on, not owned | ❌ | ✅ if shared | ✅ | ✅ |
| View Supervisor dashboard | ❌ | ✅ own team | ✅ own teams | ✅ all |
| **Create a team** | ❌ | ❌ | ❌ | ✅ |
| Delete a profile | ❌ | ❌ | ❌ | ✅ (soft-delete only) |

**Separation of duties, deliberately:**
- A Team Lead assigns **work** but cannot change **templates or rules**. Rules are Manager+.
- Only an **Admin** creates teams and changes value-class scope. Widening what a team can see is a governance action, not a management one.
- Autonomy switches are Manager+, not Team Lead. Auto-send is a risk decision.

---

## 6. `cd_assignment`

The audit record of L5. Every case has at most one **active** assignment.

| Column | Type | Notes |
|---|---|---|
| `cd_assignment_id` | Guid (PK) | |
| `case_id` | Lookup → Case | |
| `agent_profile_id` | Lookup → cd_agentprofile | |
| `source` | Choice | `lead_split` (L5 default) \| `bulk_load` (agent's own upload) \| `auto_split` (reserved) \| `reassign` \| `leave_cover` |
| `assigned_by` | Lookup → cd_agentprofile | Null only for `bulk_load` |
| `assigned_on` | DateTime | |
| `reason` | Text | Required for `reassign` |
| `released_on` | DateTime | Set when work moves |
| `released_to` | Lookup → cd_agentprofile | |
| `active` | Yes/No | Yes | Only one active row per case — enforced by a filtered unique index |

**Why this table exists:** when a customer complains about a delay, the question is always *"who had this and when did it move?"* Without an assignment history, that question is unanswerable. It also drives supervisor load balancing and the leave-cover automation.

### Assignment record (L5, F26, F28)

Assignment writes **both** the `cd_assignment` row and a `Case.send_state` transition, so every movement is reconstructable: who assigned, when, which rows, and what the row said at that moment.

Two things changed here after the pull sheet was read (D4, D5) and they are not cosmetic:

- **The courier rows arrive already assigned.** F01b consumes the division's own `Team` / `Agent` split. The Team Lead does not distribute them; there is no Split screen for 332 rows, and building one would mean the system silently disagrees with the spreadsheet the team already trusts. Only the **65 pool rows** need a human — they sit in `awaiting_pool_assign` until the BOM desk lead assigns them (F28).
- **An agent can appear on a case as a `Share` rather than an `Owner`.** The pull sheet's `CEP` column names people who are *following* a shipment, often from another desk, and it is populated on 84 of 332 rows. These become `cd_assignment` rows with `assignment_role = Share`, which grant read access and nothing else. `CEP` is never an owner and never a mailbox.

`send_state` therefore has five states, not four: `unassigned` · `awaiting_pool_assign` · `assigned` · `accepted` · `completed`. Only F26 and F28 leave `awaiting_pool_assign`, and until then Gate 0 blocks the send.

---

## 7. Provisioning workflow

```
┌── 1. IT creates the AAD user + mailbox + Power Apps Premium licence
│      (offline process, days)
│
├── 2. F21 runs (nightly) → finds the AAD user, no profile
│      → creates cd_profile_request  { aad_user_id, email, detected_groups }
│      → emails Admin + the relevant Team Lead
│
├── 3. Admin or Team Lead opens "People" → the pending request is at the top
│      → picks cd_team, role, gateway, capacity
│      → Activate
│
├── 4. cd_agentprofile created, is_active = Yes, activated_by recorded
│      → Dataverse security role assigned (automatically, from role)
│      → Outlook connection resolves on next sign-in
│
├── 5. Agent signs in → scoped Home screen
│
└── 6. Onboarding: a Team Lead bulk-loads their first batch or does the first split
```

**Reassignment when someone leaves:**

```
Manager sets cd_agentprofile.leave_cover_for = <cover agent>, is_active = No
   → F26 (on activation) reassigns all active assignments to the cover agent
   → source = leave_cover, reason recorded
   → open AI drafts move to the cover agent's Inbox
   → the Leaving agent's cases keep their full history
```

---

## 8. Dataverse security roles

Extends the set in doc 5 §3.3. **Business units carry the division scoping** so row-level security does the work.

| Role | Assignment |
|---|---|
| `CD_Builder` | 2–3 people. Full Dataverse rights. Solution only. |
| `CD_Admin` | 1–2 people. All rows, all teams, all gateways. |
| `CD_Manager` | Team leads' managers. All rows in their teams + assigned gateways. |
| `CD_TeamLead_SD` / `_RBOE` / `_CD` | One per courier sub-team. Read all cases in their BU; write assignment. |
| `CD_Courier_SD` / `_RBOE` / `_CD` | Agents. **Create + read own assigned cases only.** No delete. |
| `CD_Cargo` | Cargo agents. Same shape, cargo BU. |
| `CD_IGM` | IGM agents. IGM BU. No access to courier or cargo documents. |
| `CD_Clearance` | Pull-sheet originators. Can create cases, cannot own them. |
| `CD_ServiceAccount` | Flows only. Send-as on all three team mailboxes. No interactive sign-in. |

### Row ownership

| Table | Ownership rule |
|---|---|
| `Case` | Owner = `cd_agentprofile` of the active `cd_assignment` |
| `Batch` | Owner = the uploading profile; Team Lead can read their team's |
| `Document` | Inherits from `Case` |
| `Required item` | Inherits from `Case` |
| `Mail message` | Inherits from `Case` |
| `Payment` | Inherits from `Case` |
| `Company`, `Contact` | **Read for all authenticated staff. Write for Admin/Manager only.** The company master is shared reference data. |
| `cd_doclibrary`, `cd_docpack` | Read for all; write for Manager+ |
| `Template`, `Item rule`, `Fee rule`, `Holiday`, `Routing rule`, `Valuerule` | Read for all; write for Manager+ |
| `cd_agentprofile` | Read own + own team; write Team Lead (own team, Agent role only) / Manager / Admin |
| `cd_apilog`, `Error log` | Read Manager+ |

> **Critical:** `Company` is deliberately **read-allowed to all authenticated staff.** A courier agent must be able to see the broker and contact for a company to do their job. But the company master is *shared* — that is precisely why it must not be a per-agent private list, and why an accidental edit is a Manager-only action.

---

## 9. Division-scoped navigation

Doc 7 §3.0 gives a single flat nav. With the division model it becomes:

```
┌─ Clearance Desk ──────────── DEL ▾ ── CD-RBOE ▾ ── Priya S ──┐
│                                                                │
│  COURIER agents                    CARGO agents               │
│  ┌──────────┐ ┌──────────┐        ┌──────────┐ ┌──────────┐   │
│  │ 🏠 Home  │ │ 📤 Send  │        │ 🏠 Home  │ │ 📤 Send  │   │
│  └──────────┘ └──────────┘        └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐        ┌──────────┐ ┌──────────┐   │
│  │📋 MyQueue│ │📥 Inbox  │        │📥 Inbox  │ │📋 Cases  │   │
│  └──────────┘ └──────────┘        └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐        ┌──────────┐ ┌──────────┐   │
│  │⬆ MyUpload│ │📄 Cases  │        │📦 Packs  │ │⚠ Attention│  │
│  └──────────┘ └──────────┘        └──────────┘ └──────────┘   │
│                                                                │
│  + Pool Queue (Team Lead)  + Supervisor (Manager)  + Admin (Admin)  │
└────────────────────────────────────────────────────────────────┘
```

| Tab | Courier | Cargo | IGM | Manager+ |
|---|---|---|---|---|
| Home | my queue, drafts pending, ready-for-ACCS, errors | my batches, drafts pending, errors | payments needing review, ready-for-DO | team numbers |
| My Queue | ✅ assigned rows **+ shared rows, read-only** | ❌ | ❌ | ✅ team-wide |
| My Upload | ✅ my share of a pull sheet | ❌ | ❌ | ✅ |
| Send | ✅ review & send | ✅ review & send | ✅ | ✅ |
| Inbox | ✅ | ✅ | ✅ | ✅ |
| Cases | ✅ own + shared | ✅ own | ✅ own | ✅ team |
| Packs | ✅ view | ✅ **edit** (L11) | ✅ view | ✅ edit |
| Pool Queue | ✅ desk lead, only if rows are waiting on *their* desk | ✅ Team Lead | — | ✅ all |
| Attention | ✅ | ✅ | ✅ | ✅ all |
| Supervisor | — | — | — | ✅ |
| Admin | — | — | — | ✅ |

**The division badge and the value-class badge sit permanently in the top bar** so an agent always knows which slice of work they are looking at, and a Team Lead can confirm at a glance that a screen is scoped correctly.

---

## 10. Profile management screen

```
┌─ People ──────────────────────── [Pending requests: 3] [Teams] ────┐
│                                                                     │
│  PENDING REQUESTS                                                   │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Amit S  amit.s@fedex.com   group: CD-SD, CD-RBOE                 │ │
│  │ Detected 27 Sep by F21.  Assign a team:  [ CD-RBOE ▾ ]  [Approve]│ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  TEAM — CD-RBOE                    Value class scope: HV           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Priya S   Agent      30/day  06:00-15:00   Active  2h ago      │ │
│  │ Rahul M   Agent      30/day  09:00-18:00   Active  1d ago  ⬤ 52 │ │
│  │ Anjali K  TeamLead   35/day  08:00-16:00   Active  3d ago  ⬤ 49 │ │
│  │ [ + Add agent ]                            (Team Lead)           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  TEAM — CD-CD                     Value class scope: LV, MV        │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Deepa R   Agent      30/day  06:00-15:00   Active  2h ago      │ │
│  │ Anjali K  Agent      30/day  14:00-20:00   Active  4h ago  ON LEAVE│ │
│  │   ↳ cover: Rahul M — 14 pending drafts, 9 cases reassigned      │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

**A Team Lead sees only their own team.** A Manager sees their teams. An Admin sees everything and is the only role that can edit `value_class_scope` or create a team.
