# 43 — MANAGER PPO PLAN: Clearance Desk (Upload → Validate → Send → Customer Link)

**To:** [Manager Name]  
**From:** [Your Name]  
**Subject:** PPO Proposal - Clearance Desk Pre-Alert Automation  
**Date:** 24-Oct-2026

## 1) Problem Statement
Currently, for every UBOND/CONSOL batch from IGM Console, the team downloads Excel and manually creates & sends pre-alert emails one by one via Outlook. 

- **Volume:** ~150 rows per batch, 2-3 batches/day
- **Time taken:** ~1.5 hours per batch
- **Risk:** Human error - sending to wrong email, missing rows, no visibility

## 2) Proposed Solution (PPO Scope)
Build a **minimal working prototype** that automates just the core loop:

> **"Upload Excel → Validate → Send Pre-Alerts (with approval/allow-list) → One secure link per customer to view & upload documents"**

This directly eliminates the repetitive manual work while keeping full control.

## 3) What We Will Build (For This PPO)

| # | Module | Description | Business Value |
|---|---|---|---|
| **1** | **File Upload + Validation** | Upload `.xlsx` file directly from local machine via File Upload control. System validates each row against business rules, pulls consignee email from **Standard Remarks**, flags HOLD/Calling/bare FEBRK as "Not Sendable" with reason. Shows **Accepted vs Rejected/BLOCKED** side-by-side. | **Quality Check** - No wrong emails. Every rejected row shows exact reason. Nothing dropped silently. |
| **2** | **Pre-Alert Sending (Controlled)** | Send pre-alert emails via Outlook, **only to allow-listed emails**. Logs every outbound mail to system. Updates shipment status. Built with **TEST MODE ON** by default. | **Saves Time** - Bulk send in controlled manner. Full audit trail. Zero risk of blasting full list. |
| **3** | **Tokenized Customer Link** | Generate a secure, unique link per shipment (`?t=<token>`). Customer sees their package details, required documents checklist, and can upload documents directly. All uploads logged and visible on dashboard. | **Faster Document Collection** - No endless email chains. Customer uploads directly. Team sees updates in real-time. | 

## 4) How It Works (Technical Flow)

```text
[User uploads Excel from local machine]
            ↓
[Power Automate Flow reads & validates Excel]
            ↓
[Canvas App shows Accepted/Rejected with reasons]
            ↓
[User clicks Send - Only allow-listed rows go]
            ↓
[Outlook sends pre-alert with secure token link]
            ↓
[Customer clicks link → Views package + uploads docs]
            ↓
[Uploads saved to SharePoint, events logged → Visible in Canvas App]
```

## 5) Security & Controls

| Control | Details |
|---|---|
| **Allow-List Only** | By default, only pre-approved emails can receive pre-alerts. Prevents accidental sends. |
| **Token-Based Link** | Each link has a unique, unguessable token. No customer login needed. Invalid/expired tokens are rejected. |
| **Test Mode** | Can run end-to-end without touching real customers. |
| **Full Audit Trail** | Every email sent logged in `CD_Message`. Every link access & upload logged in `CD_ShipmentEvent`. |
| **Validation First** | System blocks sends if email missing, broker missing for FEBRK etc. Human must fix or it's not sent. |
| **SharePoint Backend** | Uses existing approved SharePoint lists. No new broad data access. |

## 6) What We Are NOT Building (Out of Scope for PPO)

| Item | Reason |
|---|---|
| **AI vs Human, IGM Panel, CHA Queue** | Nice to have, but not needed to prove the core value |
| **Advanced Dashboards/Metrics** | Focus is working loop, not reporting |
| **Column Mapping UI** | Mapping already defined from real file (`40EXCEL_IMPORT_MAP.md`) |
| **Full Power Pages Portal** | **SharePoint tokenized page** is sufficient for demo. Simpler, uses existing access. |
| **Auto-enrichment from 40k master file** | Already handled upstream as per process |

## 7) Resources Needed

| Resource | Status | Action Needed |
|---|---|---|
| **SharePoint Access** | ✅ Have | Already have access to `ClearanceDeskDemo` site & `CD_*` lists |
| **Power Automate** | ✅ Have | Need to create/import flows (I can provide JSON) |
| **Power Apps (Canvas)** | ✅ Have | Working in Studio |
| **SiteAssets access on SharePoint** | **Need to confirm** | To upload the customer HTML page. Can you check if you can upload files to `SiteAssets`? |
| **Power Pages Access (Future)** | **Not needed now** | Manager can consider later. SharePoint approach works for now. |

**Note on Power Pages:** If approved later, we can migrate to Power Pages with same token logic. For PPO demo, SharePoint approach is faster and uses available access.

## 8) Timeline & Demo Plan

| Phase | Task | Timeline |
|---|---|---|
| **Phase 1** | Fix data layer (reconcile script) + reconnect Canvas | Day 1 |
| **Phase 2** | Build File Upload + Validation (ScrBatchUpload) | Day 1-2 |
| **Phase 3** | Build Send logic (allow-list gated) | Day 2 |
| **Phase 4** | Build SharePoint token page + flows | Day 2-3 |
| **Phase 5** | End-to-end testing with real batch | Day 3 |

**Demo Script for PPO:**
1. **Upload** - Pick real UBOND/CONSOL `.xlsx` from laptop → Show accepted/rejected with reasons
2. **Validate** - Point out HOLD/Calling/bare FEBRK correctly marked as "Not Sendable"
3. **Send** - Send to allow-listed email (self) → Show email received
4. **Customer Link** - Open link on phone → Show package, checklist, upload a document. **Show Link Status changing: "Sent – Not Opened" → "Link Opened – Awaiting Docs" → "Docs Received" on Batch Board. Filter to see who is still pending.**
5. **Verify** - Show document appears in system / board updates

## 9) Ask to Manager

**Request:** Please allow creation/import of 2-3 Power Automate flows and upload of 1 HTML file to SharePoint `SiteAssets`. No new license required for this scope. 

**Goal:** Show a working prototype that saves ~1.5 hours per batch, eliminates wrong-recipient risk, and speeds up document collection - all with proper controls.

**Future Roadmap (Post-PPO):** If approved, can extend to full Power Pages portal, add auto-reminders, integrate with CHA workflow, and scale to all teams.
