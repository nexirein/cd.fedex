(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast = (msg) => {
    const host = $('#toastHost');
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg; host.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  };

  function route() {
    const h = location.hash.replace(/^#/, '') || '/dashboard';
    const [path, qs] = h.split('?');
    const params = new URLSearchParams(qs || '');
    return { path, params };
  }
  function go(path) { location.hash = path; }

  function setNav(active) {
    $$('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.route === active));
  }
  function setPage(title, crumbs = '') {
    $('#pageTitle').textContent = title;
    $('#breadcrumbs').innerHTML = crumbs;
  }

  function pfBadge(r) {
    const m = { PASS: ['b-success','PASS'], BLOCKED: ['b-danger','BLOCKED'], SKIPPED: ['b-neutral','SKIPPED'], REJECTED: ['b-danger','REJECTED'] };
    const [c,l] = m[r] || ['b-neutral', r || '—']; return `<span class="badge ${c}">${l}</span>`;
  }
  function lsBadge(s) { const ls = CD.linkStatus(s); return `<span class="badge ${ls.badge}">${esc(ls.label)}</span>`; }

  function render() {
    const { path, params } = route();
    if (path === '/dashboard') return renderDashboard();
    if (path === '/batches') return renderBatches();
    if (path === '/import') return renderImport();
    if (path === '/batch') return renderBatch(params.get('id'));
    go('/dashboard');
  }

  function renderDashboard() {
    setNav('dashboard'); setPage('Dashboard');
    const state = CD.load();
    const ss = state.shipments;
    const sent = ss.filter(s => s.sendState === 'SENT').length;
    const awaiting = ss.filter(s => ['SENT_NOT_OPENED','LINK_OPENED'].includes(CD.linkStatus(s).code)).length;
    const docs = ss.filter(s => CD.linkStatus(s).code === 'DOCS_RECEIVED').length;
    const recent = state.batches.slice(0, 6);
    $('#main').innerHTML = `
      <div class="grid grid-4" style="margin-bottom:16px">
        <div class="card stat"><div class="stat-label">Batches</div><div class="stat-value accent">${state.batches.length}</div><div class="stat-meta">Imported workbooks</div></div>
        <div class="card stat"><div class="stat-label">Shipments</div><div class="stat-value">${ss.length}</div><div class="stat-meta">Across all batches</div></div>
        <div class="card stat"><div class="stat-label">Pre-alerts Sent</div><div class="stat-value good">${sent}</div><div class="stat-meta">TEST MODE allow-list applied</div></div>
        <div class="card stat"><div class="stat-label">Awaiting Docs</div><div class="stat-value warn">${awaiting}</div><div class="stat-meta">${docs} with docs received</div></div>
      </div>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-header"><div><h3 class="card-title">Recent Batches</h3><p class="card-sub">Open a batch to review, send, and track</p></div><a class="btn btn-secondary btn-sm" href="#/batches">View all</a></div>
          ${recent.length ? `<div class="table-wrap"><table><thead><tr><th>Batch</th><th>Type</th><th>Rows</th><th>Sent</th><th>Created</th></tr></thead><tbody>
            ${recent.map(b => { const st = CD.batchStats(b.id); return `<tr class="clickable" data-batch="${b.id}"><td class="strong">${esc(b.name)}</td><td><span class="badge b-purple">${esc(b.kind)}</span></td><td>${st.total}</td><td>${st.sent}/${st.pass}</td><td class="muted small">${esc(CD.fmt(b.createdAt))}</td></tr>`; }).join('')}
          </tbody></table></div>` : `<div class="empty"><h3>No batches yet</h3><p>Import a UBOND or CONSOL workbook to get started.</p><a class="btn btn-primary" href="#/import">Import Batch</a></div>`}
        </div>
        <div class="card">
          <div class="card-header"><div><h3 class="card-title">Action Queue</h3><p class="card-sub">Shipments needing attention</p></div></div>
          ${awaiting ? `<div class="table-wrap"><table><thead><tr><th>AWB</th><th>Company</th><th>Status</th></tr></thead><tbody>
            ${ss.filter(s => ['SENT_NOT_OPENED','LINK_OPENED'].includes(CD.linkStatus(s).code)).slice(0,8).map(s => `<tr class="clickable" data-batch="${s.batchId}" data-awb="${s.awb}"><td class="mono">${esc(s.awb)}</td><td>${esc(s.company)}</td><td>${lsBadge(s)}</td></tr>`).join('')}
          </tbody></table></div>` : `<div class="empty"><h3>Nothing pending</h3><p>Shipments awaiting customer action will appear here.</p></div>`}
        </div>
      </div>`;
    bindBatchLinks();
  }

  function renderBatches() {
    setNav('batches'); setPage('Batches');
    const batches = CD.load().batches;
    $('#main').innerHTML = `
      <div class="card">
        <div class="card-header"><div><h3 class="card-title">All Batches</h3><p class="card-sub">UBOND/CONSOL imports with pre-flight and send status</p></div><a class="btn btn-primary btn-sm" href="#/import">+ Import Batch</a></div>
        ${batches.length ? `<div class="table-wrap"><table><thead><tr><th>Batch</th><th>File</th><th>Rows</th><th>PASS</th><th>Blocked</th><th>Skipped</th><th>Sent</th><th>Docs Received</th><th>Created</th></tr></thead><tbody>
          ${batches.map(b => { const st = CD.batchStats(b.id); return `<tr class="clickable" data-batch="${b.id}">
            <td class="strong">${esc(b.name)}</td><td class="muted small">${esc(b.fileName)}</td><td>${st.total}</td>
            <td><span class="badge b-success">${st.pass}</span></td><td>${st.blocked?`<span class="badge b-danger">${st.blocked}</span>`:'<span class="muted">0</span>'}</td>
            <td>${st.skipped?`<span class="badge b-neutral">${st.skipped}</span>`:'<span class="muted">0</span>'}</td>
            <td>${st.sent}</td><td>${st.docs?`<span class="badge b-success">${st.docs}</span>`:'<span class="muted">0</span>'}</td>
            <td class="muted small">${esc(CD.fmt(b.createdAt))}</td></tr>`; }).join('')}
        </tbody></table></div>` : `<div class="empty"><h3>No batches imported</h3><p>Start by importing a UBOND or CONSOL Excel file.</p><a class="btn btn-primary" href="#/import">Import Batch</a></div>`}
      </div>`;
    bindBatchLinks();
  }

  let importFile = null;
  function renderImport() {
    setNav('import'); setPage('Import Batch', `<a href="#/batches">Batches</a> / Import`);
    importFile = null;
    $('#main').innerHTML = `
      <div class="grid grid-2">
        <div class="card card-pad">
          <h3 class="card-title" style="margin-bottom:6px">Upload UBOND / CONSOL Workbook</h3>
          <p class="card-sub" style="margin-bottom:16px">Select the Excel file. The system validates rows, applies clearance rules, and creates a batch with per-shipment pre-flight results.</p>
          <div class="dropzone" id="dropzone">
            <h3>Drop .xlsx file here</h3>
            <p>or browse to select a UBOND/CONSOL export</p>
            <button class="btn btn-primary" id="browseBtn">Browse Files</button>
            <input type="file" id="fileInput" accept=".xlsx,.xls" hidden />
            <div id="filePill" style="display:none"></div>
          </div>
          <div class="row" style="margin-top:16px">
            <button class="btn btn-accent" id="importBtn" disabled>Validate & Create Batch</button>
            <a class="btn btn-secondary" href="#/batches">Cancel</a>
          </div>
        </div>
        <div class="card card-pad">
          <h3 class="card-title" style="margin-bottom:12px">Validation Rules</h3>
          <div class="rules">
            <div class="rule"><span class="n">1</span><div>Consignee email is taken from <strong>Standard Remarks</strong>. <span class="mono">ConsigneeEmailID</span> may contain a phone number and is never used as an email.</div></div>
            <div class="rule"><span class="n">2</span><div><strong>AWB</strong> must be 11–12 digits. Missing or malformed AWBs are rejected.</div></div>
            <div class="rule"><span class="n">3</span><div><strong>HOLD</strong>, <strong>CALLING</strong>, and bare <strong>FEBRK</strong> are non-sendable and recorded as SKIPPED with a reason.</div></div>
            <div class="rule"><span class="n">4</span><div><strong>FEBRK</strong> shipments require a named broker (JEENA/SUNIMPEX). The system never guesses.</div></div>
            <div class="rule"><span class="n">5</span><div>Sendable set (default): <span class="mono">NFBRK, FEBRK-JEENA, FEBRK-SUNIMPEX</span>. One bad row never blocks the rest of the batch.</div></div>
          </div>
          <div class="banner info" style="margin-top:16px"><strong>Demo behavior:</strong> selecting any .xlsx creates a validated sample batch so you can exercise the full flow (import → pre-flight → send → customer link → upload → trace).</div>
        </div>
      </div>`;
    const fi = $('#fileInput'), browse = $('#browseBtn'), pill = $('#filePill'), btn = $('#importBtn'), dz = $('#dropzone');
    browse.onclick = () => fi.click();
    dz.ondragover = e => { e.preventDefault(); dz.style.background = '#f3ecfb'; };
    dz.ondragleave = () => dz.style.background = '';
    dz.ondrop = e => { e.preventDefault(); dz.style.background = ''; handleFile(e.dataTransfer.files?.[0]); };
    fi.onchange = () => handleFile(fi.files?.[0]);
    function handleFile(f) {
      if (!f) return; importFile = f;
      pill.style.display = 'inline-flex'; pill.className = 'file-pill'; pill.textContent = `${f.name} (${Math.max(1, Math.round(f.size/1024))} KB)`;
      btn.disabled = false;
    }
    btn.onclick = () => {
      if (!importFile) return;
      btn.disabled = true; btn.textContent = 'Validating…';
      setTimeout(() => {
        const { batch } = CD.createBatch(importFile.name, CD.SAMPLE_ROWS);
        toast(`Batch ${batch.name} created.`);
        go(`/batch?id=${encodeURIComponent(batch.id)}`);
      }, 450);
    };
  }

  let boardFilter = 'ALL', boardSearch = '';
  function renderBatch(batchId) {
    const batch = CD.getBatch(batchId);
    if (!batch) { setNav('batches'); setPage('Batch not found'); $('#main').innerHTML = `<div class="card"><div class="empty"><h3>Batch not found</h3><p>The selected batch does not exist.</p><a class="btn btn-primary" href="#/batches">Back to Batches</a></div></div>`; return; }
    setNav('batches'); setPage(batch.name, `<a href="#/batches">Batches</a> / ${esc(batch.name)}`);
    const st = CD.batchStats(batchId);
    let rows = CD.getShipments(batchId);
    if (boardSearch) { const q = boardSearch.toLowerCase(); rows = rows.filter(s => s.awb.includes(q) || s.company.toLowerCase().includes(q) || (s.contactEmail||'').toLowerCase().includes(q)); }
    if (boardFilter !== 'ALL') rows = rows.filter(s => CD.linkStatus(s).code === boardFilter);
    $('#main').innerHTML = `
      <div class="banner warn" style="margin-bottom:14px"><strong>TEST MODE:</strong> outbound pre-alerts are sent only to allow-listed recipients (${Array.from(CD.ALLOWLIST).join(', ')}). Link generation and status tracking work for eligible rows.</div>
      <div class="grid grid-4" style="margin-bottom:16px">
        <div class="card stat"><div class="stat-label">Rows</div><div class="stat-value">${st.total}</div><div class="stat-meta">${esc(batch.fileName)}</div></div>
        <div class="card stat"><div class="stat-label">Pre-flight PASS</div><div class="stat-value good">${st.pass}</div><div class="stat-meta">${st.blocked} blocked · ${st.skipped} skipped</div></div>
        <div class="card stat"><div class="stat-label">Sent</div><div class="stat-value accent">${st.sent}</div><div class="stat-meta">${st.notOpened} sent, not opened</div></div>
        <div class="card stat"><div class="stat-label">Customer Response</div><div class="stat-value warn">${st.opened + st.docs}</div><div class="stat-meta">${st.opened} opened · ${st.docs} docs received</div></div>
      </div>
      <div class="card">
        <div class="card-header">
          <div><h3 class="card-title">Batch Board</h3><p class="card-sub">Review pre-flight, send pre-alerts, and track customer link status</p></div>
          <div class="row">
            <button class="btn btn-secondary btn-sm" id="refreshBtn">Refresh</button>
            <button class="btn btn-accent btn-sm" id="sendBtn">Send Pre-Alerts</button>
          </div>
        </div>
        <div class="card-pad" style="padding-bottom:10px">
          <div class="toolbar">
            <div class="filters">
              ${[['ALL','All'],['NOT_SENT','Not Sent'],['SENT_NOT_OPENED','Sent · Not Opened'],['LINK_OPENED','Link Opened'],['DOCS_RECEIVED','Docs Received']].map(([k,l])=>`<button class="chip ${boardFilter===k?'active':''}" data-filter="${k}">${l}</button>`).join('')}
            </div>
            <input class="search" id="boardSearch" placeholder="Search AWB, company, email…" value="${esc(boardSearch)}" />
          </div>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>AWB</th><th>Company</th><th>Recipient (Standard Remarks)</th><th>Type</th><th>Broker</th><th>Pre-flight</th><th>Send</th><th>Link Status</th></tr></thead>
          <tbody>
            ${rows.length ? rows.map(s => `<tr class="clickable" data-awb="${esc(s.awb)}">
              <td class="mono strong">${esc(s.awb)}</td>
              <td>${esc(s.company)}</td>
              <td class="small">${s.contactEmail ? esc(s.contactEmail) : '<span class="badge b-danger">Missing</span>'}</td>
              <td>${esc(s.endResult)}</td>
              <td>${esc(s.broker || '—')}</td>
              <td>${pfBadge(s.pfResult)}</td>
              <td>${s.sendState==='SENT' ? '<span class="badge b-success">SENT</span>' : '<span class="badge b-neutral">NOT SENT</span>'}</td>
              <td>${lsBadge(s)}</td>
            </tr>`).join('') : `<tr><td colspan="8"><div class="empty" style="padding:24px"><h3>No shipments match</h3><p>Adjust filters or search.</p></div></td></tr>`}
          </tbody>
        </table></div>
      </div>`;
    $$('.chip[data-filter]').forEach(b => b.onclick = () => { boardFilter = b.dataset.filter; render(); });
    $('#boardSearch').oninput = e => { boardSearch = e.target.value; renderBatch(batchId); const inp = $('#boardSearch'); if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); } };
    $('#refreshBtn').onclick = () => { render(); toast('Board refreshed.'); };
    $('#sendBtn').onclick = () => {
      const res = CD.sendPreAlerts(batchId);
      toast(`Pre-alerts: ${res.sent} sent, ${res.blocked} blocked by rules/allow-list, ${res.skipped} already sent.`);
      render();
    };
    $$('tr[data-awb]').forEach(tr => tr.onclick = () => openDrawer(tr.dataset.awb));
  }

  function openDrawer(awb) {
    const s = CD.getShipmentByAwb(awb); if (!s) return;
    $('#drawerEyebrow').textContent = `Batch ${s.batchId}`;
    $('#drawerTitle').textContent = `AWB ${s.awb}`;
    const ls = CD.linkStatus(s);
    const gate = CD.canSend(s);
    const events = CD.getEvents(awb);
    const docs = CD.getDocuments(awb);
    const msgs = CD.getMessages(awb);
    const custUrl = s.linkToken ? `customer.html?t=${encodeURIComponent(s.linkToken)}` : '';
    $('#drawerBody').innerHTML = `
      <div class="row">${pfBadge(s.pfResult)} ${lsBadge(s)} ${s.sendState==='SENT'?'<span class="badge b-success">SENT</span>':'<span class="badge b-neutral">NOT SENT</span>'}</div>
      <div class="${s.pfResult==='PASS'?'reason success':s.pfResult==='BLOCKED'?'reason danger':'reason'}"><strong>Pre-flight:</strong> ${esc(s.pfReason)}</div>
      <div class="section"><div class="section-head">Shipment Details</div><div class="section-body"><div class="kv-grid">
        <div class="kv"><div class="k">Company</div><div class="v">${esc(s.company)}</div></div>
        <div class="kv"><div class="k">Consignee</div><div class="v">${esc(s.consigneeName)}</div></div>
        <div class="kv"><div class="k">Recipient</div><div class="v">${esc(s.contactEmail||'—')}</div></div>
        <div class="kv"><div class="k">Email Source</div><div class="v">Standard Remarks</div></div>
        <div class="kv"><div class="k">End Result</div><div class="v">${esc(s.endResult)}</div></div>
        <div class="kv"><div class="k">Broker</div><div class="v">${esc(s.broker||'—')}</div></div>
        <div class="kv"><div class="k">Location</div><div class="v">${esc(s.location||'—')}</div></div>
        <div class="kv"><div class="k">Freight</div><div class="v">${esc(s.freight||'—')} ${esc(s.currency||'')}</div></div>
      </div></div></div>
      <div class="section"><div class="section-head">Customer Link</div><div class="section-body">
        ${custUrl ? `<div class="link-box">${esc(custUrl)}</div><div class="row" style="margin-top:10px"><a class="btn btn-primary btn-sm" href="${custUrl}" target="_blank" rel="noopener">Open Customer Portal</a><button class="btn btn-secondary btn-sm" id="copyLinkBtn">Copy Link</button></div>` : `<p class="small muted" style="margin:0">No link generated yet. ${gate.ok ? 'Send pre-alerts to generate a tokenized link for this shipment.' : esc(gate.reason)}</p>`}
      </div></div>
      <div class="section"><div class="section-head">Documents (${docs.length})</div><div class="section-body">
        ${docs.length ? docs.map(d => `<div class="doc-row"><div><div class="strong">${esc(d.fileName)}</div><div class="small muted">${esc(d.source)} · ${esc(CD.fmt(d.uploadedAt))}</div></div><span class="badge b-success">Received</span></div>`).join('') : `<p class="small muted" style="margin:0">No documents received yet.</p>`}
      </div></div>
      <div class="section"><div class="section-head">Messages (${msgs.length})</div><div class="section-body">
        ${msgs.length ? msgs.map(m => `<div class="doc-row"><div><div class="strong">${esc(m.subject)}</div><div class="small muted">To ${esc(m.to)} · ${esc(CD.fmt(m.at))}</div></div><span class="badge b-success">${esc(m.status)}</span></div>`).join('') : `<p class="small muted" style="margin:0">No outbound messages.</p>`}
      </div></div>
      <div class="section"><div class="section-head">Event Timeline</div><div class="section-body">
        ${events.length ? `<div class="timeline">${events.map(e => `<div class="tl"><div class="tl-dot"></div><div><div class="tl-title">${esc(e.type)}</div><div class="tl-sub">${esc(e.actor)} · ${esc(CD.fmt(e.at))}${e.detail?` · ${esc(e.detail)}`:''}</div></div></div>`).join('')}</div>` : `<p class="small muted" style="margin:0">No events yet.</p>`}
      </div></div>`;
    $('#drawer').classList.add('open'); $('#drawerBackdrop').classList.add('open');
    $('#drawer').setAttribute('aria-hidden','false');
    const copy = $('#copyLinkBtn');
    if (copy) copy.onclick = async () => { try { await navigator.clipboard.writeText(custUrl); toast('Customer link copied.'); } catch { toast('Copy not available in this browser.'); } };
  }
  function closeDrawer() { $('#drawer').classList.remove('open'); $('#drawerBackdrop').classList.remove('open'); $('#drawer').setAttribute('aria-hidden','true'); }
  $('#drawerClose').onclick = closeDrawer; $('#drawerBackdrop').onclick = closeDrawer;
  window.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

  function bindBatchLinks() {
    $$('[data-batch]').forEach(el => el.onclick = () => {
      const awb = el.dataset.awb;
      go(`/batch?id=${encodeURIComponent(el.dataset.batch)}`);
      if (awb) setTimeout(() => openDrawer(awb), 60);
    });
  }

  $('#newBatchBtn').onclick = () => go('/import');
  $('#resetDemoBtn').onclick = () => { if (confirm('Reset all demo data?')) { CD.reset(); boardFilter='ALL'; boardSearch=''; closeDrawer(); toast('Demo data reset.'); render(); } };

  window.addEventListener('hashchange', () => { closeDrawer(); render(); });
  render();
})();
