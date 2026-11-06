# Connected — and an Important Finding
**Date:** 2026-09-29 · **Who:** bipul.sikder@fedex.com

---

## You are connected

```
Connected as   bipul.sikder@fedex.com
Connected to   MyFedEx (Upgrade)
Org URL        https://org82af9582.crm.dynamics.com/
Environment    Default-b945c813-dce6-41f8-8457-5a12c2fe15bf
Status         Active
```

**Stage 2 passed.** The CLI is authenticated, the environment is reachable, and every command from here works.

For the record, you have access to four environments:

| Environment | URL | What it is |
|---|---|---|
| **MyFedEx (Upgrade)** | `org82af9582.crm.dynamics.com` | ← you are here. **The tenant's DEFAULT org** |
| FXE_FinancialSystemsPROD | `org4242c5c3.crm.dynamics.com` | Financial Systems — production |
| FXE_FinancialSystemsTEST | `orga80b9c21.crm.dynamics.com` | Financial Systems — test |
| FXE_MEISA_PROCESS_AUTO | `org1246624b.crm.dynamics.com` | Process automation |

---

## The finding: this is a live shared environment, not a dev space

I looked before writing anything. Here is what `MyFedEx (Upgrade)` actually is:

| Signal | Value | What it means |
|---|---|---|
| **Solutions present** | **1,996** | Nearly two thousand live solutions |
| Internal FedEx solutions | 20 named `FXE_*` / `FXF_*` | Other people's work in progress |
| Base currency | **US Dollar ($)** | Not the India cargo operation |
| Organization state | Active, version `1,626,312,723` | Heavily used, long-lived |
| Environment ID | `Default-b945…` | **This is the tenant's default org**, shared by everyone |

**I am deliberately not creating the tables here yet.**

Three reasons:

1. **It is the default org.** Every user in the FedEx tenant lands in it. Anything I add is visible tenant-wide and cannot be cleanly hidden.
2. **1,996 solutions means ~1,996 owners.** Importing a solution publishes changes into a database other teams are actively using. A name collision, a broken dependency check, or a publish failure would surface as *their* problem, not mine.
3. **Wrong currency and wrong scope.** Base currency is USD. Our fee tables are INR. This org is not the India cargo operation — it is the tenant's shared default.

Your manager's access request is still correct and still needed for production. But **this org is not where a demo belongs**, and I would rather tell you that now than after importing something.

---

## What I checked, and what I did not

**Checked** — read-only, no writes:

- `pac auth list` / `pac auth who` — connection confirmed
- `pac env list` — four environments found
- `pac env list-settings` — currency, state, version
- `pac solution list` — 1,996 solutions enumerated
- Prefix collision search for `cd_` and `trace_` — **no collisions**, the prefix is free

**Not done, deliberately:**

- Did not create the solution
- Did not create any table
- Did not import or publish anything
- Did not touch any existing solution

I have not written a single byte to this environment.

---

## The fix: a proper developer environment

Two minutes of work, and the build becomes safe.

### Sign up for the free Power Apps Developer Plan

`https://www.microsoft.com/en-us/power-platform/products/power-apps/free`

Sign in with your FedEx work email. You get your own environment with:

- Full Dataverse
- Power Apps and Power Automate
- Premium connectors, AI Builder
- **Nothing shared with 1,996 other solutions**
- No approval needed

One note: base currency in the new environment will default to whatever the signup form offers. **Set it to INR (₹)** — our fee tables are rupee-denominated, and changing the base currency later on a populated environment is painful.

### Then run

```bash
pac auth create --environment "YOUR-NEW-ENV-URL"
pac auth select
pac env who
```

`pac auth select` matters: you will now have two profiles. It marks one as active so I do not deploy into the wrong tenant by accident.

---

## Guardrail I will add regardless of which environment we use

Before any deploy, I will require:

```bash
pac env who     # must show the intended environment
```

Every single time, before every `pac solution sync`. If the active profile is ever wrong, we find out in one command instead of after an import. Cheap check, prevents the expensive mistake.

I will also keep the two profiles clearly named so `pac auth select` is never a guess.

---

## Where we are

| Stage | State |
|---|---|
| 0 — Mac tooling | ✅ done, pac 2.12.2 |
| 1 — Environment | ⚠️ connected to FedEx default org. **Not suitable for the build** |
| 2 — Connect | ✅ CLI authenticated and working |
| 3 — Build | ⬜ waiting on a clean environment |
| 4 — Show GCC | ⬜ |
| 5 — FedEx production | ⬜ needs your manager's request |

**You are one sign-up away from starting the actual build.**

---

## Two updates for your manager

### 1. The access request gets simpler

Doc 24 asked to *create* an environment. That was written before we knew `MyFedEx (Upgrade)` already exists and you can open it. The real ask is narrower:

> Grant **write access to the existing default environment**, or provision a dedicated FedEx environment with the India/GCC region and INR base currency.

Narrower asks get approved faster. I will revise doc 24 once we know which of the two you want.

### 2. A currency finding worth flagging

The default org's base currency is **USD**. If the production Clearance Desk environment is also USD, then our fee tables need an explicit currency column rather than assuming INR. Worth putting in front of your manager as a question, not a decision.

---

## Your next step

**One command path:**

1. Open `https://www.microsoft.com/en-us/power-platform/products/power-apps/free`
2. Sign in, request the Developer Plan
3. **Set base currency to INR (₹) during signup**
4. Come back and run:

```bash
pac auth create --environment "YOUR-NEW-ENV-URL"
pac auth select
pac env who
```

**Send me the `pac env who` output.** If it shows your new environment, I write the 10 tables immediately and you deploy with `pac solution sync`.

---

**Nothing was changed in FedEx systems. Your account is connected, nothing was written, and nothing needs unwinding.**

---
*Contact: Bipul Sikder · Trace / Clearance Desk*
