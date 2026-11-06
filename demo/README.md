# FedEx Clearance Desk — Working UI/UX Demo (HTML/CSS/JS)

Self-contained, interactive **agent workspace + customer portal** demo. No backend or Power Platform access required. State is stored in browser `localStorage` so agent actions and customer link actions work together.

## Run

```bash
open "/Users/bipulsikder16/Developer/FedEx powerapp/demo/index.html"
```

## Screens (agent workspace)

- **Dashboard** — batch/shipment stats and action queue (awaiting customer response).
- **Batches** — all imported batches with pre-flight/sent/docs counts.
- **Import Batch** — upload/select a UBOND/CONSOL `.xlsx` (demo validates and creates a sample batch), showing validation rules.
- **Batch Board** — per-shipment pre-flight, send state, and **Link Status** filters:
  - Not Sent
  - Sent · Not Opened
  - Link Opened · Awaiting Docs
  - Docs Received
- **Shipment Detail (drawer)** — shipment fields, pre-flight reason, tokenized customer link, documents, outbound messages, and event timeline.

## Customer portal

- `customer.html?t=<token>` — secure tokenized shipment package view.
- Opening the link records **`LINK_OPENED`** (once per AWB).
- Document upload records **`DOC_RECEIVED`** and stores document metadata (Source = PORTAL) in demo state.

## Business rules demonstrated

- Consignee email is resolved from **Standard Remarks** (never `ConsigneeEmailID`).
- AWB must be 11–12 digits.
- **HOLD**, **CALLING**, and bare **FEBRK** are non-sendable (SKIPPED with reason).
- **FEBRK** requires a named broker (JEENA/SUNIMPEX); no guessing.
- Sendable set (default): `NFBRK`, `FEBRK-JEENA`, `FEBRK-SUNIMPEX`.
- **TEST MODE + allow-list** gates outbound sends (`bipul.sikder@fedex.com`).
- Each sent shipment gets a unique **LinkToken**; customer actions are tracked by AWB/token.

## End-to-end demo flow

1. **Import Batch** → creates batch + validated shipments.
2. **Batch Board** → review pre-flight; click **Send Pre-Alerts**.
3. Open a shipment → **Open Customer Portal** (token link).
4. Upload documents in the customer portal.
5. Return to agent workspace → **Refresh** / reopen shipment to see `LINK_OPENED`, documents, and **Docs Received** status.

Use **Reset Demo** in the top bar to clear `localStorage` demo data.
