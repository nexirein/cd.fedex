# Access & Environment Request — Clearance Desk

**Requested by:** Bipul Sikder · Trace / Clearance Desk
**Requested from:** Power Platform Administrator · Entra Administrator
**Date:** 2026
**Supporting evidence:** screenshot of the tenant policy block, included at §7

---

## 1. Summary

Building an application for the Delhi clearance operation on the Microsoft Power Platform. I need **four administrative actions** before development can start.

I currently hold **Maker without full data access** and cannot perform any of them. The environment creation request is blocked by tenant policy, and the screenshot at §7 is the exact error returned.

**What I am not asking for:** standing admin rights for myself. Each item below is a specific, auditable grant, and Items 1 and 2 can be revoked at any time without affecting the project.

---

## 2. The four requests

| # | Request | Admin role needed | Effort | Reversible |
|---|---|---|---|---|
| **1** | Allow environment creation for my account | Power Platform admin | 1 policy toggle | Yes |
| **2** | Enable Dataverse MCP on the target environment | Power Platform admin | ~2 min | Yes |
| **3** | Tenant admin consent for one Microsoft app | Entra Global Admin | 1 click | Yes |
| **4** | **System Customizer** role in the environment | Dataverse admin | 1 assignment | Yes |

**Nothing here grants access to production business data, customer data, or email-sending rights.** Request 4 is the standard Dataverse schema role, not System Administrator.

**Requests 1–4 unblock all development.** Nothing in §9 is needed to build — that section exists only so the go-live dependencies are visible in one place.

---

## 3. Request 1 — Allow me to create a development environment

### What I am asking

Permission to create a **Sandbox** environment for development and testing. Or, if policy prefers, a single environment created on my behalf by the admin team.

### Why it is needed

Every artifact this project produces is schema — tables, columns, relationships, choices, indexes. That schema has to exist somewhere before it can be built, tested, or shown.

**Today there is no non-production environment available to me.** `MyFedEx (Upgrade)` is a trial environment with restrictions that make it unsuitable as a build target, and it is not an environment we can safely iterate on.

Without a development environment, development cannot begin. There is no workaround that produces a working application.

### The specific error

Creating `test-ind-03b4874f` (Sandbox, India region) returns:

> **Your tenant's administrators have disabled environment creation for non-admin users. You need this permission to create an environment in your tenant. Please contact your administrator for assistance.**

Screenshot at §7.

### Specifications

| Setting | Value | Reason |
|---|---|---|
| Environment name | `cleardesk-dev` | Traceable to this project |
| Type | **Sandbox** | For build and validation only — no business data |
| Region | **India** | Data locality. All shipment and customer data stays in-region |
| Dataverse database | **Yes** | Required — all application data lives in Dataverse |
| Pay-as-you-go with Azure | No | No external cost |
| Dynamics 365 apps | No | Not used |
| Security group | Restrict to pilot group | Least privilege |
| Default language | English (India) | User base |
| Currency | INR | User base |

### What a Sandbox is and is not for

**For:** building and validating schema, testing flows against dummy records, demonstrating the design to stakeholders.

**Not for:** holding real customer data, running production automation, or long-term use. Microsoft recommends Sandbox environments be short-lived. A **Managed Environment** is required before the pilot goes live — that is Request 4, and it can be raised at that time.

---

## 4. Request 2 — Enable Dataverse MCP on the environment

### What I am asking

In the target Dataverse environment, enable the **Dataverse Model Context Protocol** and allowlist one Microsoft application.

### Why it is needed

Building 34 tables with their columns, relationships and validation rules **by hand in a web interface** is not realistic. Each table involves dozens of decisions — column types, choice values, relationships, indexes — and a single mistake surfaces much later, after dependent work is already built on it.

Dataverse MCP is Microsoft's supported mechanism for creating and reading schema programmatically. It lets changes be version-controlled, reviewed, and applied consistently, instead of being clicked by hand into a browser.

**Practical effect:** schema changes that take hours by hand and cannot be reviewed take minutes and can be reviewed before applying.

### What is being allowed

| | |
|---|---|
| Application | **Dataverse MCP CLI** — Microsoft first-party, not a custom or third-party app |
| Client ID | `0c412cc3-0dd6-449b-987f-05b053db9457` |
| What it can do | Create and modify Dataverse tables, columns, relationships, records. Read metadata. |
| What it cannot do | Send email. Access any system outside this Dataverse environment. |
| Data movement | **None.** All schema and data remain in our own tenant. |
| Auditability | All changes are recorded in Dataverse system tables, same as any administrative change |

### Why this does not need a custom app registration

The Dataverse MCP CLI is Microsoft's own first-party application. No new app registration, no new enterprise application, no credentials to manage. It is the same application used for any Microsoft-supported Dataverse tooling.

### One risk to check

**Is Dataverse MCP available in the India region?** The feature rolls out by region. If it is not available, this request cannot be satisfied as written — please tell me, because there is a known fallback that needs no MCP at all (see §6).

---

## 5. Request 3 — Tenant admin consent

### What I am asking

Tenant-wide admin consent for Microsoft's first-party **Dataverse MCP CLI** application.

### Why it is needed

This is a one-time, tenant-wide grant that allows the Dataverse MCP CLI to be used in **any** Dataverse environment in the tenant. It is separate from Request 2, which is per-environment.

Granting it once means future environments do not each need a fresh consent exercise.

### Exactly what to click

Open this URL while signed in as a Global Administrator or Privileged Role Administrator:

```
https://login.microsoftonline.com/b945c813-dce6-41f8-8457-5a12c2fe15bf/adminconsent?client_id=0c412cc3-0dd6-449b-987f-05b053db9457
```

Click **Accept**. No further configuration is required.

| | |
|---|---|
| Application | Dataverse MCP CLI (Microsoft first-party) |
| Client ID | `0c412cc3-0dd6-449b-987f-05b053db9457` |
| Tenant ID | `b945c813-dce6-41f8-8457-5a12c2fe15bf` |
| Tenant domain | `myfedex.onmicrosoft.com` |
| Who can grant | Global Administrator, or Privileged Role Administrator |

The tenant ID above was read from Microsoft's public OpenID configuration endpoint for `myfedex.onmicrosoft.com`, and it matches the GUID in the environment ID already provided. If the URL below shows any tenant other than FedEx, stop and do not click Accept.
| Scope | Dataverse metadata and records in our tenant only |
| Revocable | Yes — Azure portal → Enterprise Applications → the app → Permissions → revoke |

### Why this is acceptable to InfoSec

| Question | Answer |
|---|---|
| Does data leave our tenant? | **No.** All schema and records stay in our Dataverse. |
| Is third-party data involved? | **No.** The application operates only on our environment. |
| Is a non-Microsoft vendor involved? | **No.** First-party Microsoft application. |
| Can it send customer email? | **No.** Email requires a separate Power Automate flow, separately approved. |
| What is the blast radius if misused? | Dataverse schema and records in our own tenant — the same scope as any Dataverse system administrator, and fully audited in Dataverse system tables. |

---

## 5A. Request 4 — System Customizer role in the environment

### What I am asking

The **System Customizer** security role in the target Dataverse environment.

### Why it is needed

The application is an **extension of the existing environment**, not a replacement. Eight tables already exist and hold live data — `Case`, `Document`, `Template`, `Company`, `Contact`, `Mail message`, `Required item`, `Error log` — plus `Batch`.

Before I can design the new columns safely I need to **read** the existing ones. Otherwise I would be guessing at the shape of the data I am extending, and the eight contracts already agreed in doc 13 §5 — placeholder format, subject line, clearance path, document visibility, format, assignment, idempotency, AWB length — could not be honoured.

**Read is enough to build.** Write to those existing tables is not requested. Structural changes are made in a sandbox, reviewed, and only then scheduled.

### What this role does and does not allow

| | |
|---|---|
| Allows | Read existing tables and data; create and modify **schema** — new tables, columns, relationships, choice sets |
| Does not allow | **System Administrator** is not requested. No bulk data export, no security-role changes, no production data modification, no user impersonation |
| Scope | One environment |
| Revocable | Yes — remove the role assignment |

This is the standard role for anyone extending a Dataverse schema, and it is well below System Administrator.

---

## 6. If MCP cannot be enabled — no action needed

Dataverse MCP is a convenience, not a requirement. If it is unavailable in this region, or if InfoSec declines it, the project proceeds with a supported alternative:

**Solution file (.sln) approach.** I produce a versioned, reviewable Dataverse solution file. An administrator imports it through the standard admin centre. No MCP, no external tooling, no additional permissions beyond what a Dataverse administrator already holds.

| | With MCP | With solution file |
|---|---|---|
| Schema change cycle | Minutes | Days — admin must be present |
| Reviewable before applying | Yes | Yes |
| Additional permissions | Requests 2 and 3 | None beyond existing admin |
| Auditability | Dataverse system tables | Same |

**If Requests 2 and 3 are declined, I need only Request 1, and the project continues at a slower pace.** Please say so and I will prepare the solution file instead.

---

## 7. Screenshot of the block

<!-- ATTACH SCREENSHOT HERE.
     One frame must show all four items below at once. If the page scrolls,
     the error message often sits below the fold — scroll until the fields
     AND the red message are both visible, then capture. That single frame
     is the evidence; two partial screenshots are weaker than one good one.
     Checklist for the capture:
       [ ] "Create environment" page title
       [ ] Environment name  test-ind-03b4874f
       [ ] Type = Sandbox,  Region = India
       [ ] The red policy message quoted below
     Redact nothing. There is no customer data, no business data and no
     credentials on this page — the only fields are environment settings. -->

> *Your tenant's administrators have disabled environment creation for non-admin users.
> You need this permission to create an environment in your tenant.
> Please contact your administrator for assistance.*

**What the screenshot shows:**

| Detail | Value |
|---|---|
| Page | Create environment |
| Environment being created | `test-ind-03b4874f` |
| Type / Region | Sandbox / India |
| My role at time of attempt | **Maker without full data access** |
| Result | Blocked by tenant policy |

**If no screenshot can be captured:** the block is reproducible by any maker in this
tenant, and an administrator can confirm the responsible setting in the Power Platform
admin centre under **Environment → Settings → *makeers can create environments***.
The error text above is sufficient evidence on its own; the screenshot is supporting.

---

## 8. What happens once these are granted

I do not need anything further from IT to build the first phase. The sequence:

| Step | What happens | Needs IT |
|---|---|---|
| 1 | Create the 34-table schema | Requests 1–3, or Request 1 alone |
| 2 | Read the schema back and verify it matches the design | — |
| 3 | Load reference data and template definitions | — |
| 4 | Import 332 real pull-sheet rows and reconcile counts | — |
| 5 | Build and test document-request flows | — |
| 6 | Show a working screen for stakeholder review | — |
| 7 | **Pilot — needs Managed Environment + licensing** | **Request 5** |

**Requests 1–4 unblock everything through step 6.** Request 5 is needed only when the pilot starts.

---

## 9. Request 5 — for later, not now

Raised separately before the pilot. No action needed yet. These are **not** permissions this request depends on.

| # | Requirement | Count | Why |
|---|---|---|---|
| 5a | **Power Platform Administrator** role assigned to a named project sponsor | 1 | Ownership of the environment after handover |
| 5b | **Managed Environment** provisioned (`cleardesk-prod`) | 1 | Required for production Power Automate flows and data-loss-prevention policy. Sandbox is not permitted for production |
| 5c | **Power Apps Premium** licences | ~56 | Trace 48 + IGM 8 |
| 5d | **Power Automate Premium** | 1 + per-user as needed | Approvals, Office 365 Outlook connectors |
| 5e | **Power Pages** | 1 | External customer-facing portal |
| 5f | Exchange: send-as-agent with Reply-To | Policy | Mail from agent's address, reply routed to team mailbox |
| 5g | InfoSec review: external uploads to Power Pages | Review | Customer document upload |
| 5h | Compliance sign-off: fee, cutoff, BOE penalty wording | Sign-off | **Cannot go live without this** |
| 5i | Bank statement feed access | Finance | Without it, payment verification stays manual |

**5h and 5i are commercial and Compliance items, not IT items.** They are listed so the full dependency picture is in one place.

---

## 10. Time and cost impact if this stays blocked

| Consequence | Impact |
|---|---|
| No development environment | **Work cannot start.** Every artifact is schema |
| Development in the trial environment | Trial restrictions block production-grade Power Automate connectors. Not viable long-term |
| Solution-file fallback only | Change cycle goes from minutes to days, and needs an administrator's time for every change |
| Pilot start date | Slips by the length of the approval cycle |

**The application cannot be demonstrated, tested, or reviewed without at least one usable environment.** This is the single blocking dependency for the project.

---

## 11. Requested approvals

| Item | Decision | Name | Date |
|---|---|---|---|
| Request 1 — environment creation for Bipul Sikder | Approve / Decline | | |
| Request 2 — Dataverse MCP on environment | Approve / Decline / **Not available in region** | | |
| Request 3 — tenant admin consent | Approve / Decline | | |
| **If 2 and 3 declined:** proceed with solution-file approach | Yes / No | | |
| **Request 4** — System Customizer in the environment | Approve / Decline | | |
| Request 5 — raise before pilot | Acknowledge | | |

**Contact for any questions:** Bipul Sikder · Trace / Clearance Desk
