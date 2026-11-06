# 42 — PPO Clearance Desk Working Model (Updated: File Upload Flow)

**Goal:** One working end-to-end loop to demo for PPO. Upload UBOND/CONSOL Excel via file upload → Validate → Send pre-alerts (allow-list) → Tokenized customer link for package/checklist/doc upload.

## 1) Core Loop
> *"Upload UBOND/CONSOL Excel file directly from local machine → Validate against rules (email from Standard Remarks) → Show Accepted/Rejected with reasons → Send pre-alerts via Outlook (allow-list only) → Generate tokenized link per customer to view package, checklist & upload docs"*

If this works end-to-end with 1 real batch, demo is ready for PPO.

## 2) What MUST Work (Only 3 Things)

| # | Component | Status | Details |
|---|---|---|---|
| **1** | **File Upload + Validate (`ScrBatchUpload`)** | **TO BUILD** | Use **Modern File Upload control** in Canvas App. User selects `.xlsx` file from local machine. Power Automate flow reads the Excel, parses rows, validates using `40EXCEL_IMPORT_MAP.md`. Show **Accepted vs Rejected/BLOCKED** side by side with exact reason. Persist valid rows to `CD_Shipment`. Create/update `CD_Batch`. |
| **2** | **Send Pre-Alerts (Allow-List Gated)** | **TO BUILD** | For PASS rows only with resolved email. Send via `Office365Outlook.SendEmailV2`. **ONLY** to allow-listed emails (start with your email). Log to `CD_Message` (Direction=OUTBOUND). Set `CD_Shipment.SendState = SENT`. Increment `CD_Batch.SentCount`. **TEST MODE ON**. |
| **3** | **Customer Link - Tokenized SharePoint Page** | **TO BUILD** | Generate unique `LinkToken` per shipment at send time. Create minimal HTML page on SharePoint (`SiteAssets`) with `?t=<token>`. Page calls 2 HTTP-triggered Power Automate flows to fetch shipment by token & handle doc upload. Show package, checklist, upload. Logs to `CD_Document` & `CD_ShipmentEvent`. | 

## 3) File Upload Approach (Finalized)

**Approach A: File Upload Control + Power Automate Flow (Chosen)**

### Flow: `CD_ImportExcel`
1. Canvas passes file content from **Attachment** control / **FilePicker** control to flow as binary
2. Flow uses **Excel Online (Business) "List rows present in a table"** OR parse with Office Script/Encodian/just read file
3. Flow normalizes headers (case-insensitive, handle aliases), validates each row per `40EXCEL_IMPORT_MAP.md`
4. Returns JSON to Canvas with:
```json
{
  "batchId": "...",
  "accepted": [{...mapped shipment data...}],
  "rejected": [{...row, reason: "...", line: N}],
  "skipped": [{...reason HOLD/Calling/bare FEBRK...}],
  "counts": {"total": 0, "accepted": 0, "rejected": 0, "skipped": 0}
}
```
5. Canvas writes accepted rows to `CD_Shipment` using `Patch()`/`Collect()` + `CD_Batch`

**Why this:** Clean, works with local files, no copy/paste errors, easier to enforce validation rules, scalable.

## 4) SharePoint Token Page vs Power Pages

| Aspect | **SharePoint Token Page (FOR PPO)** | **Power Pages (Future)** |
|---|---|---|
| **Permissions Needed** | Upload HTML to `SiteAssets` - you likely have this | Needs `prvReadpowerpagesite` + Power Pages license/capacity |
| **Data Source** | Uses existing SharePoint `CD_*` lists via HTTP flows | Can use Dataverse/SharePoint - needs more setup |
| **Anonymous Access** | Token-based - no login required. Flows validate token. | Built-in anonymous access but needs site config |
| **Build Time** | Fast - I generate HTML + flows | Slower - needs site creation/provisioning |
| **Demo Ready** | **Yes** | Blocked until access granted |
| **Recommendation** | **USE THIS** | Ask manager later if needed |

**SharePoint token page = Plain HTML + JS hosted on SharePoint, talks to Power Automate HTTP flows, reads/writes SharePoint lists. No Dataverse needed.**

## 5) Current Blockers & Fixes

| Blocker | Status | Action |
|---|---|---|
| **Missing typed columns on CD_Shipment** | CRITICAL | Run `tools/00-Reconcile-SharePoint.ps1 -Apply`. Need `AWB`, `ContactEmail`, `Broker`, `ClearanceType`, `LinkToken`, `SendState`, `Batch`, etc. |
| **Canvas Authoring session** | NEEDS FIX | Need to reconnect to app in Studio. Use the URL you shared. |
| **Power Automate flows for import + link** | TO CREATE | I'll create JSON flow definitions for you to import. |
| **Customer link HTML page** | TO CREATE | I'll create ready-to-upload HTML file. |

## 5) Execution Plan (Step by Step)

| Step | Task | Owner | Status |
|---|---|---|---|
| **1** | Run reconcile script to add missing columns | You | IN PROGRESS |
| **2** | Reconnect Canvas Authoring to open app | You+Me | PENDING |
| **3** | Update `CD-Link-GetPackage` to log `LINK_OPENED` once per AWB | Me | **TOP PRIORITY** |
| **4** | Add "Link Status" badge + quick filter to `ScrBatchBoard` | Me | **TOP PRIORITY** |
| **5** | Create Power Automate flow `CD_ImportExcel` (File Upload) | Me | PENDING |
| **6** | Build `ScrBatchUpload` with File Upload control | Me | PENDING |
| **7** | Create allow-list gated send logic (token + link + send) | Me | PENDING |
| **8** | Create SharePoint token page HTML + `CD-Link-UploadDoc` flow | Me | PENDING |
| **9** | End-to-end test (send -> not opened -> open link -> awaiting docs -> upload -> docs received) | You+Me | PENDING |

## 7) Files To Be Created

| File | Purpose |
|---|---|
| `docs/files/43_MANAGER_PPO_PLAN_CLEARANCE_DESK.md` | **Manager-facing** - shows what, why, how, future plan |
| `web-app/CustomerPackage.html` | Customer-facing tokenized page |
| `web-app/README_DEPLOY_CUSTOMER_PAGE.md` | Deployment steps for SharePoint |
| `flows/cd-import-excel.json` | Power Automate flow for file upload parsing |
| `flows/cd-link-getpackage.json` | HTTP flow to fetch shipment by token |
| `flows/cd-link-uploaddoc.json` | HTTP flow to handle doc upload |
| `flows/cd-send-prealerts.json` | HTTP/instant flow for sending (or inline) |

**Focus: Get steps 1-4 working first. That's upload + validate. Then 5,6,7.**
