#!/usr/bin/env python3
# Generates the Clearance Desk HTML mockups (design/UX flow only, no real logic).
import os

OUT = os.path.dirname(os.path.abspath(__file__))

NAV = [
    ("Home", "index.html", "home"),
    ("Upload batch", "upload.html", "upload"),
    ("Batch board", "board.html", "board"),
    ("Column mapping", "column-map.html", "map"),
    ("All cases", "cases.html", "cases"),
    ("Needs attention", "attention.html", "attention"),
    ("Case detail", "case-detail.html", "detail"),
    ("IGM panel", "igm.html", "igm"),
    ("AI vs human", "ai-vs-human.html", "ai"),
    ("Customer link", "customer-link.html", "customer"),
    ("CHA call queue", "cha-call-queue.html", "cha"),
    ("Batch metrics", "batch-metrics.html", "metrics"),
]

ICONS = {
    "home": '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/>',
    "upload": '<path d="M12 16V4"/><path d="m7 11 5-5 5 5"/><path d="M4 20h16"/>',
    "board": '<rect x="3" y="3" width="8" height="18" rx="2"/><rect x="13" y="3" width="8" height="11" rx="2"/>',
    "map": '<path d="M4 6h16M4 12h16M4 18h16"/>',
    "cases": '<path d="M4 5h16v14H4z"/><path d="M4 9h16"/>',
    "attention": '<path d="M12 3 2 21h20L12 3z"/><path d="M12 10v5"/><circle cx="12" cy="18" r="1" fill="currentColor"/>',
    "detail": '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    "igm": '<path d="M4 4h16v13H7l-3 3z"/>',
    "ai": '<circle cx="9" cy="12" r="3"/><circle cx="17" cy="6" r="2"/><path d="M4 20c0-2.5 2.2-4 5-4s5 1.5 5 4"/>',
    "customer": '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6"/>',
    "cha": '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    "metrics": '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
}


def nav_html(active):
    out = []
    for label, href, key in NAV:
        cls = ' class="active"' if key == active else ""
        out.append(
            '<a href="%s"%s><svg viewBox="0 0 24 24" width="18" height="18" fill="none" '
            'stroke="currentColor" stroke-width="2">%s</svg>%s</a>' % (href, cls, ICONS[key], label)
        )
    return "\n      ".join(out)


def switches():
    items = [("AI", True), ("Send", False), ("Follow-up", False), ("Call AI", False)]
    out = []
    for label, on in items:
        chk = " checked" if on else ""
        out.append('<label class="sw"><input type="checkbox"%s><span class="track"></span>%s</label>' % (chk, label))
    return "\n        ".join(out)


SHELL = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{title} — Clearance Desk (design mockup)</title>
<link rel="stylesheet" href="styles.css"/>
</head>
<body>
<div class="app">
  <aside class="sidebar">
    <div class="brand">
      <div class="logo">FX</div>
      <div>
        <div class="name">Clearance Desk</div>
        <div class="sub">Cargo · Phase 1</div>
      </div>
    </div>
    <nav class="nav">
      {nav}
    </nav>
    <div class="spacer"></div>
    <div class="foot">
      <div class="user">bipul.sikder@fedex.com</div>
      <div class="ver">Demo build · v0.1</div>
    </div>
  </aside>

  <div class="main">
    <header class="topbar">
      <div class="left">
        <h1>{title}</h1>
        <span class="badge warn">TEST MODE</span>
      </div>
      <div class="switches">
        {switches}
      </div>
    </header>
    <div class="accent"></div>

    <main class="content">
{content}
      <div class="refnote">Design mockup · sample data shown for layout only · not connected to live systems</div>
    </main>
  </div>
</div>
<script src="app.js"></script>
</body>
</html>
"""


def page(title, active, content):
    return SHELL.format(title=title, nav=nav_html(active), switches=switches(), content=content)


def kpi(value, title, desc, href="#", alert=False):
    cls = "kpi alert" if alert else "kpi"
    return ('<a class="%s" href="%s"><div class="v">%s</div><div class="t">%s</div>'
            '<div class="d">%s</div></a>' % (cls, href, value, title, desc))


def row(cells):
    return "<tr>" + "".join("<td>%s</td>" % c for c in cells) + "</tr>"


def clickrow(href, cells):
    return '<tr data-href="%s">' % href + "".join("<td>%s</td>" % c for c in cells) + "</tr>"


PAGES = {}


# ------------------------------------------------------------------ HOME
PAGES["index.html"] = page("Home", "home", """
      <div class="page-head">
        <div>
          <p class="g">Good day, Team Lead</p>
          <p class="s">Here is the cargo clearance desk at a glance. Read the numbers, then act.</p>
        </div>
        <div class="btn-row">
          <a class="btn big primary" href="upload.html">Upload UBOND batch</a>
          <a class="btn big outline" href="upload.html">Upload CONSOL batch</a>
        </div>
      </div>

      <div class="money">
        <div>
          <div class="amount">₹ 1,47,000</div>
          <div class="cap">BOE penalty exposure at risk</div>
        </div>
        <div class="facts">
          <div class="fact"><b>2</b><span>confirmed BOEs today</span></div>
          <div class="fact"><b>5</b><span>awaiting CHA reply</span></div>
          <div class="fact"><b>11</b><span>documents complete</span></div>
          <div class="fact"><b>13</b><span>still collecting</span></div>
        </div>
        <div class="baseline">Old way: ~1.5 hours per 150 rows, one email at a time. This: 3–5 minutes. <em>(baseline from source doc)</em></div>
      </div>

      <h2 class="section-h">Today at a glance</h2>
      <div class="kpis">
        %s
        %s
        %s
        %s
        %s
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-head"><h3>Active batches</h3><a class="btn sm ghost" href="board.html">Open batch board</a></div>
          <table class="tbl">
            <thead><tr><th>Batch</th><th>Pipeline</th><th>Sent</th><th>Docs</th><th>Status</th></tr></thead>
            <tbody>
              %s
              %s
            </tbody>
          </table>
        </div>
        <div class="card">
          <div class="card-head"><h3>Quick links</h3></div>
          <div class="card-body stack">
            <a class="btn ghost" href="cases.html">All cases — search &amp; track</a>
            <a class="btn ghost" href="attention.html">Needs attention <span class="badge warn-tint">12</span></a>
            <a class="btn ghost" href="ai-vs-human.html">AI vs human — automation rate</a>
            <a class="btn ghost" href="cha-call-queue.html">CHA call queue — 27 blocked</a>
            <a class="btn ghost" href="batch-metrics.html">Batch metrics — docs funnel</a>
          </div>
        </div>
      </div>

      <h2 class="section-h">System status</h2>
      <div class="flex wrap">
        <span class="badge warn"><span class="dot"></span>Test mode ON</span>
        <span class="badge ok"><span class="dot"></span>SharePoint connected</span>
        <span class="badge info"><span class="dot"></span>18 lists loaded</span>
        <span class="badge neutral"><span class="dot"></span>Shared mailbox: healthy</span>
        <span class="muted small">As of 13 Oct 2026, 09:42</span>
      </div>
""" % (
    kpi("150", "Rows in", "Uploaded from UBOND / CONSOL", "cases.html"),
    kpi("142", "Pre-alerts sent", "Pre-alert emails dispatched", "board.html"),
    kpi("61", "Docs received", "Documents received from CHA", "batch-metrics.html"),
    kpi("12", "Need attention", "Cases requiring a person", "attention.html", alert=True),
    kpi("3", "Claimed", "Shipments claimed by CHA", "cases.html"),
    row(['<span class="mono">BATCH-…-UBOND</span>', '<span class="pipe ubond">UBOND</span>', '142', '61',
         '<span class="badge ok">SENDING</span>']),
    row(['<span class="mono">BATCH-…-CONSOL</span>', '<span class="pipe consol">CONSOL</span>', '—', '—',
         '<span class="badge neutral">DRAFT</span>']),
))


# ------------------------------------------------------------------ UPLOAD
PAGES["upload.html"] = page("Upload batch", "upload", """
      <div class="page-head">
        <div>
          <p class="g">Upload a batch</p>
          <p class="s">Pipeline A (UBOND) or Pipeline B (CONSOL). This choice changes everything downstream.</p>
        </div>
      </div>

      <div class="steps">
        <span class="step active"><b>1</b>Upload</span>
        <span class="step"><b>2</b>Map columns</span>
        <span class="step"><b>3</b>Validate</span>
        <span class="step"><b>4</b>Create batch</span>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-head"><h3>1 · Pipeline</h3></div>
          <div class="card-body stack">
            <div class="chips">
              <span class="chip active">UBOND <span class="muted small">(default)</span></span>
              <span class="chip">CONSOL</span>
            </div>
            <div class="kv"><span class="k">Batch label</span><span class="v mono">BATCH-20261013-0930-UBOND</span></div>
            <div class="kv"><span class="k">Records expected</span><span class="v">~150</span></div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h3>2 · Source file</h3></div>
          <div class="card-body stack">
            <div class="dropzone">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 16V4"/><path d="m7 11 5-5 5 5"/><path d="M4 20h16"/></svg>
              <div class="big">Drop the Excel here</div>
              <div class="small">or choose a file already in the shared-mailbox ingest folder</div>
            </div>
            <div class="small muted">Recent ingest folder:</div>
            <div class="stack tight">
              <span>UBOND_20261013_0930.xlsx <span class="badge purple">selected</span></span>
              <span class="muted small">UBOND_20261012_1700.xlsx</span>
            </div>
          </div>
        </div>
      </div>

      <h2 class="section-h">3 · Validation — accepted and rejected, side by side</h2>
      <div class="two-col">
        <div class="card">
          <div class="col-head ok"><span>Accepted</span><span>147</span></div>
          <div class="card-body">
            <table class="tbl">
              <thead><tr><th>AWB</th><th>Company</th><th>Type</th></tr></thead>
              <tbody>
                %s
                %s
                %s
              </tbody>
            </table>
            <div class="small muted" style="padding:10px 0 0">…142 more accepted rows</div>
          </div>
        </div>
        <div class="card">
          <div class="col-head warn"><span>Rejected</span><span>3</span></div>
          <div class="card-body">
            <table class="tbl">
              <thead><tr><th>AWB</th><th>Reason</th><th>Fix</th></tr></thead>
              <tbody>
                %s
                %s
                %s
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="btn-row">
        <a class="btn big primary" href="column-map.html">Accept and create batch</a>
        <a class="btn big ghost red" href="index.html">Reject all</a>
      </div>
""" % (
    row(['<span class="mono">781234567890</span>', 'Alpha Imports Pvt Ltd', '<span class="pipe ubond">NFBRK</span>']),
    row(['<span class="mono">781234567891</span>', 'Meridian Textiles', '<span class="pipe ubond">FEBRK-JEENA</span>']),
    row(['<span class="mono">781234567892</span>', 'Bharat Electronics', '<span class="pipe ubond">FEBRK-SUNIMPEX</span>']),
    row(['<span class="mono">781234567893</span>', 'Arihant Metals', '<span class="miss">AWB malformed</span>', 'Fix 11–12 digits']),
    row(['<span class="mono">781234567894</span>', 'Zenith Exports', '<span class="miss">Consignee email missing</span>', 'Add a valid email']),
    row(['<span class="mono">781234567895</span>', 'Kirti Overseas', '<span class="miss">Broker unresolved</span>', 'FEBRK needs Jeena/Sunimpex']),
))


# ------------------------------------------------------------------ COLUMN MAP
PAGES["column-map.html"] = page("Column mapping", "map", """
      <div class="page-head">
        <div>
          <p class="g">Confirm the column map</p>
          <p class="s">We auto-guessed the mapping from your Excel headers. Confirm or correct it, then continue.</p>
        </div>
      </div>

      <div class="steps">
        <span class="step done"><b>1</b>Upload</span>
        <span class="step active"><b>2</b>Map columns</span>
        <span class="step"><b>3</b>Validate</span>
        <span class="step"><b>4</b>Create batch</span>
      </div>

      <div class="card">
        <div class="card-head"><h3>Source column → target field</h3><span class="badge purple">11 of 11 mapped</span></div>
        <table class="tbl">
          <thead><tr><th>Source column (Excel)</th><th>Target field</th><th>Confidence</th><th>Sample</th></tr></thead>
          <tbody>
            %s
            %s
            %s
            %s
            %s
            %s
          </tbody>
        </table>
      </div>

      <div class="btn-row">
        <a class="btn big purple" href="board.html">Confirm mapping &amp; run validation</a>
        <a class="btn big ghost" href="upload.html">Back</a>
      </div>
""" % (
    row(["AWB No", "AWB", '<span class="badge ok">auto · 99%</span>', '<span class="mono">781234567890</span>']),
    row(["Consignee", "ConsigneeName", '<span class="badge ok">auto · 96%</span>', 'Alpha Imports Pvt Ltd']),
    row(["Email", "ContactEmail", '<span class="badge ok">auto · 92%</span>', 'ops@alpha.example']),
    row(["End Result", "EndResult / ClearanceType", '<span class="badge warn-tint">check</span>', 'FEBRK-JEENA']),
    row(["Flight", "Flight", '<span class="badge ok">auto · 88%</span>', 'AI 161']),
    row(["Pieces", "Pieces", '<span class="badge neutral">manual</span>', '12']),
))


# ------------------------------------------------------------------ BOARD
PAGES["board.html"] = page("Batch board", "board", """
      <div class="page-head">
        <div>
          <p class="g">Batch board</p>
          <p class="s">Pre-flight runs per row — one bad row never blocks the good ones.</p>
        </div>
        <div class="btn-row">
          <span class="badge purple">BATCH-20261013-0930-UBOND</span>
          <span class="pipe ubond">UBOND</span>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <div class="flex wrap" style="gap:26px">
            <div><div class="muted small">Rows in</div><div style="font-size:22px;font-weight:700">150</div></div>
            <div><div class="muted small">Accepted</div><div style="font-size:22px;font-weight:700">147</div></div>
            <div><div class="muted small">Rejected</div><div style="font-size:22px;font-weight:700;color:var(--orange-dark)">3</div></div>
            <div><div class="muted small">Pre-flight pass</div><div style="font-size:22px;font-weight:700;color:var(--green)">142</div></div>
            <div><div class="muted small">Blocked</div><div style="font-size:22px;font-weight:700;color:var(--red)">5</div></div>
          </div>
          <div style="margin-top:16px">
            <div class="flex between small"><span class="muted">Send progress · sub-batch 4 of 6</span><span>98 / 142</span></div>
            <div class="progress" style="margin-top:6px"><i style="width:69%%"></i></div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>Pre-flight — per row</h3><span class="muted small">142 pass · 5 blocked</span></div>
        <table class="tbl">
          <thead><tr><th>AWB</th><th>Company</th><th>Placeholders</th><th>Clearance type</th><th>Recipient</th><th>Result</th></tr></thead>
          <tbody>
            %s
            %s
            %s
            %s
            %s
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-body flex between wrap">
          <div>
            <div style="font-weight:600">Send pre-alerts</div>
            <div class="muted small">Runs in sub-batches of 25, paced. A failed sub-batch is retryable; the rest keep going.</div>
          </div>
          <div class="btn-row">
            <a class="btn big ghost" href="attention.html">Review 5 blocked</a>
            <a class="btn big primary" href="batch-metrics.html">SEND <span class="small">(TEST — NOTHING LEAVES)</span></a>
          </div>
        </div>
      </div>
""" % (
    row(['<span class="mono">781234567890</span>', 'Alpha Imports Pvt Ltd', '<span class="check">all set</span>', 'NFBRK', '<span class="check">valid</span>', '<span class="badge ok">PASS</span>']),
    row(['<span class="mono">781234567891</span>', 'Meridian Textiles', '<span class="check">all set</span>', 'FEBRK-JEENA', '<span class="check">valid</span>', '<span class="badge ok">PASS</span>']),
    row(['<span class="mono">781234567892</span>', 'Bharat Electronics', '<span class="check">all set</span>', 'FEBRK-SUNIMPEX', '<span class="check">valid</span>', '<span class="badge ok">PASS</span>']),
    row(['<span class="mono">781234567896</span>', 'Nova Freight', '<span class="req">[C2] missing</span>', '<span class="miss">unresolved</span>', '<span class="check">valid</span>', '<span class="badge warntint">BLOCKED</span>']),
    row(['<span class="mono">781234567897</span>', 'Trident Logistics', '<span class="check">all set</span>', 'NFBRK', '<span class="miss">bad email</span>', '<span class="badge warntint">BLOCKED</span>']),
))


# ------------------------------------------------------------------ ALL CASES
PAGES["cases.html"] = page("All cases", "cases", """
      <div class="page-head">
        <div>
          <p class="g">All cases</p>
          <p class="s">Search and track every shipment. This is the screen agents live on.</p>
        </div>
        <a class="btn big primary" href="upload.html">Upload batch</a>
      </div>

      <div class="card">
        <div class="card-body stack">
          <input style="width:100%%;height:44px;border-radius:10px;border:1px solid var(--line);padding:0 14px;font-size:14px;outline:none" placeholder="Search AWB, company, case ref or customer email…"/>
          <div class="chips">
            <span class="chip active">All</span>
            <span class="chip">My cases</span>
            <span class="chip">Unclaimed</span>
            <span class="chip">Open</span>
            <span class="chip">Escalated</span>
            <span class="chip">Awaiting docs</span>
            <span class="chip">Awaiting payment</span>
            <span class="chip">Closed today</span>
          </div>
        </div>
      </div>

      <div class="card">
        <table class="tbl">
          <thead><tr><th>AWB</th><th>Company</th><th>Pipeline</th><th>Status</th><th>Fee tier</th><th>Docs</th><th>Reminders</th><th>Claimed by</th></tr></thead>
          <tbody>
            %s
            %s
            %s
            %s
            %s
            %s
            %s
          </tbody>
        </table>
      </div>
""" % (
    clickrow("case-detail.html", ['<span class="mono">781234567890</span>', 'Alpha Imports Pvt Ltd', '<span class="pipe ubond">UBOND</span>', '<span class="badge warn-tint">Awaiting docs</span>', 'Tier 2 · ₹5,000', '<b>2/5</b>', '2', '<span class="muted">—</span>']),
    clickrow("case-detail.html", ['<span class="mono">781234567891</span>', 'Meridian Textiles', '<span class="pipe ubond">UBOND</span>', '<span class="badge info">Open</span>', 'Tier 1 · ₹2,500', '<b>5/5</b>', '0', 'R. Nair']),
    clickrow("case-detail.html", ['<span class="mono">781234567892</span>', 'Bharat Electronics', '<span class="pipe ubond">UBOND</span>', '<span class="badge red">Escalated</span>', 'Tier 3 · ₹10,000', '<b>1/6</b>', '3', '<span class="muted">—</span>']),
    clickrow("case-detail.html", ['<span class="mono">781234567896</span>', 'Nova Freight', '<span class="pipe consol">CONSOL</span>', '<span class="badge purple">Awaiting payment</span>', 'Tier 2 · ₹5,000', '<b>5/5</b>', '1', 'S. Rao']),
    clickrow("case-detail.html", ['<span class="mono">781234567898</span>', 'Sun Impex', '<span class="pipe ubond">UBOND</span>', '<span class="badge ok">Closed</span>', 'Tier 1 · ₹2,500', '<b>5/5</b>', '0', 'R. Nair']),
    clickrow("case-detail.html", ['<span class="mono">781234567899</span>', 'Zenith Exports', '<span class="pipe ubond">UBOND</span>', '<span class="badge warn-tint">Awaiting docs</span>', 'Tier 2 · ₹5,000', '<b>3/5</b>', '1', '<span class="muted">—</span>']),
    clickrow("case-detail.html", ['<span class="mono">781234567900</span>', 'Kirti Overseas', '<span class="pipe consol">CONSOL</span>', '<span class="badge info">Open</span>', 'Tier 3 · ₹10,000', '<b>4/6</b>', '0', 'S. Rao']),
))


# ------------------------------------------------------------------ NEEDS ATTENTION
PAGES["attention.html"] = page("Needs attention", "attention", """
      <div class="page-head">
        <div>
          <p class="g">Needs attention</p>
          <p class="s">Grouped by case type, then reason. Every entry carries its fix. Never guess.</p>
        </div>
        <span class="badge warn">12 open</span>
      </div>

      <div class="card">
        <div class="group-label">CHA_UNRESOLVED · 5 cases</div>
        <div class="list">
          %s
          %s
        </div>

        <div class="group-label">DOC_MISSING · 4 cases</div>
        <div class="list">
          %s
          %s
        </div>

        <div class="group-label">PAYMENT_PENDING · 3 cases</div>
        <div class="list">
          %s
        </div>
      </div>
""" % (
    '<div class="list-row"><div class="grow"><b><span class="mono">781234567895</span> · Kirti Overseas</b><div class="small muted">Broker unresolved: bare FEBRK, no Jeena/Sunimpex</div><div class="small">Fix: confirm broker in CHA call queue</div></div><div class="r stack tight"><a class="btn sm purple" href="cha-call-queue.html">Claim</a></div></div>',
    '<div class="list-row"><div class="grow"><b><span class="mono">781234567896</span> · Nova Freight</b><div class="small muted">Clearance type could not be resolved</div><div class="small">Fix: pick clearance type, then retry</div></div><div class="r stack tight"><a class="btn sm ghost">Retry</a></div></div>',
    '<div class="list-row"><div class="grow"><b><span class="mono">781234567890</span> · Alpha Imports</b><div class="small muted">Missing: IEC / GST, e-way bill</div><div class="small">Fix: send reminder, or upload on behalf</div></div><div class="r stack tight"><a class="btn sm purple" href="case-detail.html">Claim</a></div></div>',
    '<div class="list-row"><div class="grow"><b><span class="mono">781234567899</span> · Zenith Exports</b><div class="small muted">Missing: bank AD code</div><div class="small">Fix: customer uploaded partial — 1 item left</div></div><div class="r stack tight"><a class="btn sm ghost green">Remind</a></div></div>',
    '<div class="list-row"><div class="grow"><b><span class="mono">781234567896</span> · Nova Freight</b><div class="small muted">Fee tier raised to Tier 2 after 5th document</div><div class="small">Fix: verify DO payment receipt</div></div><div class="r stack tight"><a class="btn sm purple" href="igm.html">Open IGM</a></div></div>',
))


# ------------------------------------------------------------------ CASE DETAIL
PAGES["case-detail.html"] = page("Case detail", "detail", """
      <div class="page-head">
        <div>
          <p class="g mono" style="font-size:24px">AWB 781234567890</p>
          <p class="s">Alpha Imports Pvt Ltd · NFBRK · Kolkata</p>
        </div>
        <div class="btn-row">
          <span class="badge warn-tint">Awaiting docs</span>
          <a class="btn big purple" href="attention.html">Claim</a>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>Summary</h3><span class="badge info">AI generated</span></div>
        <div class="card-body">
          <p style="margin:0 0 10px">Pre-alert sent 13 Oct 09:12. Customer has opened the link and uploaded the commercial invoice and bank AD code. Three items are still outstanding, so the BOE cannot be filed pre-arrival yet. Oldest open item is 1 day old.</p>
          <div class="flex wrap" style="gap:10px">
            <span class="badge warn-tint">Open: IEC / GST, e-way bill, auth letter</span>
            <span class="badge info">Next: send reminder at 12:00</span>
          </div>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-head"><h3>Documents checklist</h3><span class="badge neutral">2 / 5</span></div>
          <div class="card-body stack tight">
            <div class="kv"><span class="k"><span class="check">✓</span> Commercial invoice</span><span class="v small muted">received 09:31</span></div>
            <div class="kv"><span class="k"><span class="check">✓</span> Bank AD code</span><span class="v small muted">received 09:31</span></div>
            <div class="kv"><span class="k"><span class="miss">✗</span> IEC / GST</span><span class="v small">outstanding</span></div>
            <div class="kv"><span class="k"><span class="miss">✗</span> e-way bill</span><span class="v small">outstanding</span></div>
            <div class="kv"><span class="k"><span class="miss">✗</span> Auth letter</span><span class="v small">outstanding</span></div>
            <div class="btn-row" style="margin-top:10px"><a class="btn sm ghost" href="customer-link.html">Upload on behalf</a><a class="btn sm ghost green">Send reminder</a></div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h3>Fee</h3><span class="badge neutral">Tier 2</span></div>
          <div class="card-body stack tight">
            <div class="kv"><span class="k">Tier</span><span class="v">Tier 2 · ₹5,000</span></div>
            <div class="kv"><span class="k">Documents received</span><span class="v">2</span></div>
            <div class="kv"><span class="k">Changed?</span><span class="v">Yes — 12 Oct 18:04</span></div>
            <div class="kv"><span class="k">Why</span><span class="v small">crossed 2-document threshold</span></div>
          </div>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-head"><h3>Replies (one thread per AWB)</h3></div>
          <div class="card-body stack">
            <div class="list-row" style="padding:0"><div class="grow"><b>Outbound · pre-alert</b><div class="small muted">13 Oct 09:12 · AI path · AUTO</div></div><span class="badge ok">delivered</span></div>
            <div class="list-row" style="padding:0"><div class="grow"><b>Inbound · customer</b><div class="small muted">13 Oct 09:31 · 2 attachments matched</div></div><span class="badge info">classified</span></div>
            <div class="list-row" style="padding:0"><div class="grow"><b>Outbound · reminder</b><div class="small muted">13 Oct 12:00 · scheduled</div></div><span class="badge neutral">queued</span></div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h3>AI decisions</h3></div>
          <div class="card-body stack tight">
            <div class="kv"><span class="k">Classification</span><span class="v">AUTO · 0.93</span></div>
            <div class="kv"><span class="k">Rules fired</span><span class="v small">F13.2, F14.1</span></div>
            <div class="kv"><span class="k">Risk flag</span><span class="v">none</span></div>
            <div class="kv"><span class="k">Path</span><span class="v">routine</span></div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>Timeline</h3><span class="muted small">append-only · newest first</span></div>
        <div class="card-body">
          <ul class="timeline">
            <li><div class="when">13 Oct 12:00</div><div class="what">Reminder scheduled</div><div class="who">system</div></li>
            <li><div class="when">13 Oct 09:31</div><div class="what">2 documents received and matched</div><div class="who">customer</div></li>
            <li><div class="when">13 Oct 09:12</div><div class="what">Pre-alert sent (TEST)</div><div class="who">bipul.sikder@fedex.com</div></li>
            <li><div class="when">13 Oct 09:10</div><div class="what">Case created from BATCH-20261013-0930-UBOND</div><div class="who">system</div></li>
          </ul>
        </div>
      </div>
""", )


# ------------------------------------------------------------------ IGM
PAGES["igm.html"] = page("IGM panel", "igm", """
      <div class="page-head">
        <div>
          <p class="g">IGM panel</p>
          <p class="s">CONSOL entry, payment verification, and DO issue. Closing the case happens here.</p>
        </div>
        <span class="pipe consol">CONSOL</span>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-head"><h3>CONSOL entry</h3></div>
          <div class="card-body stack">
            <div class="kv"><span class="k">MAWB</span><span class="v mono">020-12345678</span></div>
            <div class="kv"><span class="k">IGM number</span><span class="v mono">IGM/CCU/2026/4471</span></div>
            <div class="kv"><span class="k">Flight</span><span class="v">AI 161 / 12 SEP</span></div>
            <div class="kv"><span class="k">Arrival date</span><span class="v">12 Sep 2026</span></div>
            <div class="kv"><span class="k">Pieces / weight</span><span class="v">48 · 612 kg</span></div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h3>Payment verification</h3><span class="badge warn-tint">pending</span></div>
          <div class="card-body stack">
            <div class="kv"><span class="k">Fee tier</span><span class="v">Tier 2 · ₹5,000</span></div>
            <div class="kv"><span class="k">Receipt</span><span class="v">not uploaded</span></div>
            <div class="kv"><span class="k">Bank reference</span><span class="v muted">—</span></div>
            <div class="small muted">DO cannot be issued until payment is verified.</div>
            <div class="btn-row" style="margin-top:6px"><a class="btn sm ghost">Upload receipt</a></div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body flex between wrap">
          <div>
            <div style="font-weight:600">Delivery Order</div>
            <div class="muted small">DO PDF goes to the customer link · customer notified in thread · broker notified · case closed.</div>
          </div>
          <div class="btn-row">
            <a class="btn big purple" href="customer-link.html">Issue DO &amp; close case</a>
          </div>
        </div>
      </div>
""", )


# ------------------------------------------------------------------ AI VS HUMAN
PAGES["ai-vs-human.html"] = page("AI vs human", "ai", """
      <div class="page-head">
        <div>
          <p class="g">AI vs human</p>
          <p class="s">What the system handled on its own, and what genuinely needs a person.</p>
        </div>
      </div>

      <div class="card">
        <div class="card-body flex wrap" style="gap:34px">
          <div><div style="font-size:30px;font-weight:800;color:var(--green)">139</div><div class="muted small">auto-handled</div></div>
          <div><div style="font-size:30px;font-weight:800;color:var(--orange-dark)">12</div><div class="muted small">need a person</div></div>
          <div><div style="font-size:30px;font-weight:800;color:var(--purple)">92%%</div><div class="muted small">automated</div></div>
          <div class="muted small" style="max-width:340px">Computed from real rows, not typed in. This is the headline number.</div>
        </div>
      </div>

      <div class="two-col">
        <div class="card">
          <div class="col-head ok"><span>System handled</span><span>139</span></div>
          <div class="list">
            %s
            %s
            %s
          </div>
        </div>
        <div class="card">
          <div class="col-head warn"><span>Needs a person</span><span>12</span></div>
          <div class="list">
            %s
            %s
            %s
          </div>
        </div>
      </div>
""" % (
    '<div class="list-row"><div class="grow"><b>AUTO classification</b><div class="small muted">confidence 0.93 · reason: subject matched template T2</div></div><span class="badge ok">✓</span></div>',
    '<div class="list-row"><div class="grow"><b>Document matched to AWB</b><div class="small muted">filename pattern · invoice_781234567890.pdf</div></div><span class="badge ok">✓</span></div>',
    '<div class="list-row"><div class="grow"><b>Confidence ≥ 0.7 routine</b><div class="small muted">reason shown verbatim · time saved est. 41 min</div></div><span class="badge ok">✓</span></div>',
    '<div class="list-row"><div class="grow"><b>ESCALATE · broker unresolved</b><div class="small muted">bare FEBRK — no Jeena/Sunimpex</div><div class="small">Fix: confirm broker</div></div><a class="btn sm purple" href="attention.html">Claim</a></div>',
    '<div class="list-row"><div class="grow"><b>ESCALATE · risk flag</b><div class="small muted">fee tier changed after 5th document</div><div class="small">Fix: verify payment</div></div><a class="btn sm purple" href="igm.html">Claim</a></div>',
    '<div class="list-row"><div class="grow"><b>ESCALATE · low confidence</b><div class="small muted">classification 0.61 &lt; 0.7</div><div class="small">Fix: review reply</div></div><a class="btn sm purple" href="case-detail.html">Claim</a></div>',
))


# ------------------------------------------------------------------ CUSTOMER LINK
PAGES["customer-link.html"] = page("Customer link", "customer", """
      <div class="page-head">
        <div>
          <p class="g">Customer link</p>
          <p class="s">Token-gated, expiring, per-shipment. The link <em>is</em> the document delivery — no attachments on mail.</p>
        </div>
        <span class="badge purple">expires in 6 days</span>
      </div>

      <div class="tabbar">
        <div class="tab active" data-target="#pane-cust" data-scope=".content">Customer view</div>
        <div class="tab" data-target="#pane-cha" data-scope=".content">CHA view (same link, different role)</div>
      </div>

      <div id="pane-cust" class="tabpane active">
        <div class="card">
          <div class="card-head"><h3>Clearance package · AWB 781234567890</h3><span class="badge info">Awaiting docs</span></div>
          <div class="card-body">
            <div class="kv"><span class="k">Consignee</span><span class="v">Alpha Imports Pvt Ltd</span></div>
            <div class="kv"><span class="k">Clearance type</span><span class="v">NFBRK</span></div>
            <div class="kv"><span class="k">Fee</span><span class="v">Tier 2 · ₹5,000 <span class="muted small">(tier explained)</span></span></div>
          </div>
        </div>

        <div class="two-col" style="margin-top:16px">
          <div class="card">
            <div class="card-head"><h3>Your checklist</h3><span class="badge neutral">2 / 5</span></div>
            <div class="card-body stack tight">
              <div class="kv"><span class="k"><span class="check">✓</span> Converted invoice</span><span class="v small muted">ready</span></div>
              <div class="kv"><span class="k"><span class="check">✓</span> Bank AD code</span><span class="v small muted">ready</span></div>
              <div class="kv"><span class="k"><span class="miss">✗</span> IEC / GST</span><span class="v small">needed</span></div>
              <div class="kv"><span class="k"><span class="miss">✗</span> e-way bill</span><span class="v small">needed</span></div>
              <div class="kv"><span class="k"><span class="miss">✗</span> Auth letter</span><span class="v small">needed</span></div>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><h3>Upload documents</h3></div>
            <div class="card-body stack">
              <div class="dropzone" style="padding:22px"><div class="big">Drop files here</div><div class="small">PDF or image · max 10 MB each</div></div>
              <div class="btn-row"><a class="btn sm primary">Upload</a><a class="btn sm ghost">Cancel</a></div>
            </div>
          </div>
        </div>
      </div>

      <div id="pane-cha" class="tabpane">
        <div class="card">
          <div class="card-head"><h3>Clearance package · AWB 781234567890</h3><span class="badge purple">Role: CHA (Jeena)</span></div>
          <div class="card-body">
            <div class="kv"><span class="k">Appointed by</span><span class="v">FEDEX · received 06:40</span></div>
            <div class="kv"><span class="k">Flight</span><span class="v">AI 161 / 12 SEP · MAWB pending — pre-arrival filing</span></div>
            <div class="kv"><span class="k">BOE status</span><span class="v">WITH CHA — awaiting your confirmation</span></div>
          </div>
          <div class="card-body" style="border-top:1px solid var(--line-2)">
            <span class="badge warn"><span class="dot"></span>₹10,000/day exposure from day 4 · Notification 34/2021</span>
          </div>
          <div class="card-body" style="border-top:1px solid var(--line-2)">
            <div class="small muted" style="margin-bottom:8px">DOCUMENTS (all present)</div>
            <div class="flex wrap" style="gap:8px">
              <span class="badge ok">✓ Commercial invoice</span>
              <span class="badge ok">✓ IEC / GST</span>
              <span class="badge ok">✓ Technical writeup</span>
              <span class="badge ok">✓ Bank AD code</span>
              <span class="badge ok">✓ Auth letter</span>
              <span class="badge ok">✓ e-way bill</span>
            </div>
          </div>
          <div class="card-body btn-row" style="border-top:1px solid var(--line-2)">
            <a class="btn big purple" href="igm.html">Mark BOE filed</a>
            <a class="btn big ghost red" href="attention.html">Documents missing — send back</a>
          </div>
        </div>
      </div>
""", )


# ------------------------------------------------------------------ CHA CALL QUEUE
PAGES["cha-call-queue.html"] = page("CHA call queue", "cha", """
      <div class="page-head">
        <div>
          <p class="g">CHA call queue</p>
          <p class="s">Linear, phone-based and stateful. Keyboard-driven — the agent is on a call and cannot type.</p>
        </div>
      </div>

      <div class="card">
        <div class="card-body flex wrap" style="gap:30px">
          <div><div style="font-size:22px;font-weight:700">14</div><div class="muted small">companies</div></div>
          <div><div style="font-size:22px;font-weight:700">27</div><div class="muted small">shipments blocked</div></div>
          <div><div style="font-size:22px;font-weight:700">3 days</div><div class="muted small">oldest waiting</div></div>
          <div><div style="font-size:22px;font-weight:700;color:var(--orange-dark)">₹ 96,000</div><div class="muted small">penalty exposure</div></div>
        </div>
      </div>

      <div class="card">
        <div class="group-label"><span class="badge warn">⚠ 1 callback due today</span></div>
        <div class="list">
          %s
          %s
          %s
        </div>
        <div class="group-label">Confirmed today — collapsed receipts</div>
        <div class="list">
          %s
        </div>
      </div>

      <div class="card">
        <div class="card-body flex wrap" style="gap:16px">
          <span><span class="kbd">Enter</span> call next</span>
          <span><span class="kbd">C</span> confirm broker</span>
          <span><span class="kbd">R</span> re-upload Excel</span>
        </div>
      </div>
""" % (
    '<div class="list-row"><div class="grow"><b>▶ ALPHA IMPORTS PVT LTD</b> <span class="badge neutral">4 AWB</span><div class="small muted">Kolkata · FEDEX_NOMINATED · KYC on file ✓</div><div class="small">“Confirm Jeena or Sunimpex, or your own CHA”</div></div><div class="r"><div style="font-weight:700">waiting 3d 6h</div><div class="small" style="color:var(--orange-dark)">₹ 24,000</div></div></div>'
    '<div class="btn-row" style="padding:0 18px 14px 18px"><a class="btn sm purple">Call</a><a class="btn sm ghost green">Confirm Jeena</a><a class="btn sm ghost green">Confirm Sunimpex</a><a class="btn sm ghost">Customer\'s own CHA</a><a class="btn sm ghost">Callback —</a><a class="btn sm ghost red">Unreachable</a></div>',
    '<div class="list-row"><div class="grow"><b>MERIDIAN TEXTILES</b> <span class="badge neutral">1 AWB</span><div class="small muted">Mumbai · FEDEX_NOMINATED · KYC on file ✓</div></div><div class="r"><div style="font-weight:700">waiting 1d 2h</div><div class="small" style="color:var(--orange-dark)">₹ 5,000</div></div></div>'
    '<div class="btn-row" style="padding:0 18px 14px 18px"><a class="btn sm purple">Call</a><a class="btn sm ghost green">Confirm Jeena</a><a class="btn sm ghost green">Confirm Sunimpex</a><a class="btn sm ghost">Customer\'s own CHA</a><a class="btn sm ghost">Callback —</a><a class="btn sm ghost red">Unreachable</a></div>',
    '<div class="list-row"><div class="grow"><b>BHARAT ELECTRONICS</b> <span class="badge neutral">2 AWB</span><div class="small muted">Bengaluru · FEDEX_NOMINATED · KYC on file ✓</div></div><div class="r"><div style="font-weight:700">waiting 0d 4h</div><div class="small" style="color:var(--orange-dark)">₹ 10,000</div></div></div>'
    '<div class="btn-row" style="padding:0 18px 14px 18px"><a class="btn sm purple">Call</a><a class="btn sm ghost green">Confirm Jeena</a><a class="btn sm ghost green">Confirm Sunimpex</a><a class="btn sm ghost">Customer\'s own CHA</a><a class="btn sm ghost">Callback —</a><a class="btn sm ghost red">Unreachable</a></div>',
    '<div class="list-row"><div class="grow"><b>Alphatronics</b> <span class="badge ok">4 AWB · Jeena confirmed 16:04</span><div class="small muted">4 cases sent · <a href="cases.html">view cases</a></div></div><a class="btn sm ghost">Undo</a></div>',
))


# ------------------------------------------------------------------ BATCH METRICS
def funnel(label, val, pct, cls=""):
    return ('<div class="funnel-row"><div>%s</div><div class="bar %s"><i style="width:%d%%"></i></div>'
            '<div class="val">%s</div></div>' % (label, cls, pct, val))


PAGES["batch-metrics.html"] = page("Batch metrics", "metrics", """
      <div class="page-head">
        <div>
          <p class="g">Batch metrics</p>
          <p class="s">How many documents came back — per batch, both pipelines side by side.</p>
        </div>
        <span class="badge purple">BATCH-20261013-0930-UBOND</span>
      </div>

      <div class="card">
        <div class="card-head"><h3>Funnel</h3><span class="pipe ubond">UBOND</span></div>
        <div class="card-body">
          %s
          %s
          %s
          %s
          %s
          %s
          %s
          %s
          %s
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>Docs received by clearance type</h3><span class="muted small">the actionable cut</span></div>
        <div class="card-body">
          %s
          %s
          %s
          <div class="small muted" style="margin-top:10px">A 48%% Sunimpex response rate is a broker problem, not a system problem — the cut makes it visible.</div>
        </div>
      </div>
""" % (
    funnel("Rows in", "150", 100),
    funnel("Accepted", "147", 98, "ok"),
    funnel("Rejected", "3", 2, "warn"),
    funnel("Pre-alerts sent", "142", 95),
    funnel("Replied", "96", 64),
    funnel("Docs received", "71", 47, "ok"),
    funnel("Checklists complete", "44", 29),
    funnel("Awaiting payment", "19", 13, "warn"),
    funnel("Closed", "6", 4),
    funnel("NFBRK — 31 / 34 (91.2%)", "91%", 91, "ok"),
    funnel("FEBRK-JEENA — 38 / 52 (73.1%)", "73%", 73),
    funnel("FEBRK-SUNIMPEX — 27 / 56 (48.2%)  ◀ worst", "48%", 48, "warn"),
))


# ------------------------------------------------------------------ write
for fname, html in PAGES.items():
    with open(os.path.join(OUT, fname), "w", encoding="utf-8") as f:
        f.write(html)
    print("wrote", fname)
print("done:", len(PAGES), "pages")
