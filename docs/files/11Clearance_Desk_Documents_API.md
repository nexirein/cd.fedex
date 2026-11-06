# Clearance Desk — Bulk Documents API (F27)

*The external surface for fetching and attaching documents to AWB links, and for bulk operations across a batch.*

*Implements decision **L10** (we call out to fetch + attach) and **L2** (link only).*

---

## 1. What it is for

Three requirements from the business, one API:

1. *"Bulk invoice or any doc attachment in bulk"* — get documents for a **particular AWB**, several at once, onto that AWB's link.
2. *"The cargo team could see the pre-ticked docs and can add more fixed doc… default they can edit delete and add more"* — the same operations, driven from the app.
3. *"ACCS bulk invoice retrieval: when a batch is sent, Power Automate calls the ACCS API to fetch invoices for all AWBs in the batch at once"* (doc 7 §2) — the batch-level call.

**The screen and the API call the same flows.** F23 and F24 are invoked identically from a button in Power Apps and from an HTTP request. There is one implementation, one audit trail, one set of rules.

---

## 2. Transport and hosting

| Decision | Choice | Why |
|---|---|---|
| Implementation | **Power Automate HTTP-trigger flows** | No server to run. Native connectors. Inside the tenant (NFR-04). |
| Hosting | Behind an **Entra app registration** in FedEx's tenant | Corporate SSO, no separate credential store |
| Auth | **Client credentials** (app → app) or **delegated** (a signed-in user) | Service account for flows; delegated for the app |
| Versioning | Path segment `/api/v1` | `v2` can be added without breaking callers |
| Custom connector | Yes — registers the API inside Power Apps | The app calls it natively rather than hand-building HTTP requests |
| Test mode | Honours `CD_TestMode` | A test-mode attach still works, but the `cd_apilog` row is flagged and no customer notification is sent |

**Base URL:** `https://{host}/api/v1` — the host is an environment variable `CD_ApiBaseUrl` (doc 14).

---

## 3. ⚠️ The design constraint that decides the API shape

**Power Automate has a request quota.** A naive client that calls `POST /awbs/{awb}/documents` once per AWB on a 500-AWB batch makes 500 flow runs for one user action. That will exhaust the quota and throttle every other flow in the environment.

> **Hard rule: a bulk operation is ONE HTTP call and ONE flow run that loops internally.**

```
✅ POST /batches/B-0925-01/documents   { packId: "CARGO_PRE_NFBRK" }
   → one flow run, 500 iterations inside, one run consumed

❌ 500 × POST /awbs/874515906172/documents
   → 500 flow runs, quota gone, everything else throttled
```

**Consequences for the design:**

| Consequence | Detail |
|---|---|
| The **batch** endpoint is the primary one | The per-AWB endpoint exists for the single-document case, not as a loop primitive |
| Every bulk response returns **per-AWB results** | The caller learns which AWBs succeeded without a second call |
| Partial failure is normal, not exceptional | 200 OK with per-item `status`; the caller retries only the failures |
| The API is **asynchronous above a threshold** | Above `CD_ApiSyncThreshold` (default 25 AWBs) the call returns `202 Accepted` + a `requestId`, and the caller polls `GET /requests/{id}` |
| The screen's bulk action also uses the async path | It does not hold a Power Fx timeout open for 500 AWBs |

---

## 4. Endpoints

Base: `{base}/api/v1`

### 4.1 `GET /batches/{batchId}/awbs`

The AWB list. Cheap, safe, useful for a caller planning a bulk run.

| Query | Type | Notes |
|---|---|---|
| `status` | string | `ready` \| `sent` \| `all` (default `ready`) |
| `includeDocs` | bool | default `false` |
| `valueClass` | string | `LV` \| `MV` \| `HV` |
| `clearanceType` | string | `nfbrk` \| `febrk` \| `febrk-sunimpex` \| `febrk-jeena` |
| `top` | int | default 200, max 1000 |
| `skip` | int | default 0 |

```json
{
  "batchId": "b8f1c2d4-…",
  "batchNo": "CG-B-0925-01",
  "division": "Cargo",
  "phase": "pre_alert",
  "totalAwbs": 28,
  "returned": 28,
  "awbs": [
    {
      "awb": "874515906172",
      "caseId": "c1a2…",
      "caseRef": "CG-000118",
      "company": "A R Polymers",
      "clearanceType": "nfbrk",
      "valueClass": "MV",
      "recipient": "ar@arpolymers.com",
      "sendState": "ready",
      "packId": "CARGO_PRE_NFBRK",
      "documentCount": 5
    }
  ]
}
```

### 4.2 `GET /awbs/{awb}/documents`

What is on that AWB's link right now.

```json
{
  "awb": "874515906172",
  "caseRef": "CG-000118",
  "customerVisible": 4,
  "internal": 1,
  "documents": [
    {
      "documentId": "d1…",
      "packLabel": "Commercial invoice",
      "fileName": "Invoice_874515906172.pdf",
      "format": "pdf",
      "pages": 2,
      "docClass": "commercial_invoice",
      "visibility": "customer",
      "isDefault": true,
      "isIncluded": true,
      "source": "accs",
      "originalFormat": "tif",
      "checksum": "sha256:9f2c…",
      "sizeBytes": 412880,
      "uploadedOn": "2026-09-27T06:12:04Z",
      "downloadUrl": null
    }
  ]
}
```

`downloadUrl` is **always `null` for external callers.** Downloads go through `GET /awbs/{awb}/documents/{documentId}/content` (§4.9), which re-checks visibility on every request. Never hand out a stored SharePoint URL.

### 4.3 `POST /awbs/{awb}/documents` — attach N to ONE AWB

The core of the *"fetch multiple docs to a particular AWB"* requirement.

**Body — three mutually exclusive source modes, plus an optional pack:**

```json
{
  "packId": "CARGO_PRE_NFBRK",
  "replaceExisting": false,
  "defaultVisibility": "customer",
  "items": [
    { "source": "library",  "libraryDocId": "lib-002", "visibility": "customer" },
    { "source": "library",  "libraryDocId": "lib-007", "visibility": "internal" },
    { "source": "accs",     "documentTypes": ["invoice", "awb_copy"] },
    { "source": "sharepoint", "path": "/Shared Documents/Circulars/No-08-2021.pdf" },
    { "source": "upload",   "fileName": "Duty calc.pdf", "format": "pdf",
      "contentBase64": "JVBERi0xLjQK…", "visibility": "customer" }
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `packId` | string | Optional. If present, the pack's items are applied **first**, then `items` are added on top |
| `replaceExisting` | bool | `false` (default) merges. `true` clears `is_included` documents first |
| `defaultVisibility` | enum | Applied to any item that doesn't specify its own |
| `overwrite` | bool | Default `false`. If a file with the same `fileName` + `checksum` exists, the call is a no-op for that item (`status: "duplicate"`) |
| `items[].visibility` | enum | Overrides the pack default |
| `items[].documentTypes` | array | For `source: accs` — `invoice`, `awb_copy`, `commercial_invoice`, `ci` |
| `items[].path` | string | For `source: sharepoint` — must resolve inside the configured site |
| `items[].contentBase64` | string | For `source: upload` — **max 10 MB base64** (≈7.5 MB binary). Larger uses the async path |
| `dedupeKey` | string | Optional caller-supplied idempotency key |

**Response:**

```json
{
  "awb": "874515906172",
  "caseRef": "CG-000118",
  "added": 4,
  "skipped": 1,
  "failed": 0,
  "results": [
    { "index": 0, "fileName": "DO FORMAT.docx", "documentId": "d2…",
      "format": "docx", "status": "added",        "visibility": "customer" },
    { "index": 1, "fileName": "Celebi Tariff…pdf", "documentId": "d3…",
      "format": "pdf",  "status": "added",        "visibility": "internal" },
    { "index": 2, "fileName": "Invoice_8745…pdf",  "documentId": "d4…",
      "originalFormat": "tif", "format": "pdf", "pages": 2,
      "status": "added", "converted": true },
    { "index": 3, "fileName": "KYC.pdf",           "status": "duplicate",
      "reason": "Identical checksum already attached at 06:12" }
  ],
  "customerVisibleNow": 4
}
```

### 4.4 `POST /batches/{batchId}/documents` — **BULK**

The primary endpoint. One call, one flow run.

```json
{
  "scope": "batch",
  "packId": "CARGO_PRE_NFBRK",
  "awbFilter": {
    "status": "ready",
    "clearanceType": ["nfbrk", "febrk-jeena"],
    "valueClass": ["MV", "HV"]
  },
  "awbs": ["874515906172", "382407883458"],
  "replaceExisting": false,
  "defaultVisibility": "customer",
  "items": [
    { "source": "accs", "documentTypes": ["invoice"] }
  ],
  "async": "auto"
}
```

| Field | Notes |
|---|---|
| `scope` | `batch` (all, after `awbFilter`) or `selection` (exactly the `awbs` array) |
| `awbFilter` | Same filters as `GET /batches/{batchId}/awbs` |
| `awbs` | Required when `scope: selection` |
| `async` | `auto` (default — decides by `CD_ApiSyncThreshold`), `true`, or `false` |
| `onPartialFailure` | `continue` (default) \| `abort` |

**Synchronous response (≤ threshold, default 25):**

```json
{
  "requestId": "brq-7f3a91c2",
  "mode": "sync",
  "batchId": "b8f1c2d4-…",
  "awbsProcessed": 24,
  "awbsSucceeded": 22,
  "awbsFailed": 2,
  "documentsAdded": 118,
  "documentsSkipped": 6,
  "results": [
    { "awb": "874515906172", "added": 5, "failed": 0,
      "documents": [ { "fileName": "Invoice_874515906172.pdf", "status": "added" } ] },
    { "awb": "220981735642", "added": 0, "failed": 1,
      "reason": "ACCS returned 404 for AWB 220981735642", "caseRef": "CG-000131" }
  ]
}
```

**Asynchronous response (> threshold):**

```json
HTTP/1.1 202 Accepted
Location: /api/v1/requests/brq-7f3a91c2

{
  "requestId": "brq-7f3a91c2",
  "mode": "async",
  "status": "queued",
  "awbsQueued": 480,
  "estimatedSeconds": 240,
  "pollUrl": "/api/v1/requests/brq-7f3a91c2"
}
```

### 4.5 `POST /awbs/{awb}/documents:fetch`

Sweep sources, normalise, attach. The *"fetch multiple docs"* primitive.

```json
{ "sources": ["accs", "sharepoint", "library"],
  "documentTypes": ["invoice", "awb_copy"],
  "sharepointFolder": "/AWB/874515906172",
  "convertTo": "pdf",
  "attach": true }
```

Ported from `cargo-paf/src/lib/batches/match-attachments.ts` — filename matching runs **loose → strict → fuzzy** and logs which strategy matched, so a wrong invoice is diagnosable:

```
loose    : AWB appears anywhere in the filename      → accept
strict   : filename-without-extension == AWB exactly → accept (preferred)
fuzzy    : strict fails, only loose available        → accept + log warning
```

### 4.6 `POST /batches/{batchId}/documents:convert`

Re-run normalisation without re-fetching. Use after adding a new library version.

```json
{ "awbs": ["874515906172"], "targetFormat": "pdf",
  "onlyFormats": ["tif", "xlsx", "doc"], "async": "auto" }
```

### 4.7 `PATCH /awbs/{awb}/documents/{documentId}`

The screen's untick / visibility change, over HTTP.

```json
{ "isIncluded": false, "visibility": "internal", "packLabel": "Bank details" }
```

Any subset of fields. Returns the updated `Document`.

### 4.8 `DELETE /awbs/{awb}/documents/{documentId}`

`?hard=false` (default) sets `is_included = No` and keeps the row for audit — **this is what the agent's "✕ delete" button calls**, because "delete" in the UI means "remove from the link", not "erase the record".

`?hard=true` requires Manager+ and is used only for a wrongly-uploaded document containing something it shouldn't. Every hard delete writes a `cd_apilog` row with the caller's identity and the reason.

### 4.9 `GET /awbs/{awb}/documents/{documentId}/content`

Streams the file. **Re-checks `visibility` and `is_included` on every request.** Mints a short-lived SharePoint guest link (default 300 s) and proxies or redirects.

### 4.10 `GET /s/{token}/documents`

**The public, token-scoped endpoint.** The portal calls this. No auth beyond the token.

```json
{
  "awb": "874515906172",
  "company": "A R Polymers",
  "caseRef": "CG-000118",
  "arrivalDate": "2026-09-25",
  "status": "waiting_on_customer",
  "timeline": [ { "at": "2026-09-23T06:15:00Z", "label": "Pre-alert sent" } ],
  "documents": [ /* only visibility=customer AND isIncluded=true AND format in (pdf,docx) */ ],
  "itemsRequired": [ /* only this case's own required items */ ],
  "charges": { "today": 3068, "nextDay": 4248, "tier": "arrival_day",
               "cutoff": "16:30", "isHoliday": false }
}
```

**The `internal` filter is applied here, server-side, unconditionally.** A token holder cannot enumerate an internal document by ID, because this endpoint never returns its ID.

### 4.11 `GET /requests/{requestId}` · `GET /requests`

Async progress and the caller's own history.

```json
{ "requestId": "brq-7f3a91c2", "status": "running",
  "progress": { "awbsProcessed": 212, "awbsTotal": 480, "percent": 44 },
  "startedOn": "2026-09-27T06:20:11Z",
  "estimatedSecondsRemaining": 128,
  "awbsFailed": 3,
  "failures": [ { "awb": "220981735642", "reason": "ACCS 404", "caseRef": "CG-000131" } ] }
```

`status`: `queued` → `running` → `completed` \| `completed_with_errors` \| `failed`

---

## 5. Error format

```json
{
  "error": {
    "code": "ACC_404",
    "message": "ACCS returned 404 for AWB 220981735642",
    "awb": "220981735642",
    "retryable": true,
    "details": { "accsEndpoint": "https://accs.fedex.com/api/del",
                 "httpStatus": 404, "requestId": "brq-7f3a91c2" }
  }
}
```

| Code | HTTP | Meaning | Retryable |
|---|---|---|---|
| `UNAUTHENTICATED` | 401 | Missing/invalid token | No |
| `FORBIDDEN` | 403 | Caller lacks scope, or document is `internal` | No |
| `NOT_FOUND` | 404 | No such AWB / case / document | No |
| `AWB_NOT_IN_BATCH` | 400 | `scope: selection` with an AWB outside the batch | No |
| `ACC_404` | 200 (per-item) | ACCS has no record for this AWB | Yes, 3× |
| `ACC_TIMEOUT` | 200 (per-item) | ACCS did not respond | Yes, with backoff |
| `ACC_AUTH` | 502 | ACCS credentials rejected | **No — alert Manager** |
| `FILE_NOT_FOUND` | 200 (per-item) | Library or SharePoint path missing | No |
| `UNSUPPORTED_FORMAT` | 400 | Not in the PDF/DOCX allowlist (L12) | No |
| `FILE_TOO_LARGE` | 413 | > 10 MB base64 on a sync call | Use async |
| `INVALID_PACK` | 400 | `packId` does not exist or is inactive | No |
| `PLACEHOLDER_UNRESOLVED` | 422 | A template placeholder has no value (C2) | No |
| `RATE_LIMITED` | 429 | `Retry-After` header present | Yes |
| `QUOTA_EXCEEDED` | 429 | Environment run quota | Yes, later |
| `TEST_MODE` | 200 | Operation recorded, customer notification suppressed | n/a |

**Per-item failures never fail the whole call.** A 500-AWB batch where 3 AWBs 404 must return success for 497, because the agent's next action is to fix 3 rows, not to retry 500.

---

## 6. Idempotency

| Mechanism | Detail |
|---|---|
| `dedupeKey` | Caller-supplied. Same key on the same AWB → returns the original result, no re-attach |
| Content checksum | Default. Same `fileName` + `checksum` on the same AWB → `status: "duplicate"` |
| `send_status = sent` | The F05 send is idempotent on this field (ported from cargo-paf). Re-running a send never double-sends |
| `cd_docbulkrequest` | Every call creates a row, so a duplicate is visible afterwards even if the caller lost the response |

**The caller losing the response is a real case.** With `dedupeKey`, a retry is always safe. Without it, the checksum check still prevents duplicates — but the caller should be able to tell. Both are provided.

---

## 7. Audit and rate limits

### `cd_apilog`

| Column | Notes |
|---|---|
| `caller_identity` | Entra object ID + display name, or the service account |
| `caller_type` | `service_account` \| `user` \| `app` |
| `endpoint` | Route template |
| `method` | GET/POST/PATCH/DELETE |
| `batch_id`, `awb` | Scope |
| `request_summary` | JSON — item count, pack, sources. **Not** base64 content |
| `response_summary` | Counts, per-item status |
| `duration_ms` | |
| `http_status` | |
| `test_mode` | Yes/No |
| `created_on` | |

**Base64 upload content is never logged.** Only its size and checksum.

### Limits

| Limit | Default | Variable |
|---|---|---|
| Sync AWBs per call | 25 | `CD_ApiSyncThreshold` |
| Max AWBs per async call | 1,000 | `CD_ApiMaxAwbs` |
| Items per call | 200 | — |
| Base64 size per item | 10 MB | — |
| Calls per caller per minute | 60 | `CD_ApiRateLimit` |
| Retention of `cd_apilog` | 400 days | FedEx retention standard |

**A bulk call loops internally, so the per-minute limit counts *calls*, not AWBs.** 60 calls/minute × 1,000 AWBs is ample; the quota is protected by the loop-internally rule instead.

---

## 8. Who can call what

| Scope | `GET` awbs | `POST` attach | `PATCH` | `DELETE` soft | `DELETE` hard | `GET /s/{token}` |
|---|---|---|---|---|---|---|
| Service account (flows F22–F25) | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Agent (delegated) | own team | ✅ | ✅ | ✅ | ❌ | ✅ |
| Team Lead | own team | ✅ | ✅ | ✅ | ❌ | ✅ |
| Manager | all teams | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | all | ✅ | ✅ | ✅ | ✅ | ✅ |
| Customer (token only) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ **own AWB only** |

**Enforcement:** the Entra app registration carries an app role per scope. F27 resolves the caller, checks the app role **and** the caller's `cd_agentprofile` division/value-class scope, and applies the same team scoping as the app UI. **An external caller with a valid token still cannot read another team's cases** — the API applies the identical filter the screens use.

---

## 9. Worked examples

### 9.1 Attach the invoice and two fixed docs to one AWB

```bash
curl -X POST "https://{host}/api/v1/awbs/874515906172/documents" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "defaultVisibility": "customer",
    "items": [
      { "source": "accs", "documentTypes": ["invoice"] },
      { "source": "library", "libraryDocId": "lib-do-format" },
      { "source": "library", "libraryDocId": "lib-bank-details",
        "visibility": "internal" }
    ]
  }'
```

```
→ 200 OK
   added: 3   (invoice .tif → .pdf, 2pp · DO FORMAT .docx · bank details .docx)
   customerVisibleNow: 2
   Note: bank details is internal — the customer will NOT see it.
```

### 9.2 Apply the NFBRK pack to a whole 28-AWB batch (from the app)

```json
POST /api/v1/batches/CG-B-0925-01/documents
{ "scope": "batch", "packId": "CARGO_PRE_NFBRK",
  "awbFilter": { "status": "ready" } }
```

```
→ 200 OK (sync, 28 > 25 threshold → 202 actually)
   awbsSucceeded: 26   awbsFailed: 2
   documentsAdded: 130  documentsSkipped: 4
   failures:
     220981735642  ACCS 404
     194883221056  no consignee email — case not link-ready
```

### 9.3 Untick bank details for one AWB, for the whole batch

```
PATCH /api/v1/awbs/874515906172/documents/d2…
{ "isIncluded": false }
```
```
POST /api/v1/batches/CG-B-0925-01/documents
{ "scope": "batch", "items": [ { "source": "library", "libraryDocId": "lib-bank-details" } ],
  "setIncluded": false }
```

### 9.4 Add a brand-new document the cargo team just produced

```json
POST /api/v1/awbs/874515906172/documents
{ "items": [ { "source": "upload", "fileName": "Duty Calculator v4.pdf",
               "format": "pdf", "contentBase64": "JVBERi0xLjQK…" } ] }
```
```
→ 201 Created
   documentId: d9…
   customerVisibleNow: 5
```

---

## 10. Flows involved

| Flow | Role |
|---|---|
| **F27** | The HTTP-trigger set. Routing, auth, validation, quota, logging, response shaping. Does no document work itself. |
| **F22** | Pack resolution and pre-ticked document creation. Invoked by F27 when `packId` is present. |
| **F23** | Untick / delete / add / visibility changes. Invoked by F27 on PATCH/DELETE. |
| **F24** | Source fetch — ACCS bulk, SharePoint sweep, Library resolve. Filename matching loose → strict → fuzzy. |
| **F25** | Format normalisation to PDF/DOCX. Rejects anything else. |

**F27 is a thin router.** All logic lives in F22–F25, which are also reachable from the app UI. One implementation, two doors.
