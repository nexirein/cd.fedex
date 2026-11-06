# Step-by-Step: From Your Mac to a Working Demo
## One Stage at a Time. Nothing Skipped.

**For:** Bipul Sikder
**Purpose:** the exact sequence, with each stage's goal, what you do, what I do, and how you know it worked.
**Read time:** 5 minutes. Then just follow Stage 0.
**Command source:** every `pac` command below was verified on this machine against pac 2.12.2. See `32Verified_CLI_Reference_pac_2.12.2.md`.

---

## The whole thing in five lines

```
STAGE 0  Tooling on your Mac              30 min   no approval
STAGE 1  Get an environment               30 min   no approval
STAGE 2  Prove the file loop works        20 min   no approval
STAGE 3  Build the demo                   2 weeks  no approval
STAGE 4  Show GCC, get the go-ahead       1 day
STAGE 5  FedEx tenant (needs IT)          after    IT approval
```

**Stages 0–4 need nobody's permission.** You can be demoing before your manager's access request is actioned. That is the point of doing it this way.

---

# STAGE 0 — Tooling on your Mac
**Goal:** your Mac can talk to a Microsoft environment.
**Needs approval:** none. **Time:** 30 minutes.

## What you do

> **You use Trae, not VS Code. That is fine — no change needed.**
> Everything in this guide runs in a terminal, and Trae has an integrated terminal.
> Do not install VS Code. Skip straight to 0.2.

**0.1 — (skipped — you already have an IDE)**

**0.2 — Install .NET (needed by the Microsoft CLI)**

Run this alone, and let it finish. It is a 225 MB download:

```bash
brew install --cask dotnet-sdk
```

**Wait for the prompt to come back.** Do not paste the next command until it does.

**0.3 — Install the Power Platform CLI**

```bash
dotnet tool install --global Microsoft.PowerApps.CLI.Tool
```

**0.4 — Put the CLI on your PATH**

```bash
echo 'export PATH="$PATH:$HOME/.dotnet/tools:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**0.5 — Verify**

```bash
which pac && pac --version
```

## Run these from Trae

Either terminal works. In Trae: **Terminal → New Terminal** (`Cmd+\``), or use your regular Terminal app. Same shell, same commands.

## How you know Stage 0 worked

- `which pac` prints a path like `/Users/you/.dotnet/tools/pac`
- `pac --version` prints **2.4.1 or higher**

## What I do

Nothing yet. Send me the output of `pac --version` and I move you to Stage 1.

## If it goes wrong

| Problem | Fix |
|---|---|
| `brew: command not found` | Homebrew is not installed. Run `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"` then `brew --prefix` |
| `dotnet: command not found` | The install did not finish. Re-run 0.2 and wait |
| `pac: command not found` | 0.4 did not take. Run it again, then open a new terminal |
| `pac --version` shows 1.x | `pac install latest` |
| Download stops or dies | `brew install --cask dotnet-sdk` again — it resumes |
| `zsh: command not found: #` | You pasted comment lines. Harmless, ignore them |

---

# STAGE 1 — Get an environment
**Goal:** somewhere to build that is not the FedEx production tenant.
**Needs approval:** none. **Time:** 30 minutes.

## Why this stage exists

You asked for an environment in the FedEx tenant. That request is with your manager and it is correct. **But you do not need to wait for it to build a demo.**

A development environment of your own gets you moving today, keeps real FedEx data out of an experiment, and means an IT delay does not block you.

## What you do — pick one

### Option A — Power Apps Developer Plan (fastest, recommended)

Anyone with a work or school email backed by Microsoft Entra ID can sign up.

1. Go to `https://www.microsoft.com/en-us/power-platform/products/power-apps/free`
2. Sign in with your FedEx work email
3. Request the **Power Apps Developer Plan**

You get: **full Dataverse, Power Apps, Power Automate**, premium connectors, AI Builder, custom connectors. In a developer environment of your own.

**Takes about 10 minutes and is the fastest route.**

> One condition worth knowing: the tenant must allow "viral" licences for a developer environment to provision. If sign-up is blocked, that is a tenant setting — mention it and use Option B.

### Option B — a trial environment in the FedEx tenant

1. `https://admin.microsoft.com` → **Billing + licenses** → **Marketplace**
2. Find **Power Apps** or **Dynamics 365** trial
3. Subscribe

May be blocked by tenant policy, which is the same wall as your access request.

### Option C — Microsoft 365 E5 developer sandbox

Full M365 E5, 25 users, 90 days renewable. Includes everything.

**Slower** — needs a billing account, and eligibility is limited to Visual Studio subscribers, ISV Success, AI Cloud Partner Program, or Premier/Unified Support customers. Check your dashboard first.

## How you know Stage 1 worked

You can log in to `https://make.powerapps.com` and see the environment listed.

## What I need from you

1. **The environment URL** — `https://yourorg.crm.dynamics.com`
2. **The environment name**

**Get the URL:** `make.powerapps.com` → gear icon (top right) → **Session details** → **Instance URL**

> Not the Web API URL. The one you gave me earlier (`...api.crm.dynamics.com/api/data/v9.2`) is the OData endpoint. You want the plain environment URL.

---

# STAGE 2 — Prove the file loop
**Goal:** confirm you can pull a Microsoft environment onto your Mac as text files, and push it back.
**Needs approval:** none. **Time:** 20 minutes.

**This is the important stage.** If it works, everything after it is just me writing files.

## 2.1 — Connect

```bash
pac auth create --environment "YourEnvironmentName"
```

Your browser opens. Sign in. MFA. Done.

If the browser redirect is blocked:

```bash
pac auth create --environment "YourEnvironmentName" --deviceCode
```

It prints a code and a URL. Open the URL on any device, type the code, sign in.

## 2.2 — Confirm

```bash
pac auth list
pac auth who
```

> Note: it is `pac auth who`, **not** `whoami`. Verified against pac 2.12.2.

## 2.3 — Set up the project

```bash
mkdir -p ~/dev/clearance-desk && cd ~/dev/clearance-desk
git init
```

## 2.4 — Create the solution project

```bash
pac solution init --publisher-name "Trace" --publisher-prefix "cd" --outputDirectory ./src
ls -R src
```

`--publisher-prefix cd` means every object we create is named `cd_…` — `cd_shipment`, `cd_case`, `cd_prealert`. Short, readable, no collision with Microsoft tables.

## How you know Stage 2 worked

- `pac auth list` shows your profile with a `*`
- A `src/` folder exists on your Mac

## What I do

Once Stage 2 passes, I take over the file writing. That is where the real work starts.

## The deploy command, for reference

```bash
pac solution sync --solution-folder ./src
```

One command, local folder straight to Dataverse. No zip. This is what I run at the end of each build day.

---

# STAGE 3 — Build the demo
**Goal:** the working cargo demo. **Needs approval:** none. **Time:** 2 weeks.

## The order, and why this order

| Week | Day | What gets built | You can show |
|---|---|---|---|
| **1** | Mon | 10 tables as YAML. Seed 28 synthetic shipments | A real schema exists |
| **1** | Tue | Upload screen + validation flow | **Upload an Excel → cases appear. Zero re-keying** |
| **1** | Wed | ⭐ **CHECKPOINT** — enrichment, TIF→PDF, template selection | **End-to-end case creation** |
| **1** | Thu | Batch board, pre-flight check, send flow | **First pre-alert sent, zero attachments** |
| **1** | Fri | Customer link + upload | **Two-way customer flow** |
| **2** | Mon | CONSOL merge + IGM panel | **IGM handoff works** |
| **2** | Tue | Reminder sweeper | **Reminders fire, cap at 3, stop on reply** |
| **2** | Wed | Payment check + DO issue | **Loop closes** |
| **2** | Thu | Three-path classifier + exception board | **The differentiator** |
| **2** | Fri | Timeline, demo script, rehearsal | **Rehearsed demo** |

**Wednesday of week 1 is the checkpoint.** Show your manager then — not in two weeks. If the approach is wrong, you find out in four days.

## What I write each day

All as files in `~/dev/clearance-desk/src/`:

| I write | Format | Deployed by |
|---|---|---|
| Tables | YAML | `pac solution pack` → `import` |
| Flows | JSON (`modernflows/`) | same |
| Canvas screens | YAML (`.pa.yaml`) | same |
| Customer link | HTML + Liquid | `pac pages upload` |

## Your job each day

1. Read the `git diff`
2. Say yes or no
3. Commit
4. Let me deploy

**That is it.** You never open Power Apps Studio.

## One thing I will ask you for

**Around week 2, someone needs to open the canvas app once in Power Apps Studio** to confirm the layout renders. It is Windows-only, so it needs a colleague or a remote Windows machine.

Microsoft's own docs position `.pa.yaml` edits as minor, and PCF code components can break the app if edited. I will not claim the layout is perfect without someone seeing it.

**Say "no problem, someone will look" early** so it is not a surprise. Or we accept a first version that is structurally right and needs a visual pass.

## How you know each day worked

| Day | You should be able to do this |
|---|---|
| Tue | Upload the synthetic UBOND Excel and see cases created |
| Wed | See a case with an enriched record and a converted invoice |
| Thu | See a pre-alert in a test mailbox with a link and no attachments |
| Fri | Open the link, upload a document, see the checklist tick |
| W2 Mon | Upload CONSOL and see MAWB/IGM written back |
| W2 Tue | See a reminder fire on schedule |
| W2 Wed | Verify a payment and issue a DO |
| W2 Thu | See the AI-vs-human board with 14 handled and 3 waiting |

---

# STAGE 4 — Show GCC
**Goal:** get the go-ahead for Stage 5.
**Time:** 1 day. **Needs approval:** none.

## The demo order — this matters

| # | Show | The point |
|---|---|---|
| 1 | **Trace types one AWB** | The manual step is gone |
| 2 | **Link opens** — invoice converted, fixed docs listed, nothing attached | Attachments replaced |
| 3 | **Customer uploads** | The external half works |
| 4 | **IGM confirms payment → DO issues → shipment releases** | ⭐ **The loop closes. Lead here if time is short** |
| 5 | **AI vs human board** — 14 auto, 3 waiting | The reduction is visible, not claimed |
| 6 | **A deliberately broken case** | ⭐ **Credibility moment** |
| 7 | **Timeline on one AWB** | A process model, not a mailer |

**Items 4 and 6 are the two that convince people.** Everything else supports them.

## What to say, and what to admit

**Say:** the flows are the production flows, the schema is a strict subset of the 34-table design, the data is synthetic, the canvas layout needs one visual pass.

**Do not claim:** production readiness, real integrations, or that Compliance has signed anything.

A demo that admits its boundaries gets taken seriously. One that overclaims gets audited, and you lose the room.

## The pitch

> *"Cargo clearance today is one person typing emails by hand from 06:00, and chasing IGM for payment status all day. This is the same process, running on the platform FedEx already uses. One Excel upload, and everything after is automatic or a decision a person should be making. The flows do not change when we move to production — only what they connect to."*

---

# STAGE 5 — FedEx tenant
**Goal:** production. **Needs approval:** your manager's access request.
**Time:** after IT acts.

## What happens

1. Your manager approves the request (doc 24)
2. IT provisions an environment, or you use `MyFedEx (Upgrade)` once it is confirmed fit
3. `pac auth create --environment "FedEx env"`
4. `pac solution import --path ./clearance.zip --publish-changes`
5. Bind the connection references — Office 365, Dataverse, SharePoint
6. Real data, real email, real send-as

## What unlocks at this stage, and the numbers

| | Manual work | What is left |
|---|---|---|
| Today | 100% | Everything |
| **After the demo** | **20%** | Genuine exceptions, judgement, IGM confirmation |
| **After production + ACCS write-back + bank feed** | **5%** | Irreducible. Exceptions and Compliance |

Present these as goals until measured. And **never claim 0% manual in customs clearance** — that is how you lose credibility.

## What I will need from you at this point

| Item | Where |
|---|---|
| FedEx environment URL | `make.powerapps.com` → Settings → Session details |
| System Customizer role | Your manager, doc 24 Request 4 |
| ACCS API access | IT — write-back is the biggest single win |
| Bank statement feed | Finance |
| Compliance sign-off | Compliance. **Blocks go-live** |

---

# STAGE 6 — MCP, later
**Optional.** Worth it, not urgent.

Once IT enables the Dataverse MCP server, I can create and modify tables **live** instead of via files. Faster for iteration.

**But Stages 0–5 do not need it.** Do not let the access request block your build. That is why we start in a developer environment.

---

# Your next 45 minutes

Trae's terminal. Cmd + backtick. Run each block separately, in order.

**Block 1 — install .NET. Wait for it to finish. (10 min)**

```bash
brew install --cask dotnet-sdk
```

**Block 2 — install the CLI, fix PATH, verify. (2 min)**

```bash
dotnet tool install --global Microsoft.PowerApps.CLI.Tool
echo 'export PATH="$PATH:$HOME/.dotnet/tools:$PATH"' >> ~/.zshrc
source ~/.zshrc
which pac && pac --version
```

**Block 3 — while that installs, in a browser. (10 min)**

Sign up for the **Power Apps Developer Plan** at `https://www.microsoft.com/en-us/power-platform/products/power-apps/free`

**Then send me two things:**

1. The output of `which pac && pac --version`
2. Your environment URL from `make.powerapps.com` → gear → Session details

**That is it. Three blocks and one sign-up, and you are at Stage 1.**

---

## Summary of what is and is not blocked

| Blocked on IT | **Not** blocked |
|---|---|
| FedEx production tenant | ✅ Building the demo |
| Dataverse MCP | ✅ File-based development |
| ACCS write-back | ✅ The whole Phase 1 build |
| Bank feed | ✅ Synthetic data testing |
| Compliance sign-off | ✅ Showing GCC |
| Production licences | ✅ Rehearsing the demo |

**One unblock gets you building. Do not wait for the other six.**

---

**Contact:** Bipul Sikder · Trace / Clearance Desk
