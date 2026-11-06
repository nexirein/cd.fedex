# 23 — IT Request: Environment, Consent, MCP Access

**Forward this entire document to your Power Platform administrator and Entra administrator.**
Everything technical is copy-paste. Nothing here needs interpretation.

---

## 1. What was asked for, and what came back

A Clearance Desk project needs a Dataverse environment with the **Dataverse Model Context Protocol** enabled, so an AI development tool can create and read schema directly.

Two requests were attempted by a **Maker without full data access** and both were refused by tenant policy:

| Attempt | Result |
|---|---|
| Tenant admin consent for the Dataverse MCP CLI | Requires Global Admin / Privileged Role Admin |
| Creating a new sandbox environment | *"Your tenant's administrators have disabled environment creation for non-admin users."* |

**This is not a project blocker that a developer can work around.** It needs two people with administrative roles. Requesting them below.

---

## 2. Request to IT — copy from here

> We are building a Clearance Desk application on the Microsoft Power Platform and need two administrative actions. Both are standard enablement tasks.
>
> ### Request 1 — Tenant admin consent (Entra Global Admin or Privileged Role Admin)
>
> Please grant tenant-wide admin consent for Microsoft's first-party **Dataverse MCP CLI** application.
>
> **Consent URL:**
> ```
> https://login.microsoftonline.com/b945c813-dce6-41f8-8457-5a12c2fe15bf/adminconsent?client_id=0c412cc3-0dd6-449b-987f-05b053db9457
> ```
>
> - **Application name:** Dataverse MCP CLI (Microsoft first-party, not a custom app)
> - **Client ID:** `0c412cc3-0dd6-449b-987f-05b053db9457`
> - **Tenant ID:** `b945c813-dce6-41f8-8457-5a12c2fe15bf`
> - **Purpose:** allows an AI development tool to read and create Dataverse schema in our own tenant
> - **Data accessed:** Dataverse metadata and records in our tenant only. No data leaves the tenant
>
> ### Request 2 — Dataverse MCP feature enablement (Power Platform admin)
>
> In the target Dataverse environment:
>
> 1. [admin.powerplatform.microsoft.com](https://admin.powerplatform.microsoft.com) → **Manage** → **Environments** → target environment
> 2. **Settings** → **Product** → **Features**
> 3. Find **Dataverse Model Context Protocol**
> 4. Enable **"Allow MCP clients to interact with Dataverse MCP server"**
> 5. Open **Advanced Settings**
> 6. Locate **"Dataverse MCP CLI tool"**, Application ID `0c412cc3-0dd6-449b-987f-05b053db9457`
> 7. Set **Is Enabled** = **Yes**
> 8. **Save**
>
> **Step 6 is required.** Enabling the feature alone is not sufficient — the client application must be named in the allowlist.
>
> ### Request 3 — Environment provisioning
>
> Please provision a **Managed Environment** for the pilot.
>
> | Setting | Value |
> |---|---|
> | Name | `cleardesk-prod` |
> | Type | **Managed** |
> | Region | **India** |
> | Dataverse database | Yes |
> | Security group | Restrict to the pilot group (see §3) |
> | Dynamics 365 apps | No |
> | Pay-as-you-go with Azure | No |
>
> ### Why Managed and not Sandbox
>
> A Sandbox is appropriate for the first schema build, but a Sandbox is not intended to hold business data or run production flows, and Microsoft recommends it be short-lived. The pilot has **56 concurrent users** and production Power Automate flows, which require a Managed Environment for data-loss-prevention policy and proper environment admin.
>
> **Recommendation:** provision Sandbox now for the schema build and validation, then Managed Environment before the pilot begins.
>
> ### Request 4 — Power Platform licensing
>
> | Requirement | Count | Notes |
> |---|---|---|
> | Power Apps Premium | ~56 | Trace 48 + IGM 8 |
> | Power Automate Premium | 1 (per-user may be needed) | Approvals, Office 365 Outlook |
> | Power Pages | 1 | External customer portal |
> | Dataverse / Dynamics 365 Enterprise | covered by Managed Environment | — |
>
> Pilot may be scoped to 12 users first to prove value before full allocation.

---

## 3. What IT should check before granting

| Check | Why it matters |
|---|---|
| Is Dataverse MCP available in this region? | Feature rolls out by region. India may or may not be covered. If unavailable, we need a fallback — see §5 |
| Any DLP policy blocking Dataverse MCP? | Tenant DLP can block it even when the feature is on |
| Is `myfedex.onmicrosoft.com` a trial tenant? | Trial tenants have restrictions that affect Power Automate premium connectors |
| Does `MyFedEx (Upgrade)` need upgrading first? | A trial environment is not a pilot platform |

**If this is a trial tenant, say so now.** It changes the plan: everything is built as a working prototype, and a production environment becomes a hard prerequisite for go-live rather than something we can defer.

---

## 4. Security posture — for the InfoSec reviewer

| Question | Answer |
|---|---|
| Does data leave FedEx's tenant? | **No.** All schema and records live in our Dataverse. |
| Is external data used? | **No.** The tool operates only on our environment. |
| Is a third-party application involved? | **No.** `0c412cc3-...` is a Microsoft first-party application. |
| What can it do? | Create/modify Dataverse tables, columns and records; read metadata. It cannot send customer email. |
| Email sending | Requires a separately approved Power Automate flow, reviewed and gated before go-live. |
| Test mode | All outbound mail routes to a test inbox until explicitly enabled. See PRD NFR-06. |
| Human approval | No customer-facing mail auto-sends during the pilot. See PRD FR-08 autonomy levels. |

**If InfoSec objects**, the fallback is that a human administrator executes schema changes on instruction. Slower — several days per change cycle instead of minutes — but it works and needs only Dataverse permissions already held.

---

## 5. If MCP is unavailable

Fallback, in order of preference:

| Option | Cost |
|---|---|
| **1.** Different region with the feature | Low, if available |
| **2.** Human-executed schema scripts | Days per change cycle, no tooling dependency |
| **3.** Dataverse solution file (.sln) exported and imported by an admin | One-time import, manual for later changes |

**Option 3 is viable for the whole build.** We produce a versioned solution file; an admin imports it. It is slower than MCP but entirely workable, and it removes the tooling dependency for good.

---

## 6. Reply template

> **Environment:** `org88dbd85e` — trial or production?
> **Request 1 (consent):** done / blocked
> **Request 2 (MCP feature):** done / blocked / **feature not present in region**
> **Request 3 (env created):** name ____________
> **Request 4 (licensing):** approved / pending
> **InfoSec:** reviewed / pending
> **Notes:** ____________
