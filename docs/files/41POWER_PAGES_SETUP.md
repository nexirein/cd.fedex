# 41 — Customer link on Power Pages (build + connect, end to end)

Status: **blocked at step 0** in this tenant — see §1. Everything after that is ready to run.
Design target: `design/customer-link.html`.

---

## 1. What I verified in your tenant (evidence, not opinion)

```
pac auth list      → signed in as bipul.sikder@fedex.com, env MyFedEx (Upgrade),
                     https://org82af9582.crm.dynamics.com/
pac pages list     → ERROR: Principal user ... is missing prvReadpowerpagesite
                     privilege ... on entity 'powerpagesite'
```

Two facts follow, and neither is a guess:

1. **There is no Power Pages tool in my session.** The available tooling is Canvas Apps,
   Power Automate and the OpenCode helpers. No MCP server for Power Pages.
2. **Your account cannot even *read* Power Pages site records.** Creating a site needs more
   than reading it. So no site can be made — by me or by you — until a tenant admin grants
   Power Pages access.

`pac` 2.12.2 *is* installed and *does* expose `pac pages download-code-site` /
`upload-code-site` / `list`, which is the automation path **after** the site exists and the
privilege is granted. So step 0 is a permissions task, not a build task.

### Step 0 — unblock (a tenant/admin task, once)

| # | Who | Action |
|---|-----|--------|
| 0.1 | Admin | Confirm Power Pages capacity is available (Power Platform admin center → **Resources → Power Pages sites**). Capacity is per-tenant and sold separately from Power Apps. |
| 0.2 | Admin | Assign **Power Pages maker** access to `bipul.sikder@fedex.com` — either the Power Pages licence or a security role carrying `prvReadpowerpagesite` / `prvCreatepowerpagesite` / `prvWritepowerpagesite` on the `powerpagesite` entity. |
| 0.3 | You | Re-run `pac pages list`. Success = `No websites found` or a list. The privilege error must be gone. |

Do not start §4 before 0.3 passes. Every hour spent before it is wasted.

---

## 2. The architecture decision (this is the part that usually goes wrong)

**Power Pages does not read SharePoint lists.** It reads Dataverse. This app keeps its work
queue in SharePoint `CD_*` lists. The naive plan — mirror all 18 lists into Dataverse — means
a second data model to keep in sync forever, and every new column becomes a two-place change.

Three ways to bridge it:

| Option | Cost | Verdict |
|---|---|---|
| A. Mirror `CD_Shipment`/`CD_Document` into Dataverse | a second schema, a sync flow per list, drift risk | **rejected** |
| B. SharePoint integration component (Entra app registration + site integration) | one-time admin consent, config-heavy, upload support is awkward | **rejected for Phase 1** |
| C. **One Power Automate HTTP-triggered flow per customer action** | two small flows, no schema duplication, works today | **chosen** |

### Option C, concretely

```
Customer link  →  Power Pages page (static HTML + JS, anonymous)
                        │  fetch(flowUrl, { token })
                        ▼
             Flow "CD-Link-GetPackage"  (HTTP request trigger)
                        │  LookUp(CD_Shipment, LinkToken = token)
                        ▼
             JSON: AWB, company, checklist, deadline, docs already received
                        │
             Page renders package + checklist
                        │  customer picks files
                        ▼
             Flow "CD-Link-UploadDoc"  (HTTP request trigger, base64)
                        │  create CD_Document + CD_ShipmentEvent
                        ▼
             Page shows "received" with a reference
```

Why this is the right Phase 1 shape:

- **No Dataverse schema.** The queue stays in SharePoint, one model, one place to change.
- **No anonymous table permissions.** Power Pages never touches a table directly, so there is
  no "anonymous role can read `cd_package`" hole. The token check happens server-side in the
  flow — the page cannot ask for a different row.
- **One page, not a portal.** No registration, no login, no customer accounts. The link *is*
  the credential, which matches how you already work: one link per customer, sent by email.
- **Uploads land where the app already looks.** `CD_Document` + `CD_ShipmentEvent`, so the
  board sees the document arrive with no extra sync.

The honest caveat: an HTTP-trigger URL embedded in page source is visible to anyone who views
source. That is acceptable **only** because the token is the real gate (§5). It is not a
secret URL defence, and it is not treated as one.

---

## 3. What the customer actually sees

From `design/customer-link.html`, one scroll, no navigation:

1. **Header** — FedEx Clearance Desk, the AWB, the company name, and a deadline chip
   ("respond by 25 Oct").
2. **Package** — shipment summary: AWB, consignee, location, clearance type, pieces/weight,
   value/currency, broker.
3. **Checklist** — every document required for that clearance type, each with one of three
   states: *required, uploaded, verified*. Tick marks are per document, not one global "done".
4. **Upload** — drop zone per missing document, phone-camera friendly, accepts PDF/JPG/PNG,
   shows the file name and size before sending.
5. **Footer** — "questions? reply to the pre-alert email" with the batch reference in the
   subject line, so replies land in the right thread.

Deliberately absent: any list of other shipments, any customer account, any way to reach a
different token.

---

## 4. Build steps once §0 passes

### 4.1 Create the site (UI, ~10 min, once)

1. `https://make.powerapps.com` → environment **MyFedEx (Upgrade)** → left rail **Power Pages**.
2. **Create a site** → template **Blank page with layout** (not "Customer self-service" — that
   ships accounts and login pages we do not want).
3. Name `Clearance Desk`, web address `clearance-desk-<something>` (globally unique).
4. Language English, then **Done**. Provisioning takes 3–10 minutes.

### 4.2 Make it anonymous

Power Pages Studio → **Set up → Identity**, and the **Power Pages Management** app:

| Setting | Value | Why |
|---|---|---|
| `Authentication/Registration/Enabled` | `false` | no customer accounts |
| `Authentication/Registration/LoginButtonAuthenticationType` | blank | no login button |
| Web role **Anonymous Users** | has **Read** on the *page* only | page renders without login |
| Page permission for the package page | Anonymous Users → Read | |
| **No table permissions at all** | — | data comes from the flow (§2) |

### 4.3 Turn on the two flows

1. Flow **CD-Link-GetPackage** — HTTP request trigger, response `200` with the package JSON,
   `404` for unknown/expired token. Actions: `Get items` on `CD_Shipment` with
   `$filter=LinkToken eq '<token>'`, then compose the response.
2. Flow **CD-Link-UploadDoc** — HTTP trigger taking `token`, `docType`, `fileName`,
   `contentBytes`. Validates the token, writes `CD_Document`, appends a
   `CD_ShipmentEvent` (`DOC_RECEIVED`), returns the document reference.
3. Copy both trigger URLs. They go into the page as `window.CD_API`.

### 4.4 Deploy the page

Two supported paths, in order of preference:

- **Code site** (if your tenant has it): `pac pages download-code-site --path ./portal`,
  I write `package.html` + `package.js` into it, then
  `pac pages upload-code-site --path ./portal`.
- **Standard site**: Studio → **Pages → Package → Edit code**, paste the HTML/JS I generate,
  Save. No CLI, no privilege beyond editing the site.

Either way the page is one file of HTML + one of JS, calling `window.CD_API`. No Liquid, no
entity forms, no forms authentication.

### 4.5 Wire it to the send step

The pre-alert email body gets its link from the shipment row, not from a template constant:

```
LinkToken   = 32 hex chars, generated at send time, unique per shipment
LinkUrl     = "https://<site>/package?t=" & LinkToken
ExpiresOn   = send time + 30 days
```

`CD_Shipment.LinkToken` already exists in the schema, so nothing new is needed. On resend the
token is **reused** (so links already in an inbox keep working); it is only rotated on
explicit revoke.

---

## 5. Security rules (short, and enforced by the flows)

1. Token = 32 random hex chars. Not sequential, not derived from the AWB.
2. The flows accept **one** token and return **one** shipment. There is no "list" endpoint to
   enumerate.
3. Expired or unknown token → `404` with no distinguishing detail.
4. Uploads are size-capped (15 MB) and type-capped (PDF/JPG/PNG) **in the flow**, not in JS.
5. Every token read and every upload appends `CD_ShipmentEvent`, so the board can show
   "customer opened the link" and "customer uploaded IEC".
6. A revoke action rotates `LinkToken` and kills every outstanding link for that row.

---

## 6. Fallback if capacity is not granted

If §0.1 fails — no Power Pages capacity and no path to get it — the same two flows plus a
**tokenised SharePoint page** give the same experience without Power Pages: a publishing page
on `myfedex.sharepoint.com` shared as "anyone with the link", same `?t=` token, same flows,
same JSON. It loses the custom domain and looks more SharePoint, but it ships.

That is a real fallback, not a downgrade of ambition: the flows, the token model, the page
markup and the design all carry over unchanged. Only the host changes.

---

## 7. What I can do the moment §0.3 passes

- Generate `package.html` / `package.js` from `design/customer-link.html`, wired to `window.CD_API`.
- Author both flow definitions (I can build and validate flows directly).
- Generate the `LinkToken` / `LinkUrl` / `ExpiresOn` logic in the send step.
- Deploy via `pac pages upload-code-site` if it is a code site, otherwise hand you the exact
  paste.

What I cannot do: create the site, grant the privilege, or buy capacity. Those are §0.
