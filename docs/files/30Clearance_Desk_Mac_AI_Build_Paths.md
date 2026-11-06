# Building Power Apps + Power Automate + Power Pages from a Mac with AI
## The Full File-Based / MCP Path — Corrected and Verified

**For:** Bipul Sikder · personal MacBook (arm64, macOS 15.6.1)
**Purpose:** the complete verified path for AI-authored, file-based, git-committed development against a Microsoft environment from a Mac.
**Status:** verified against Microsoft Learn and Microsoft blog, 2026-09.
**Supersedes:** the "Power Automate has no file path" claim in doc 29. I was wrong. See §1.
**Command corrections:** all `pac` commands here were re-verified against pac 2.12.2 on this machine. See `32Verified_CLI_Reference_pac_2.12.2.md` for the authoritative command list.

---

## 1. Correction — I was wrong, and here is exactly where

Doc 29 said Power Automate has no supported CLI file path and Power Apps is barely editable. **Both claims were out of date.** The video you watched is real. Three things changed that I missed:

| What I said | Reality |
|---|---|
| "Power Automate — no file path" | **Flow definitions are multi-line JSON**, exported by `pac solution unpack` into `Workflows/*.json`. Fully AI-authorable. Multi-line formatting landed in Feb 2022 specifically for git |
| "Canvas apps — deprecated pack/unpack" | `pac canvas pack/unpack` are **Preview** in 2.12.2, not deprecated — I misread older docs. The real answer is `pac solution clone`, which extracts canvas apps as **YAML** |
| "Power Apps is browser-only" | **`.pa.yaml` files are human-readable source** with official Git integration, and `pac solution clone` puts them on your disk |

**The one thing that is still true:** Power Apps *Studio* is Windows-only. But Studio is the GUI. The *source files* are cross-platform, and that is what an AI writes.

So the answer is: **yes, all three, from your Mac, with me writing the files.** Here is the mechanism for each.

---

## 2. The three mechanisms, and which is which

| Product | Mechanism | What lands on your Mac | Maturity |
|---|---|---|---|
| **Power Pages** | `pac pages download` / `upload` | HTML, Liquid, CSS, YAML | **GA** |
| **Power Automate** | `pac solution export` → `unpack` | `modernflows/*.json` | **GA** |
| **Power Apps** | `pac solution clone` | `canvasapps/*/Src/*.pa.yaml` | **GA** (needs CLI ≥ 2.4.1) |
| **All three, in one tree** | `pac solution clone` | Everything above + tables, connectors, env vars | **GA** |
| **Dataverse, live** | Dataverse MCP server | No files — the AI calls tools | **GA** |

Two paths, used together:

- **Files + git** — for everything. I write source, you review the diff, you commit, one command deploys.
- **MCP** — for reading and writing live data. I create tables and records directly in the environment.

**Neither requires you to touch Power Apps Studio on Windows.**

---

## 3. Path A — the whole system as files (this is the one to start)

### 3.1 Setup on your Mac

```bash
# .NET SDK — required by pac
brew install --cask dotnet-sdk
source ~/.zshrc

# Power Platform CLI (v2.4.1+ needed for YAML source format)
dotnet tool install --global Microsoft.PowerApps.CLI.Tool
echo 'export PATH="$PATH:$HOME/.dotnet/tools:$PATH"' >> ~/.zshrc
source ~/.zshrc

# verify
which pac && pac --version
```

**Alternative — no .NET:** install VS Code, add the *Power Platform Tools* extension, `pac` runs in the integrated terminal. Same tool. Lower friction. Either is fine.

**Check your version is new enough:**

```bash
pac --version    # must be 2.4.1 or later for the YAML source format
pac install latest   # if it isn't
```

### 3.2 Connect — interactive, no secrets

```bash
pac auth create --environment "YourEnvName"
pac auth who
```

Use `--deviceCode` if your tenant blocks the browser redirect. It prints a code and URL — open it, sign in with MFA. Done.

**Never give me a password or client secret.** `pac auth` handles credentials locally and I never see them.

**I need from you:** environment name (or URL), your login, and MFA on your phone. That is the whole list.

> The URL you gave me earlier — `https://org82af9582.api.crm.dynamics.com/api/data/v9.2` — is the **Web API** host. `pac auth create` wants the environment URL, same org, no `api/data` path. Get it from make.powerapps.com → Settings → Session details → Instance URL.

### 3.3 The command that changes everything

```bash
# Clone an entire solution as source files
pac solution clone --name YourSolutionUniqueName --outputDirectory ~/dev/clearance-desk

# or, if you already have a solution zip
pac solution export --name YourSolution --path ./exp.zip
pac solution unpack --zipfile ./exp.zip --folder ./src
```

**What lands in `~/dev/clearance-desk` — all plain text:**

```
src/
├── solutions/
│   └── YourSolution/
│       └── solution.yml
├── tables/                    ← Dataverse schema, YAML per table/column
│   └── cd_shipment/
│       └── cd_shipment.yml
├── modernflows/               ← Power Automate cloud flows, JSON
│   └── OnUBONDUpload.json
├── workflows/                 ← classic workflows, if any
├── canvasapps/                ← Power Apps, YAML (requires 2.4.1+)
│   └── cd_TraceApp/
│       └── Src/
│           ├── App.pa.yaml
│           ├── ScreenBatchUpload.pa.yaml
│           ├── ScreenCaseDetail.pa.yaml
│           └── ScreenIGMPanel.pa.yaml
├── connectors/
├── environmentvariabledefinitions/
├── connectionreferences.json
└── deployment-profiles/
    ├── dev.deployment.yaml
    └── prod.deployment.yaml
```

**Every file in that tree is something I can write.** `App.pa.yaml` and `[Screen Name].pa.yaml` are the documented, human-readable canvas app source. The flow JSON is Logic Apps Workflow Definition Language. The tables are YAML.

### 3.4 Deploy — one command

```bash
# pack back to a solution
pac solution pack --zipfile ./clearance.zip --folder ./src

# import to the target environment
pac solution import --path ./clearance.zip --activate-plugins --publish-changes
```

**Full loop:** you tell me what to build → I write the files → you read the `git diff` → you commit → one command deploys.

That is a real software engineering workflow on a Mac, for Power Apps and Power Automate, with no Windows in the chain.

---

## 4. Path B — Power Automate flows as AI-authored JSON

This is the part I got most wrong, so here is the detail.

### 4.1 Where the files come from

Flows must be **solution-aware** to export. Put each flow in a solution, then:

```bash
pac solution export --name YourSolution --path ./exp.zip
pac solution unpack --zipfile ./exp.zip --folder ./src
```

Flows land in `modernflows/` as **multi-line JSON** — one file per flow. Microsoft reformatted these away from single-line JSON in Feb 2022 specifically to make them diffable in source control. That is the whole point.

### 4.2 The shape of a flow file

```json
{
  "properties": {
    "connectionReferences": {
      "shared_office365outlook": {
        "connection": { "connectionReferenceLogicalName": "cx_office365outlook" },
        "api": { "name": "shared_office365outlook" }
      }
    },
    "definition": {
      "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
      "triggers": { "When_a_file_is_added": { "type": "OpenApiConnection", "kind": "Trigger", "inputs": {} } },
      "actions": {
        "Validate_rows": {
          "type": "Scope",
          "actions": {
            "Loop_over_rows": {
              "type": "Foreach",
              "foreach": "@{variables('awbList')}",
              "actions": {
                "Create_case": {
                  "type": "OpenApiConnection",
                  "runAfter": {},
                  "inputs": {
                    "host": { "connection": { "referenceName": "shared_dataverse" } },
                    "body": { "cd_name": "@{items('Loop_over_rows')?['awb']}" }
                  }
                }
              }
            }
          }
        },
        "Handle_errors": {
          "type": "Scope",
          "runAfter": { "Validate_rows": ["Failed", "TimedOut"] },
          "actions": {}
        }
      }
    }
  }
}
```

**I can write this.** Triggers, actions, conditions, `foreach` loops, scopes, `runAfter` error handling, Power Fx / Logic Apps expressions — all of it is structured text.

### 4.3 The three rules that make it work

| Rule | Why | What breaks without it |
|---|---|---|
| **Never hardcode a connection.** Every connector uses a symbolic name that maps to `connectionreferences.json` at the solution root | Connections differ per environment | Import fails, or silently binds the wrong account |
| **Register every flow in `Solution.xml` as a `RootComponent`** type `29` | Dataverse will not see an unregistered flow | Flow does not appear in the environment |
| **Wrap risky work in a `Scope` with a sibling `Handle_Errors` scope** on `runAfter: Failed` | That is try/catch in this language | One failure kills the whole run silently |

Expressions I will use throughout: `@{triggerOutputs()?['body/cd_awb']}`, `@{utcNow()}`, `@{if(equals(...),'Yes','No')}`, `@{parameters('cd_TestRecipient')}`.

### 4.4 The honest limitation

Building a flow's JSON from scratch is reliable **for flows whose shape I know**. Composing a brand-new flow with unusual nested logic blind, without being able to run it, carries real risk of a schema error.

**The mitigation that removes the risk:** start with a thin flow the platform can validate, then let me add structure. Or build in the browser once and `unpack` it — then the shape is real and I edit from a known-good baseline. Either way, the file is the deliverable, not a guess.

---

## 5. Path C — Power Apps canvas as `.pa.yaml`

### 5.1 What a screen file looks like

```yaml
Screen: ScreenCaseDetail
  SizingMode: Manual
  Height: 800
  Width: 1200
  Children:
    - LabelHeader:
        Control: Label
        Properties:
          Text: ="AWB " & Text(ThisRecord.cd_awb)
          Size: 18
          FontWeight: Bold
          Color: =RGBA(77, 20, 140, 1)
    - GalleryTimeline:
        Control: Gallery
        Properties:
          Items: =SortByColumns(Filter(cd_shipment_event, cd_case = ThisRecord.cd_case), "cd_createdon", Ascending)
          TemplateHeight: 72
    - ButtonSend:
        Control: Button
        Properties:
          Text: ="Send pre-alert"
          OnSelect: =Patch(cd_case, ThisRecord, {cd_sendstate: "sent"})
```

**I write this.** Screen names, control names, Power Fx properties, `Filter`/`SortByColumns`/`Patch` calls, colours as `RGBA()`.

### 5.2 The rules the docs are explicit about

| Rule | Reason |
|---|---|
| **Only use `.pa.yaml` files from `\Src`.** Do not touch the JSON | JSON is explicitly "not stable between save and load cycles" |
| **Avoid significant structural edits directly in the files** | Microsoft warns against it. Minor edits are the supported case |
| **Unique control names are mandatory** | Two controls named `Button1` will not load |
| **No code components (PCF) in the repo** | Editing `.pa.yaml` when the app contains PCF **prevents the app from running** |
| **Test in a dev environment before merging** | Standard |

**The honest read:** `.pa.yaml` is genuinely editable and it is what an AI writes, but Microsoft positions it as "minor edits" rather than full authoring. `ScreenGalleryTimeline` layout and `TemplateSize` nuances are not something I can verify without running Studio.

**Practical approach:** I write the screens, you or a Windows colleague opens them once in Studio to confirm layout, then it is in git and fine thereafter. Or we accept that the first version is structurally right and needs a visual pass.

---

## 6. Path D — Dataverse MCP (live, no files)

This is the other half, and it may be what your video showed. It works *alongside* the file path, not instead of it.

### 6.1 What it gives me

Dataverse exposes an **MCP server** with tools an agent can call directly:

| Tool | What I can do with it |
|---|---|
| `search` | Find tables and schemas by keyword |
| `describe` | Full detail on tables, records, schemas, **apps** |
| `read_query` | Run SQL `SELECT` |
| `create_table` | **Create a table with a schema** |
| `update_table` | Modify schema or metadata |
| `create_record` | Insert a row, get the GUID |
| `update_record` | Update a row |
| `init_file_upload` / `commit_file_upload` | File up/down via SAS |
| `upsert_skill` | Add a Dataverse playbook |

**`create_table` and `update_table` are the important ones.** That is the 34-table schema, created by an agent, live in the environment, with no Windows.

### 6.2 Connecting it — this is the part that needs admin

Two options, and this is the fork in the road:

**Option 1 — direct HTTP (simplest)**

```bash
# MCP endpoint: https://{your-org}.crm.dynamics.com/api/mcp
```

Add to `~/.copilot/mcp-config.json` (Copilot CLI) or your client's config:

```json
{
  "mcpServers": {
    "DataverseMcp": {
      "type": "http",
      "url": "https://your-org.crm.dynamics.com/api/mcp"
    }
  }
}
```

**Requires:** an admin to enable the Dataverse MCP server on the environment and allowlist your client.

**Option 2 — local proxy (Microsoft's documented path for Claude Code)**

```bash
dotnet tool install --global --add-source https://api.nuget.org/v3/index.json Microsoft.PowerPlatform.Dataverse.MCP
```

Then register with your tenant ID, environment ID, and a Dataverse connection URL you copy from make.powerautomate.com.

**Requires:** PPAC admin enablement, plus a Dataverse connection reference.

### 6.3 The honest catch

**This is exactly the access request already sitting with your manager.** Docs 24 and 25 item 2 — enable Dataverse MCP, allowlist the client, tenant consent. It is the same four items, and I had already scoped it correctly.

**Which means the file path (§3) and the MCP path (§6) are not alternatives — the file path does not need MCP.** You can clone, edit, and deploy the whole system from your Mac with nothing but `pac` and your own login. MCP is faster and more direct once granted.

That is the useful thing to know right now: **you are not blocked on IT for file-based work.** Only for the live MCP path.

**One cost note:** Dataverse MCP tool calls are billed at Copilot credit rates when used from agents outside Copilot Studio, from 15 Dec 2025. `search_data` is charged at the Tenant graph grounding rate; other tools follow the basic text rate. Your tenant may or may not have these credits. Worth a question to IT.

---

## 7. The recommended path for this project

| Step | What | Needs |
|---|---|---|
| 1 | `pac auth create` against a **trial** environment | Your login + MFA. No admin |
| 2 | `pac solution init` → empty repo on disk | Nothing |
| 3 | **I write the 10 tables** as YAML → `pac solution import` | Nothing |
| 4 | **I write the 8 Phase-1 screens** as `.pa.yaml` | Visual pass later in Studio |
| 5 | **I write the flows** as `modernflows/*.json` | One Studio validation run |
| 6 | **I write the customer link** as Power Pages HTML/Liquid | Nothing |
| 7 | Commit everything. `git log` becomes the audit trail | Nothing |
| 8 | Later: enable MCP, and I create/modify tables live | The access request |

**Steps 1–3 need no admin approval at all.** A trial environment is yours alone, no IT ticket, and the demo does not depend on the FedEx tenant. That is the whole point of starting here.

---

## 8. What I need from you — final, complete

| # | Item | Where to get it | Blocks |
|---|---|---|---|
| 1 | **Trial environment URL** | Create at make.powerapps.com → New environment, or admin centre | Steps 1–3 |
| 2 | **Environment name** | Same page | `pac auth create` |
| 3 | **Your login + MFA** | — | Sign-in |
| 4 | **FedEx environment URL** (later) | make.powerapps.com → Settings → Session details → Instance URL | FedEx deploy |
| 5 | **MCP enablement** (later) | PPAC → Environment → Settings → Features → Dataverse MCP | Live path |

**No web app link. No API key. No connection string. No client secret. Not for any step.**

---

## 9. One caution before you show this to GCC

The file-based workflow is real and I am confident in it for **schema, flows, and Power Pages**. Canvas app layout is the soft spot — `.pa.yaml` is editable, but Microsoft positions it as minor edits, and nobody should promise a pixel-perfect UI authored entirely by an AI with no one having opened it in Studio.

**Build the demo, show it, and be honest that the canvas layout needs one visual pass.** That is a normal engineering statement and it is far better than a demo that breaks on stage.

What you can state with confidence: the schema, the flows, the data model, the customer portal, the process — all of it is real, versioned, and AI-authored from a Mac.

---

## 10. Correction log

| Doc | Claim | Status |
|---|---|---|
| 29 §1 | "Power Automate: No — no supported CLI author path" | **Wrong.** `modernflows/*.json` via `pac solution unpack` |
| 29 §1 | "Power Apps: Barely, deprecated" | **Wrong for `pac solution clone`** which is GA and gives YAML. The deprecation applies only to `pac canvas pack/unpack` |
| 29 §7 | "Recommended: build canvas in the browser, don't mix deprecated pack/unpack" | **Still good advice**, but for a different reason — Studio validation, not deprecation |
| 29 §1 | "Power Pages: yes, properly" | **Correct** |
| 24 §5 | MCP request scope | **Correct**, and now better understood — this is the live path |

**Net:** the file-based path covers all three products. My earlier answer was under-researched. Thanks for pushing back.
