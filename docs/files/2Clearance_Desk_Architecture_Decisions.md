# Clearance Desk — Architecture Decision Record

*Every technology choice, why it was made, what was considered, and what would change the decision.*

---

## ADR-01: Platform choice — Microsoft Power Platform + Azure

**Decision:** build entirely on Microsoft Power Platform (Power Apps, Power Automate, Power Pages, Dataverse) with Azure services (OpenAI, AI Search, Document Intelligence) for the AI layer.

**Why:**
- FedEx already runs Microsoft 365 + Azure — no new vendor, no new procurement cycle
- Every agent already has Outlook and Teams — zero adoption friction for the internal side
- Power Platform handles the "80% that's configuration" (tables, forms, views, security roles) without custom code
- Azure OpenAI keeps all data inside FedEx's Azure tenant — critical for InfoSec approval
- The 20% that needs custom logic (the AI reply engine, ACCS integration, TIFF conversion) runs as Power Automate flows calling Azure services

**Considered and rejected:**
- Custom web app (Next.js/React + Supabase): more flexible UI, but requires a dev team to maintain, and puts data outside FedEx's tenant. The existing cargo toolkit was built this way — it works for client-side tools but doesn't scale to a multi-team operational platform.
- Zendesk / Freshdesk / ServiceNow: purpose-built for helpdesks, but new vendor, new procurement, new data location, and doesn't integrate with ACCS or the existing Excel workflows.
- Pure Teams bots (Copilot Studio only): too limited for structured checklists, batch operations and the payment queue. Good for the notification layer but not the working screen.

**What would change this decision:** if Power Apps Premium licences are refused and the Standard-tier fallback (SharePoint Lists) proves too slow or limited for 56 users, a custom web app on Azure (inside FedEx's tenant) becomes the right choice. The Dataverse schema and Power Automate flows would survive unchanged — only the front end would move.

---

## ADR-02: Agent web app — model-driven app, not canvas app

**Decision:** build the agent-facing app as a Power Apps model-driven app with custom pages (canvas) for specific screens.

**Why:**
- Model-driven apps give you views, filters, bulk select, security roles and forms out of the box — no code needed for the 60% of screens that are "show a filtered list of records"
- At 56 users across 5 teams with different permissions, the built-in Dataverse security model saves weeks of custom RBAC development
- Custom pages (canvas app screens embedded inside the model-driven app) handle the 40% that needs a custom layout: batch upload, case detail with draft approval, supervisor dashboard
- Performance at scale: model-driven apps are server-rendered and handle thousands of records better than canvas apps

**Considered and rejected:**
- Canvas app only: slower with large datasets, security has to be hand-built, no built-in views/filters. Fine for 10 users, painful at 56.
- Custom web app (React): best UI, but requires a front-end developer to build and maintain every screen. Not justified when 60% of the screens are standard list/detail/form patterns.

---

## ADR-03: Customer portal — Power Pages, not Forms

**Decision:** customers interact through Power Pages (a token-protected web page per AWB) rather than Microsoft Forms.

**Why:**
- Forms cannot accept file uploads from people outside the FedEx organisation — this is a hard Microsoft limitation
- Power Pages can accept file uploads from anyone with a valid token link — no login required
- Power Pages can show a live status page (the unified link concept) — Forms can only collect data
- Power Pages can be styled to look professional and branded
- Power Pages talks directly to Dataverse — submissions tick required items automatically

**What would change this decision:** if Power Pages licensing is too expensive for the volume of external users, the fallback is: fields collected via Forms (which does work for fields, just not files) + documents collected by reply mail. The agent tags attachments to items manually. This works but loses the structured upload experience.

---

## ADR-04: Mail model — send from agent, Reply-To team mailbox

**Decision:** outbound mail is sent from the agent's own Outlook address, with Reply-To set to a team mailbox (one per case type: `trace.courier.del@`, `trace.cargo.del@`, `deldo@` for IGM).

**Why:**
- Customers value the relationship with their specific agent — a shared address feels impersonal and slower
- Reply-To ensures all replies go to one place where one flow reads them — 3 flows serve 56 agents
- Agent ownership is automatic: the batch they uploaded = their cases
- Adding a new agent requires no mailbox setup — just the app role and their existing Outlook connection

**Risks:**
- Customers may still write directly to the agent's personal inbox instead of replying. Mitigation: one Outlook rule per agent forwards AWB-related mail to the team mailbox. IT must confirm internal auto-forwarding is allowed.
- If IT doesn't allow the Reply-To override, fallback: send from the team mailbox with the agent's name in the signature. Less personal but fully functional.

---

## ADR-05: AI engine — Azure OpenAI + RAG, not fine-tuning

**Decision:** use Azure OpenAI (GPT-4o) with retrieval-augmented generation (RAG) from Azure AI Search. No model fine-tuning.

**Why:**
- RAG means the AI is always working from current templates, SOPs and approved past replies — no retraining when a template changes
- Every human edit to a draft improves the next suggestion automatically (the learning loop stores approved replies in the search index)
- Fine-tuning requires a data science team, training data pipelines and model versioning. RAG requires only a search index that Power Automate can write to.
- Azure OpenAI stays inside FedEx's Azure tenant — data residency guaranteed

**The four autonomy levels (Level 0–3) mean we don't have to decide "should AI reply automatically?" upfront.** Everything starts at Level 2 (draft for approval). Situations earn Level 1 (auto-send) only when 95%+ of drafts are approved unchanged over 100+ cases. The supervisor switches it on; it can be switched off instantly.

---

## ADR-06: Data store — Dataverse, not SharePoint Lists

**Decision:** use Dataverse as the system of record, not SharePoint Lists.

**Why:**
- Relational integrity: cases link to batches, required items link to cases, payments link to cases — SharePoint Lists don't enforce foreign keys
- Security roles: Dataverse has built-in row-level security scoped to teams — SharePoint requires custom permission management
- Performance: Dataverse handles complex queries (e.g. "all cases for agent X where items are missing and due before 16:30") faster than SharePoint Lists
- Power Apps model-driven apps require Dataverse — they don't work with SharePoint Lists

**Fallback if Premium is refused:** SharePoint Lists with manually managed permissions. Slower, less strict, but workable for a pilot of 12 users.

---

## ADR-07: Document storage — SharePoint, not Dataverse file columns

**Decision:** store documents (invoices, notices, customer uploads) in SharePoint (one folder per AWB), not in Dataverse file columns.

**Why:**
- SharePoint has no per-file size limit concern (Dataverse file columns cap at 128 MB but are slower)
- SharePoint folders can be shared with CHA via external sharing links (if InfoSec approves)
- Power Pages can save uploads directly to SharePoint
- The unified customer link serves documents from SharePoint — simple, fast, no extra infrastructure

---

## ADR-08: Reminder engine — Power Automate scheduled flow, not Delay actions

**Decision:** reminders are driven by a scheduled flow (every 15 minutes) checking due dates in Dataverse, not by Delay actions inside individual case flows.

**Why:**
- Delay actions in Power Automate hold a flow run open for hours/days — this consumes flow-run capacity and fails if the flow is redeployed or the platform restarts
- A scheduled flow is stateless: it reads Dataverse, finds what's due, sends reminders, and stops. If it fails, the next run catches up. No state is lost.
- Holiday and fee-tier logic is applied once in the sweeper, not duplicated in every case flow

---

## ADR-09: Gateway scalability — configuration, not code branches

**Decision:** every setting (mailboxes, cutoffs, fees, holidays, flight times, ACCS endpoints) is scoped to a gateway tag in Dataverse. Adding a new gateway is adding rows to configuration tables, not changing flows or code.

**How:**
- Every case, batch, company and template record carries a `gateway` column
- Every flow reads the gateway from the case and looks up the correct settings
- Adding Mumbai: create a new gateway record with BOM's cutoffs, fees, holidays and mailboxes. Deploy three new reply-intake triggers (one per team mailbox). Same flows, same app, same AI engine.

---

## ADR-10: TIFF → PDF conversion — inside the intake flow, not a separate tool

**Decision:** TIFF-to-PDF conversion happens automatically inside the ACCS enrichment flow (F02) when a .tiff file is returned. It is not a separate tool or a manual step.

**Options considered:**
1. Word Online "Convert file" action (simplest, no extra tools) — test first
2. Azure AI Document Intelligence (already in the stack for invoice reading) — better quality
3. Azure Function with the existing utif/pdf-lib logic from the cargo toolkit — best quality, most work

**Approach:** start with Option 1. If quality is insufficient on real ACCS TIFF files, move to Option 2. Option 3 only if the first two fail.
