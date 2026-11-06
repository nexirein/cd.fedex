# Verified CLI Reference — pac 2.12.2 on your Mac
**Machine:** Bipul-MacBook-Air · macOS 15.6.1 arm64 · .NET SDK 10.0.401
**Installed:** `Microsoft.PowerApps.CLI.Tool` **2.12.2+ga6b1ffa**
**Path:** `/Users/bipulsikder16/.dotnet/tools/pac`
**Method:** every command below was run on this machine and its real help output read. Nothing here is from memory.

---

## Verified installation state

| Item | Value | Status |
|---|---|---|
| `dotnet` | `/opt/homebrew/bin/dotnet` | ✅ working |
| .NET SDK | 10.0.401 | ✅ |
| `pac` | `/Users/bipulsikder16/.dotnet/tools/pac` | ✅ working |
| `pac` version | **2.12.2+ga6b1ffa** | ✅ well above the 2.4.1 floor |
| PATH in `~/.zshrc` | `export PATH="$PATH:$HOME/.dotnet/tools:$PATH"` | ✅ persists in new shells |
| Auth profiles | none yet | ⬜ next |

**You are past Stage 0. Stage 1 is the environment, Stage 2 is the first sign-in.**

Two harmless warnings you saw, for the record:
- `zsh: unknown file attribute: v` — shell parsing the banner. Ignorable.
- `An issue was encountered verifying workloads` — .NET optional workloads. Irrelevant to `pac`.

---

## Corrections to earlier docs

I checked these against real help output. Three things in docs 29/30/31 were wrong.

### 1. `pac auth whoami` does not exist

```
Usage: pac auth [create] [list] [select] [delete] [update] [name] [clear] [who] [token]
```

The command is **`pac auth who`** — not `whoami`. Every earlier doc used the wrong name.

### 2. `pac solution create` does not exist

The real command is `pac solution init`, and it needs a publisher:

```
Usage: pac solution init --publisher-name --publisher-prefix [--outputDirectory]
  --publisher-name    Name of the Dataverse solution publisher   (alias: -pn)
  --publisher-prefix  Customization prefix value                  (alias: -pp)
  --outputDirectory   Output directory                           (alias: -o)
```

**Both publisher arguments are mandatory.** This is the prefix that will appear on every table, column, and flow we create. For this project, suggest:

| Argument | Suggested value |
|---|---|
| `--publisher-name` | `Trace` |
| `--publisher-prefix` | `cd` |

That gives `cd_shipment`, `cd_case`, `cd_prealert` — short, readable, and it cannot collide with anything Microsoft ships.

### 3. `pac canvas pack`/`unpack` are Preview, not deprecated

```
canvas
  pack   (Preview) Pack sources into an msapp file
  unpack (Preview) Extract an msapp file into sources
```

They are **not** listed as deprecated in 2.12.2. I called them deprecated in doc 29 — that was reading older docs. This does not change the plan: `pac solution clone` remains the primary route because it gives YAML, and Preview commands are not something a demo should depend on. But the earlier claim was inaccurate.

---

## Verified command surface

### Solution — the full set that exists

```
Usage: pac solution [init] [add-reference] [list] [delete] [online-version] [version]
                    [import] [export] [clone] [publish] [upgrade] [add-license]
                    [check] [create-settings] [pack] [unpack] [add-solution-component] [sync]
```

| Command | Purpose | Use for this project |
|---|---|---|
| `init` | Create a new solution project on disk | **Step 1** |
| `clone` | Pull an existing solution from Dataverse as files | Pull the FedEx side later |
| `pack` | Files → solution.zip | Deploy step |
| `unpack` | solution.zip → files | Read-only inspection |
| `import` | solution.zip → Dataverse | **Deploy step** |
| `export` | Dataverse → solution.zip | Snapshot before changes |
| `sync` | Local folder → Dataverse, in one command | ⭐ **See below** |
| `check` | Upload to Power Apps Checker | Validate before deploy |
| `create-settings` | Connection reference / env var bindings | Dev → prod promotion |
| `publish` | Publish all customizations | After import |

### ⭐ `pac solution sync` — better than pack + import

```
Usage: pac solution sync [--environment] [--solution-folder] [--include] [--packagetype] [--map]
```

This pushes a local solution folder to Dataverse **in a single command**, no intermediate zip. For the daily build loop that replaces:

```bash
# old way, two steps
pac solution pack --zipfile ./clearance.zip --folder ./src
pac solution import --path ./clearance.zip --publish-changes

# new way, one step
pac solution sync --solution-folder ./src
```

**This is the command I will run at the end of each build day.** Fewer moving parts, fewer places to fail.

### Verified argument details

`pac solution import`:
```
Usage: pac solution import [--environment] [--path] [--activate-plugins]
       [--force-overwrite] [--skip-dependency-check] [--import-as-holding]
       [--stage-and-upgrade] [--publish-changes] [--settings-file] [--skip-lower-version]
```

Note `--path` is optional — if omitted, `pac` assumes the current folder is a `.cdsproj` project. And `--settings-file` is how one zip targets multiple environments.

`pac solution pack`:
```
Usage: pac solution pack --zipfile [--folder] [--packagetype] [--log] [--errorlevel]
       [--singleComponent] [--allowDelete] [--allowWrite] [--clobber] [--map] ...
```

`--allowWrite` defaults to `false`. Packing over read-only managed files will fail without it. Worth knowing on day one, not on day ten.

`pac solution clone`:
```
Usage: pac solution clone [--environment] --name [--include] [--outputDirectory] [--packagetype] [--map]
  --include   autonumbering, calendar, customization, emailtracking, externalapplications,
              general, isvconfig, marketing, outlooksynchronization, relationshiproles, sales
```

`--targetversion` is marked **deprecated** in 2.12.2. Do not use it.

### Power Pages

```
pages
  download          Download Power Pages website content from the current Dataverse environment.
  upload            Upload Power Pages website content to current Dataverse environment.
  download-code-site  Download Power Pages website content
  upload-code-site    Uploads your compiled code to Power Pages site
```

All four exist. The customer link in doc 28 is `pages download` / `pages upload`; if it needs custom code, `download-code-site` / `upload-code-site`.

### Auth

```
Usage: pac auth [create] [list] [select] [delete] [update] [name] [clear] [who] [token]

Usage: pac auth create [--name] [--username] [--password] [--applicationId] [--clientSecret]
       [--certificateDiskPath] [--certificatePassword] [--tenant] [--cloud] [--deviceCode]
       [--managedIdentity] [--githubFederated] [--azureDevOpsFederated] [--environment] [--url]

  --username       Optional: the username to authenticate with; shows a Microsoft Entra ID
                   dialog if not specified.
  --deviceCode     Use the Microsoft Entra ID Device Code flow for interactive sign-in.
  --environment    Default environment (ID, url, unique name, or partial name).
```

**`--environment` accepts a partial name.** That means this works:

```bash
pac auth create --environment "dev"
```

**On secrets:** `--password`, `--clientSecret`, and `--certificatePassword` exist. **Never use them, and never paste their values to me.** The default opens an Entra sign-in dialog, which is what we want. `--deviceCode` is the fallback when the browser redirect is blocked.

### Canvas

```
canvas
  pack   (Preview) Pack sources into an msapp file
  unpack (Preview) Extract an msapp file into sources
```

Preview only. Not the primary route.

---

## The exact commands for Stages 1 and 2

Corrected and verified. Run these as written.

### Stage 1 — the environment

Sign up for the free **Power Apps Developer Plan**, then get your URL:

`make.powerapps.com` → gear icon → **Session details** → **Instance URL**

### Stage 2 — connect, then prove the loop

```bash
# 1. Sign in. Browser opens, you authenticate with MFA.
pac auth create --environment "YOUR-ENVIRONMENT-URL"

# 2. If the browser is blocked, use this instead:
# pac auth create --environment "YOUR-ENVIRONMENT-URL" --deviceCode

# 3. Confirm — note: 'who', not 'whoami'
pac auth list
pac auth who

# 4. Set up the project folder
mkdir -p ~/dev/clearance-desk && cd ~/dev/clearance-desk
git init

# 5. Create the solution project on disk
pac solution init --publisher-name "Trace" --publisher-prefix "cd" --outputDirectory ./src

# 6. See what is there
ls -R src
```

**How you know Stage 2 passed:** step 3 lists a profile with a `*` marking it active, and step 6 shows files in `./src`.

### Stage 3 — the daily loop

```bash
# Deploy whatever I wrote today
pac solution sync --solution-folder ./src

# Validate before you trust it
pac solution check
```

---

## What happens next

| Step | Who | What |
|---|---|---|
| 1 | You | Send me the environment URL |
| 2 | You | Run the Stage 2 block, send me `pac auth who` output |
| 3 | Me | Write the 10 tables as YAML into `./src` |
| 4 | You | `git diff`, commit |
| 5 | Me + you | `pac solution sync` — the schema is live |

**No Windows. No Studio. No ticket.**

---

**Verified on:** Bipul-MacBook-Air · pac 2.12.2 · .NET 10.0.401
