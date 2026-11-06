/* Shared demo state/rules for agent app + customer portal (localStorage-backed). */
(function (global) {
  const KEY = 'fedex_clearance_demo_v1';
  const SENDABLE = new Set(['NFBRK', 'FEBRK-JEENA', 'FEBRK-SUNIMPEX']);
  const ALLOWLIST = new Set(['bipul.sikder@fedex.com']);
  const CHECKLIST = [
    { name: 'Commercial Invoice', required: true },
    { name: 'Packing List', required: true },
    { name: 'KYC Document', required: true },
    { name: 'IEC / GST (if applicable)', required: true },
  ];

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { return seed(); }
  }
  function save(state) { localStorage.setItem(KEY, JSON.stringify(state)); }
  function reset() { const s = seed(); save(s); return s; }

  function seed() {
    return { batches: [], shipments: [], events: [], messages: [], documents: [], seq: 1 };
  }

  function uid() { return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 8); }
  function now() { return new Date().toISOString(); }
  function fmt(ts) { try { return new Date(ts).toLocaleString(); } catch { return ts || '—'; } }

  // Email rule: from Standard Remarks; ConsigneeEmailID may be phone - never used as email.
  function extractEmail(standardRemarks) {
    const s = String(standardRemarks || '').trim();
    const m = s.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return m ? m[0] : '';
  }
  function validAwb(v) { return /^\d{11,12}$/.test(String(v || '').replace(/\s+/g, '')); }
  function normAwb(v) { return String(v || '').replace(/[^0-9]/g, ''); }

  function validateRow(r) {
    const awb = normAwb(r.AWB);
    const email = extractEmail(r.StandardRemarks);
    const end = String(r.EndResult || '').trim().toUpperCase();
    const broker = String(r.Broker || '').trim().toUpperCase();
    const company = String(r.Company || r.ConsigneeName || '').trim();
    const reasons = [];
    let verdict = 'ACCEPTED';
    let pfResult = 'PASS';

    if (!validAwb(awb)) { verdict = 'REJECTED'; reasons.push('AWB missing or not 11–12 digits.'); }
    if (!company) { verdict = 'REJECTED'; reasons.push('Consignee/company name missing.'); }
    if (!end) { verdict = 'REJECTED'; reasons.push('End Result missing.'); }

    const sendable = SENDABLE.has(end);
    if (verdict !== 'REJECTED') {
      if (!sendable) {
        pfResult = 'SKIPPED';
        if (end === 'HOLD') reasons.push('On hold. Do not pre-alert.');
        else if (end === 'CALLING') reasons.push('Marked Calling. Call must clear this first.');
        else if (end === 'FEBRK') reasons.push('Bare FEBRK. Name broker (JEENA/SUNIMPEX) before sending.');
        else reasons.push(`End Result ${end} is not on the sendable list.`);
      } else {
        if (!email) { pfResult = 'BLOCKED'; reasons.push('No valid email found in Standard Remarks.'); }
        if (end.startsWith('FEBRK') && !broker) { pfResult = 'BLOCKED'; reasons.push('Broker must be named for FEBRK.'); }
      }
    } else {
      pfResult = 'REJECTED';
    }

    return {
      awb, company, email, endResult: end, broker: broker || (end.startsWith('NFBRK') ? 'OWN' : ''),
      location: String(r.Location || '').trim().toUpperCase(), freight: r.Freight || '', currency: String(r.Currency || 'INR').toUpperCase(),
      clearanceType: end.startsWith('FEBRK') ? 'FEBRK' : end,
      consigneeName: String(r.ConsigneeName || company).trim(),
      verdict, pfResult, reasons: reasons.join(' ') || 'All checks passed.',
      standardRemarks: String(r.StandardRemarks || ''), rawEmailField: String(r.ConsigneeEmailID || '')
    };
  }

  const SAMPLE_ROWS = [
    { AWB: '781234567890', Company: 'Alpha Imports Pvt Ltd', ConsigneeName: 'Alpha Imports Pvt Ltd', StandardRemarks: 'bipul.sikder@fedex.com', ConsigneeEmailID: '9876543210', EndResult: 'NFBRK', Broker: 'OWN', Location: 'DELHI', Freight: '45000', Currency: 'INR' },
    { AWB: '781234567891', Company: 'Meridian Textiles', ConsigneeName: 'Meridian Textiles', StandardRemarks: 'clearance@meridiantextiles.example', ConsigneeEmailID: '9876500001', EndResult: 'FEBRK-JEENA', Broker: 'JEENA', Location: 'KOLKATA', Freight: '98000', Currency: 'INR' },
    { AWB: '781234567892', Company: 'Bharat Electronics', ConsigneeName: 'Bharat Electronics', StandardRemarks: 'docs@bharatelectronics.example', ConsigneeEmailID: '9876500002', EndResult: 'FEBRK-SUNIMPEX', Broker: 'SUNIMPEX', Location: 'DELHI', Freight: '22000', Currency: 'INR' },
    { AWB: '781234567893', Company: 'Arihant Metals', ConsigneeName: 'Arihant Metals', StandardRemarks: 'imports@arihantmetals.example', ConsigneeEmailID: '9876500003', EndResult: 'FEBRK', Broker: '', Location: 'DELHI', Freight: '61000', Currency: 'INR' },
    { AWB: '781234567894', Company: 'Zenith Exports', ConsigneeName: 'Zenith Exports', StandardRemarks: '', ConsigneeEmailID: '9876500004', EndResult: 'NFBRK', Broker: 'OWN', Location: 'DELHI', Freight: '31000', Currency: 'INR' },
    { AWB: '781234567896', Company: 'Orbit Freight Solutions', ConsigneeName: 'Orbit Freight Solutions', StandardRemarks: 'ops@orbitfreight.example', ConsigneeEmailID: '9876500005', EndResult: 'HOLD', Broker: '', Location: 'MUMBAI', Freight: '12000', Currency: 'INR' },
    { AWB: '781234567897', Company: 'Northstar Components', ConsigneeName: 'Northstar Components', StandardRemarks: 'team@northstar.example', ConsigneeEmailID: '9876500006', EndResult: 'CALLING', Broker: '', Location: 'BENGALURU', Freight: '18000', Currency: 'INR' },
  ];

  function createBatch(fileName, rows) {
    const state = load();
    const n = String(state.seq++).padStart(3, '0');
    const date = new Date().toISOString().slice(0,10).replace(/-/g,'');
    const kind = /CONSOL/i.test(fileName) ? 'CONSOL' : 'UBOND';
    const batchId = `BATCH-${date}-${n}`;
    const batch = { id: batchId, name: `${batchId}-${kind}`, fileName, kind, createdAt: now(), status: 'IMPORTED' };
    const shipments = (rows || SAMPLE_ROWS).map(r => {
      const v = validateRow(r);
      return {
        id: uid(), batchId, awb: v.awb, company: v.company, consigneeName: v.consigneeName,
        contactEmail: v.email, emailSource: v.email ? 'Standard Remarks' : 'None',
        endResult: v.endResult, broker: v.broker, location: v.location, freight: v.freight, currency: v.currency,
        clearanceType: v.clearanceType, verdict: v.verdict, pfResult: v.pfResult, pfReason: v.reasons,
        sendState: 'NOT_SENT', linkToken: null, createdAt: now(), standardRemarks: v.standardRemarks, rawEmailField: v.rawEmailField
      };
    }).filter(s => s.awb);
    state.batches.unshift(batch);
    state.shipments.push(...shipments);
    save(state);
    return { batch, shipments };
  }

  function getBatch(batchId) {
    const state = load();
    return state.batches.find(b => b.id === batchId);
  }
  function getShipments(batchId) { return load().shipments.filter(s => s.batchId === batchId); }
  function getShipmentByAwb(awb) { return load().shipments.find(s => s.awb === awb); }
  function getShipmentByToken(token) { return load().shipments.find(s => s.linkToken === token); }

  function addEvent(awb, type, actor, detail) {
    const state = load();
    state.events.push({ id: uid(), awb, type, actor: actor || 'SYSTEM', detail: detail || '', at: now() });
    save(state);
  }
  function getEvents(awb) { return load().events.filter(e => e.awb === awb).sort((a,b)=>a.at<b.at?1:-1); }
  function getMessages(awb) { return load().messages.filter(m => m.awb === awb).sort((a,b)=>a.at<b.at?1:-1); }
  function getDocuments(awb) { return load().documents.filter(d => d.awb === awb).sort((a,b)=>a.at<b.at?1:-1); }

  function linkStatus(shipment) {
    const state = load();
    const hasDoc = state.documents.some(d => d.awb === shipment.awb);
    const hasOpen = state.events.some(e => e.awb === shipment.awb && e.type === 'LINK_OPENED');
    if (hasDoc) return { code: 'DOCS_RECEIVED', label: 'Docs Received', badge: 'b-success' };
    if (hasOpen) return { code: 'LINK_OPENED', label: 'Link Opened · Awaiting Docs', badge: 'b-warn' };
    if (shipment.sendState === 'SENT' && shipment.linkToken) return { code: 'SENT_NOT_OPENED', label: 'Sent · Not Opened', badge: 'b-info' };
    return { code: 'NOT_SENT', label: 'Not Sent', badge: 'b-neutral' };
  }

  function canSend(shipment) {
    if (shipment.pfResult !== 'PASS') return { ok: false, reason: shipment.pfReason };
    if (!ALLOWLIST.has(String(shipment.contactEmail || '').toLowerCase())) return { ok: false, reason: 'Recipient not in TEST MODE allow-list.' };
    return { ok: true };
  }

  function sendPreAlerts(batchId) {
    const state = load();
    const targets = state.shipments.filter(s => s.batchId === batchId);
    let sent = 0, blocked = 0, skipped = 0;
    targets.forEach(s => {
      const gate = canSend(s);
      if (s.sendState === 'SENT') { skipped++; return; }
      if (s.pfResult !== 'PASS') { blocked++; return; }
      if (!gate.ok) { blocked++; return; }
      if (!s.linkToken) s.linkToken = uid();
      s.sendState = 'SENT';
      s.sentAt = now();
      state.messages.push({
        id: uid(), awb: s.awb, batchId, direction: 'OUTBOUND', channel: 'EMAIL',
        to: s.contactEmail, subject: `Pre Alert — ${s.awb} / ${s.company}`,
        template: 'CD_PREALERT_V1', status: 'SENT', at: now(), linkToken: s.linkToken
      });
      addEventToState(state, s.awb, 'PREALERT_SENT', 'AGENT', `Sent to ${s.contactEmail} (TEST MODE allow-list)`);
      sent++;
    });
    save(state);
    return { sent, blocked, skipped };
  }
  function addEventToState(state, awb, type, actor, detail) {
    state.events.push({ id: uid(), awb, type, actor, detail: detail || '', at: now() });
  }

  function markLinkOpened(token) {
    const state = load();
    const s = state.shipments.find(x => x.linkToken === token);
    if (!s) return null;
    if (!state.events.some(e => e.awb === s.awb && e.type === 'LINK_OPENED')) {
      addEventToState(state, s.awb, 'LINK_OPENED', 'CUSTOMER', 'Customer opened tokenized package link.');
      save(state);
    }
    return s;
  }

  function uploadDocument(token, file) {
    const state = load();
    const s = state.shipments.find(x => x.linkToken === token);
    if (!s) return null;
    const doc = { id: uid(), awb: s.awb, batchId: s.batchId, fileName: file.name, contentType: file.type || 'application/octet-stream', source: 'PORTAL', received: true, uploadedAt: now() };
    state.documents.push(doc);
    addEventToState(state, s.awb, 'DOC_RECEIVED', 'CUSTOMER', `Uploaded ${file.name}`);
    save(state);
    return doc;
  }

  function customerPackage(token) {
    const s = getShipmentByToken(token);
    if (!s) return null;
    markLinkOpened(token);
    const docs = getDocuments(s.awb);
    const keywords = { 'Commercial Invoice': ['invoice'], 'Packing List': ['packing','pack'], 'KYC Document': ['kyc','id','passport','pan','aadhar'], 'IEC / GST (if applicable)': ['iec','gst','tax'] };
    const checklist = CHECKLIST.map(item => {
      const keys = keywords[item.name] || [item.name.split(' ')[0].toLowerCase()];
      const has = docs.some(d => keys.some(k => d.fileName.toLowerCase().includes(k)));
      return { ...item, status: has ? 'UPLOADED' : 'REQUIRED' };
    });
    return { shipment: getShipmentByToken(token), checklist, documents: getDocuments(s.awb) };
  }

  function batchStats(batchId) {
    const ss = getShipments(batchId);
    const st = { total: ss.length, pass: 0, blocked: 0, skipped: 0, rejected: 0, sent: 0, notOpened: 0, opened: 0, docs: 0 };
    ss.forEach(s => {
      if (s.pfResult === 'PASS') st.pass++;
      else if (s.pfResult === 'BLOCKED') st.blocked++;
      else if (s.pfResult === 'SKIPPED') st.skipped++;
      else if (s.pfResult === 'REJECTED') st.rejected++;
      if (s.sendState === 'SENT') st.sent++;
      const ls = linkStatus(s).code;
      if (ls === 'SENT_NOT_OPENED') st.notOpened++;
      if (ls === 'LINK_OPENED') st.opened++;
      if (ls === 'DOCS_RECEIVED') st.docs++;
    });
    return st;
  }

  global.CD = {
    KEY, SENDABLE, ALLOWLIST, CHECKLIST, SAMPLE_ROWS,
    load, save, reset, uid, now, fmt, extractEmail, validateRow, createBatch,
    getBatch, getShipments, getShipmentByAwb, getShipmentByToken,
    getEvents, getMessages, getDocuments, linkStatus, canSend, sendPreAlerts,
    markLinkOpened, uploadDocument, customerPackage, batchStats
  };
})(window);
