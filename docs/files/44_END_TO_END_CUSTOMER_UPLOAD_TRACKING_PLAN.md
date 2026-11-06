# 44 — END TO END: Link Click Tracking, Customer Opens & Pending Follow-Ups

**Purpose:** Track whether the customer actually clicked/opened the pre-alert link we sent. Know who is pending (not opened) vs opened but hasn't uploaded vs uploaded. Show this on `ScrBatchBoard`.

## 1) The Real Need

Right now, once we send the pre-alert email with the token link, we have **zero visibility** on the agent side.

We need to answer these questions instantly from `ScrBatchBoard`:

- **Who hasn't even opened the link?** -> Need to follow up
- **Who opened the link but hasn't uploaded documents?** -> Need to chase for documents
- **Who uploaded documents?** -> Can move to next step

This is far more useful than just showing uploaded files. We need to know **engagement** first.

## 2) Where This Gets Tracked

We'll use the existing `CD_ShipmentEvent` list (append-only). No new list needed.

When the customer opens the tokenized page, `CustomerPackage.html` calls `CD-Link-GetPackage` HTTP flow. That's the perfect place to log the click.

### New Event Type
Add `LINK_OPENED` to track first-time opens.

| Field | Value | Notes |
|---|---|---|
| `Title` | `LINK_OPENED` | Consistent naming |
| `AWB` | `CD_Shipment.Title` | Match to shipment |
| `EventType` | `LINK_OPENED` | Key for filtering |
| `Actor` | `CUSTOMER` | Customer clicked the link |
| `EventDate` | `utcNow()` | When they first opened it |
| `Batch` | `CD_Shipment.Batch` | For filtering if needed |

**Rule:** Only log **once per AWB**. Don't log every time they refresh the page.

## 3) Update Flow: `CD-Link-GetPackage`

Modify the flow we created earlier.

**Flow Name:** `CD-Link-GetPackage`

### Updated Logic

1. **HTTP Trigger** receives `{ "token": "..." }`
2. **Get items** from `CD_Shipment` where `LinkToken eq token` (Top 1)
3. **If not found** -> Return `404 Invalid or expired link`
4. **If found** -> 
   - **Check for existing LINK_OPENED**: `Get items` from `CD_ShipmentEvent` with filter `AWB eq '<AWB>' and EventType eq 'LINK_OPENED'`
   - **If count == 0** -> Create item in `CD_ShipmentEvent` (log first open)
   - **Return 200** with shipment package + checklist (same as before)

That's it. The customer doesn't see anything different. We just silently log it in the background.

## 4) Agent-Side: "Link Status" On `ScrBatchBoard`

We need to add a **"Link Status"** column to the main shipment gallery on `ScrBatchBoard`.

### Status Logic

Derive this using collections/lookups in Power Fx.

```text
// Check events for selected/context
HasLinkOpened = CountRows(Filter(colShipmentEvent, AWB = ThisItem.Title && EventType = "LINK_OPENED")) > 0
HasDocsReceived = CountRows(Filter(colDocument, AWB = ThisItem.Title)) > 0 || CountRows(Filter(colShipmentEvent, AWB = ThisItem.Title && EventType = "DOC_RECEIVED")) > 0
```

### Badge Mapping

| Condition | Label | Fill/Color | Purpose |
|---|---|---|---|
| `ThisItem.SendState = "NOT_SENT"` OR not sent | `Not Sent` | `RGBA(156,163,175,1)` (Grey) | Not emailed yet |
| `ThisItem.SendState = "SENT"` AND `!HasLinkOpened` | `Sent – Not Opened` | `RGBA(245,158,11,1)` (Orange) | **Need to follow up** |
| `ThisItem.SendState = "SENT"` AND `HasLinkOpened` AND `!HasDocsReceived` | `Link Opened – Awaiting Docs` | `RGBA(251,191,36,1)` (Amber) | **Chased but no upload yet** |
| `HasDocsReceived = true` | `Docs Received` | `RGBA(34,197,94,1)` (Green) | **Done** |

### UI Placement
Put this badge in the `galBdShipments` gallery on `ScrBatchBoard`. Can be a small pill/badge next to `SendState` or replace/add as its own column.

Also add a **quick filter bar** at top of board:
`[All] [Sent - Not Opened] [Link Opened - Awaiting Docs] [Docs Received]`

This lets you filter down to only people who are actually pending with one click.

## 5) End-to-End Flow (Corrected)

```text
1. Upload Excel (ScrBatchUpload) -> Validate -> Create CD_Batch + CD_Shipment (SendState = NOT_SENT)
2. Send Pre-Alerts (ScrBatchBoard) -> Allow-list only -> Generate LinkToken if blank -> Add link to email -> Office365Outlook.SendEmailV2 -> Log to CD_Message -> Set SendState = SENT, SentAt = Now()
3. Agent sees "Sent – Not Opened" on board
4. Customer clicks link -> CustomerPackage.html loads -> calls CD-Link-GetPackage
5. CD-Link-GetPackage finds shipment -> checks CD_ShipmentEvent for LINK_OPENED -> if none, creates it -> returns package data
6. Agent sees badge change to "Link Opened – Awaiting Docs"
7. Customer uploads file -> CD-Link-UploadDoc runs -> saves to library + creates CD_Document + creates CD_ShipmentEvent (DOC_RECEIVED)
8. Agent sees badge change to "Docs Received"
```

## 6) Update To Files

| File | Update |
|---|---|
| **`docs/files/42_PPO_CLEARANCE_DESK_WORKING_MODEL.md`** | Add **"Link Engagement Tracking"** section. Treat "Sent – Not Opened" visibility as MUST HAVE for PPO. |
| **`docs/files/43_MANAGER_PPO_PLAN_CLEARANCE_DESK.md`** | Update demo: Show sending -> see "Sent – Not Opened" -> open link on phone -> badge changes to "Link Opened – Awaiting Docs" -> upload -> changes to "Docs Received". |
| **`docs/files/44_END_TO_END_CUSTOMER_UPLOAD_TRACKING_PLAN.md`** | **THIS FILE** - Replaced with correct focus on link opens vs pending. |

## 7) Action Plan

| Step | Task | Owner | Status |
|---|---|---|---|
| **1.** | Update `CD-Link-GetPackage` flow to log `LINK_OPENED` once per AWB | Me | TO DO |
| **2.** | Add `Link Status` badge to `galBdShipments` on `ScrBatchBoard` with the logic above | Me | **TOP PRIORITY** |
| **3.** | Add quick filter for pending statuses | Me | TO DO |
| **4.** | Test: Send to self -> see "Sent – Not Opened" -> open link on phone -> refresh board -> see "Link Opened – Awaiting Docs" | You+Me | TO DO |
| **5.** | Test upload flow -> see "Docs Received" | You+Me | TO DO |

## 8) Answer To Your Question

**Yes, this is exactly what you need.**

We don't just need to see uploaded files. We need to see **who hasn't clicked the link we sent**. 

That's the difference between "documents came in" vs **"who to follow up with right now"**.

I'll update the flows and add the **Link Status** badge to `ScrBatchBoard` first. That's going to be the most useful thing for your demo and for actual use.
