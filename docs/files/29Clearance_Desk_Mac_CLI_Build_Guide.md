# Mac → FedEx Environment: The File-Based Build Guide

**For:** Bipul Sikder · building from a personal MacBook (arm64, macOS 15.6.1)
**Purpose:** what can be edited as files and AI-authored from this Mac, what cannot, and the exact CLI path to deploy to a FedEx/Microsoft environment.
**Verified against:** Microsoft Learn, Power Platform CLI docs, 2026-08/09.

---

## 1. The answer, without the sales pitch

**You cannot get one file format that covers Power Apps + Power Automate + Power Pages.** I checked, and I would rather tell you now than after you have built against that assumption.

| Product | File-based / AI-editable? | Why |
|---|---|---|
| **Power Pages** | **Yes — properly** | Site content downloads to YAML + HTML + CSS on your disk. `pac pages download` / `upload` is GA. Real git workflow. |
| **Power Apps (canvas)** | **Barely, and it is deprecated** | `.msapp` is a binary package. `pac canvas pack/unpack` exists but Microsoft has marked it **deprecated** and points to a newer Git integration instead. It is preview, not a foundation to build on. |
| **Power Automate** | **No** | Flows are defined in Dataverse tables, edited in the browser. There is no supported CLI author path. |

**So the correct first test is Power Pages.** It is the one product where "edit files on my Mac, AI writes them, deploy with one command" is genuinely true today.

That is not a consolation prize. The customer link is the screen the consignee actually touches, it is the differentiator in the demo, and it is the only piece of this system where the file workflow is real rather than aspirational.

**Power Apps and Power Automate get built in the browser.** That is a normal way to work and it is what 99% of Power Platform teams do. But those are browser tools, not Mac CLI tools, and I am not going to pretend otherwise.

---

## 2. Your Mac right now

| Tool | Status | Needed for |
|---|---|---|
| Node | v24.18.0 ✅ | nothing here, but fine |
| npm | 11.16.0 ✅ | — |
| git | 2.39.5 ✅ | source control |
| Homebrew | ✅ at `/opt/homebrew/bin/brew` | installing .NET |
| **.NET SDK** | **MISSING** | **required for `pac` CLI** |
| **VS Code** | **MISSING** (only Trae's bundled `code` binary) | recommended for YAML/Liquid editing |
| **Power Apps Studio** | **N/A — Windows only** | cannot be installed on macOS. No workaround |

Two things to fix, both in about five minutes. Commands at §4.

---

## 3. Why `pac` is the right tool, with two real limits

`pac` (Power Platform CLI) is Microsoft's own tool and it works on macOS. Two caveats you need to know, both from the docs:

**Caveat 1 — three commands are Windows-only:**

```
pac data
pac package deploy
pac package show
```

If a build guide you find online uses `pac package deploy`, it will not run on your Mac. That is the single most common way people get stuck.

**Caveat 2 — `pac canvas pack/unpack` is deprecated.** Microsoft now directs canvas app source control to a separate Git integration. The commands still work, but you would be building on a preview surface with a deprecation notice on it.

Neither limit touches Power Pages, Dataverse, or solutions. Those are the parts we need.

---

## 4. Install — five minutes

```bash
# 1. .NET SDK (required by pac) — this is the only hard dependency
brew install --cask dotnet-sdk
# restart your terminal after this, or: source ~/.zshrc

# 2. Power Platform CLI
dotnet tool install --global Microsoft.PowerApps.CLI.Tool

# 3. put the tool path on PATH (Apple Silicon)
echo 'export PATH="$PATH:$HOME/.dotnet/tools:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 4. verify
which pac && pac --version

# 5. VS Code — the good Liquid/YAML editor
brew install --cask visual-studio-code
```

**If you prefer not to install .NET:** use the VS Code extension route. Install VS Code, add the *Power Platform Tools* extension, and `pac` becomes available inside the VS Code terminal. Same tool, no separate .NET install. This is the lower-friction path and I would take it.

**Do not try to install Power Apps Studio.** It is Windows-only. It will not run natively, and a Windows VM defeats the point of building from your Mac.

---

## 5. Connect — one-time, interactive, no passwords

`pac` authenticates through the browser. **It never asks for a password or a client secret, and you should never give me either.**

```bash
# list environments in your tenant
pac env list

# connect — pick the environment by name, URL, or ID
pac auth create --environment "MyFedEx (Upgrade)"

# if your tenant blocks the interactive browser redirect
pac auth create --environment "MyFedEx (Upgrade)" --deviceCode
```

`--deviceCode` prints a code and a URL. Open the URL, type the code, sign in with MFA. That is the whole flow.

**Then check it worked:**

```bash
pac auth list                    # should show your profile with a * for active
pac env whoami                   # confirms which environment you're pointed at
```

### What I need from you

| # | Item | How to get it | Why |
|---|---|---|---|
| 1 | **Environment URL** | Power Platform admin centre → Environments → your env → Details. Copy the URL, looks like `https://yourorg.crm.dynamics.com` | `pac auth create --environment` |
| 2 | **The exact environment name** | Same page, top of the pane | Confirms you are pointed at the right one |
| 3 | **Your FedEx login email** | you know it | `pac auth create` |
| 4 | **A few minutes with your phone for MFA** | — | The browser sign-in |

**That is all. No web app link. No API key. No connection string. No client secret.** If anyone asks you for those to set up a CLI, it is not us.

One thing to flag: the environment URL you gave me earlier was the **Web API** host:

```
https://org82af9582.api.crm.dynamics.com/api/data/v9.2
```

That is the OData endpoint, **not** the environment URL. `pac auth create` wants the latter — same environment, no `api/data` in the path. The admin centre gives you the right one.

---

## 6. The test — prove file → env round-trip in 10 minutes

This is the smallest possible end-to-end proof. Do it before writing any of the real site.

```bash
mkdir -p ~/dev/clearance-desk-test
cd ~/dev/clearance-desk-test

# 1. see what portal sites exist in the environment
pac pages list

# 2. download one (note the siteId it prints)
pac pages download --path ./site-src --webSiteId <siteId> --modelVersion 2

# 3. look at what landed
find ./site-src -type f | head -40
```

**What you get is real, editable, committable content:**

```
site-src/
  adx_webpage/
    Home/
      adx_webpage.yml       ← page settings
      copy/
        en-us/
          <hashed>.1.en-us.webpage.copy.html   ← the actual HTML
  adx_webtemplate/
  adx_contentsnippet/
  adx_sitesetting/
  manifest.yml
  <org>-url-manifest.yml
```

Those HTML and YAML files are **plain text**. I can write them. Git tracks them. You can diff a change and see exactly what changed. That is the whole promise of the file-based workflow, and for Power Pages it is real.

**Then change one thing and push it back:**

```bash
# edit any .html in copy/ — add a visible marker
# then:
pac pages upload --path ./site-src --modelVersion 2
```

**If that round-trip works, the entire Mac-to-FedEx loop is proven.** Every subsequent change is: edit a file, I write it, you commit, one command deploys.

### Deployment profiles — the thing that makes this safe

Do not hardcode environment values into the files. `pac pages upload` accepts a profile:

```bash
pac pages upload --path ./site-src --deploymentProfile test --modelVersion 2
```

which reads `deployment-profiles/test.deployment.yaml` for GUIDs and per-environment values. Dev / test / prod, one source tree, different targets. That is how you avoid the classic mistake of pointing production at a test table ID.

**Also read this before your first upload:** the environment manifest (`<org>-url-manifest.yml`) should be **gitignored**. It is local state for one environment and will cause you pain if you commit it.

---

## 7. What this means for the three products

### Power Pages — build it this way ✅

The customer link, the shipment page, the payment block, the document checklist. HTML + Liquid + CSS on your Mac, `pac pages upload` to deploy. This is the customer-facing half of the demo and the file workflow is genuine.

Bonus: you can run it locally before deploying. Any static server serves the HTML, so the loop is edit → view → fix → deploy. No environment needed to see the design.

### Power Apps (canvas) — build it in the browser ⚠️

Power Apps Studio is Windows-only. The canvas app you show in the demo is authored in the browser at `make.powerapps.com` — the web-based authoring experience is fully supported and is what most makers use.

You *can* round-trip to files with `pac canvas download` / `unpack` / `pack`, but:
- `pack`/`unpack` are **deprecated** in favour of a newer Git integration
- the format is a binary package that unpacks into nested JSON plus `.fx.yaml`
- merge conflicts in `DataSources`, `pkgs`, and `CanvasManifest.json` are documented as **not safe to merge**

**Recommendation: build the canvas app in the browser.** Use `pac` for Dataverse and Power Pages, and keep canvas authoring in the studio. Mixing a deprecated pack/unpack loop into a demo you are presenting to GCC is risk with no upside.

### Power Automate — build it in the browser ❌ no file path

Cloud flows are defined in Dataverse and edited at `make.powerautomate.com`. There is no supported CLI author path. This is expected and normal.

**What I can still do for you**, and it is most of the work:
- Write the full flow logic as a design spec — triggers, branches, conditions, retry and idempotency rules
- Generate the exact connector configuration and the SharePoint/Dataverse schema the flows read and write
- Write the Power Fx expressions
- You transcribe into the browser, or I generate it and you paste

The flows are the part I have already specified in detail (doc 28, `F01`–`F28`). The browser step is assembly, not design.

---

## 8. Recommended setup

```
~/dev/clearance-desk/
  docs/                    # all the specs, markdown, committed
  site-src/                # Power Pages, downloaded via pac
  deployment-profiles/
    dev.deployment.yaml
    test.deployment.yaml
  flows/                   # flow specs as markdown + connector config
  schema/                  # Dataverse table definitions
  .gitignore               # includes *-url-manifest.yml
```

**The git repo is the point.** Specs, page source, flow definitions and schema in one versioned tree, reviewed with a diff, deployed with one command. That is how a developer hands this to a GCC team and how they can see it was built deliberately.

---

## 9. The honest summary

| Question | Answer |
|---|---|
| Can I build all three from my Mac with AI writing the files? | **No.** Power Pages yes, properly. Power Apps barely, on a deprecated surface. Power Automate no. |
| Is the Power Pages file workflow real? | **Yes.** GA CLI, plain-text HTML/YAML, git-friendly, one-command deploy. |
| What do I need from you? | **Environment URL, exact environment name, your login, and MFA.** Nothing else. No secrets. |
| Does it need the tenant access request first? | **No** — a standalone trial environment works for this. It also unblocks the demo independently of the IT approval. |
| Can I deploy to other agents' systems? | **Yes** — profiles, one source tree, per-environment targets. |

**What I would do next, in order:**

1. Install VS Code + the Power Platform extension (or `.NET` + `pac` directly)
2. `pac auth create` against a **trial** environment — not the FedEx tenant, keeps it clean
3. Run the §6 round-trip test. Ten minutes, and it proves everything
4. Then we build the real customer link as files

The trial environment matters here for the same reason it mattered for the demo: it does not wait on the access request, and it keeps real FedEx data out of a first experiment.

**Contact:** Bipul Sikder · Trace / Clearance Desk
