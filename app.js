/* =====================================================================
   GridWorks IT — Helpdesk & Asset Operations · Application logic
   =====================================================================
   Everything the app DOES lives here: the mock data, the business rules
   (escalation, SLA timers, asset healing), the rendering, and the charts.

   Mental model: we keep plain arrays in memory (`tickets`, `assets`) as
   the single source of truth. When something changes we mutate those
   arrays, then call renderAll() to repaint the screen from scratch.
   There is no backend and no browser storage, so a page refresh resets
   everything back to the mock data below — that's intentional for a demo.

   SECTIONS (search these to jump around):
     1. CONSTANTS & SLA POLICY     6. RENDERING
     2. MOCK DATA                  7. CHARTS (Chart.js)
     3. VIEW ROUTING & THEME       8. TOASTS & CLOCK
     4. BUSINESS LOGIC             9. EVENT BINDING & BOOT
     5. METRICS
   The whole file is wrapped in an IIFE (immediately-invoked function) so
   none of our variables leak into the global window scope.
   ===================================================================== */
(() => {
'use strict';

const now = Date.now();
const MIN = 60_000, HR = 3_600_000;

/* ---------- SLA policy (ms) ---------- */
const SLA = { Critical: 1 * HR, Medium: 8 * HR, Low: 24 * HR };

/* ---------- Escalation keywords ---------- */
const CRITICAL_KEYWORDS = [
  'server down', 'security breach', 'database error', 'ransomware',
  'data loss', 'outage', 'phishing', 'malware', 'breach'
];

/* ---------- Mock assets ---------- */
let assets = [
  { id:'AST-1001', type:'Laptop',   model:'ThinkPad X1 Carbon G11', serial:'LX1-88F2-K19A', assignedTo:'Dana Whitfield',  location:'HQ · Floor 3',   purchased:'2024-02-14', health:'Healthy'  },
  { id:'AST-1002', type:'Laptop',   model:'MacBook Pro 14" M3',     serial:'MBP-C02X-77Q1', assignedTo:'Marcus Reed',     location:'HQ · Floor 2',   purchased:'2024-06-03', health:'Degraded' },
  { id:'AST-1003', type:'Server',   model:'Dell PowerEdge R760',    serial:'PE-R760-0042',  assignedTo:'Infrastructure',  location:'Datacenter A',   purchased:'2023-09-21', health:'Degraded' },
  { id:'AST-1004', type:'Server',   model:'HPE ProLiant DL380',     serial:'HP-DL38-1177',  assignedTo:'Infrastructure',  location:'Datacenter A',   purchased:'2022-11-08', health:'Healthy'  },
  { id:'AST-1005', type:'Monitor',  model:'Dell UltraSharp U2723QE',serial:'DU-27Q-5501',   assignedTo:'Priya Natarajan', location:'HQ · Floor 3',   purchased:'2023-05-17', health:'Degraded' },
  { id:'AST-1006', type:'Keyboard', model:'Logitech MX Keys S',     serial:'LG-MXK-3390',   assignedTo:'Tom Okafor',      location:'Remote',         purchased:'2024-01-29', health:'Healthy'  },
  { id:'AST-1007', type:'Network',  model:'Cisco Catalyst 9300',    serial:'CS-C93-8812',   assignedTo:'Infrastructure',  location:'HQ · IDF-2',     purchased:'2023-03-02', health:'Degraded' },
  { id:'AST-1008', type:'Laptop',   model:'ThinkPad T14s G4',       serial:'LT14-45B7-P02', assignedTo:'Elena Petrova',   location:'HQ · Floor 1',   purchased:'2023-12-11', health:'Healthy'  },
  { id:'AST-1009', type:'Printer',  model:'HP LaserJet M479fdw',    serial:'HP-LJ4-6620',   assignedTo:'Finance (shared)',location:'HQ · Floor 2',   purchased:'2022-08-25', health:'Degraded' },
  { id:'AST-1010', type:'Server',   model:'Dell PowerEdge R660 (DB)',serial:'PE-R660-0007', assignedTo:'Infrastructure',  location:'Datacenter B',   purchased:'2024-04-19', health:'Healthy'  },
  { id:'AST-1011', type:'Monitor',  model:'LG 34WN80C Ultrawide',   serial:'LG-34W-2208',   assignedTo:'Marcus Reed',     location:'HQ · Floor 2',   purchased:'2024-06-03', health:'Healthy'  },
  { id:'AST-1012', type:'Laptop',   model:'MacBook Air 13" M2',     serial:'MBA-D11K-90Z4', assignedTo:'Sofia Lindqvist', location:'Remote',         purchased:'2023-10-30', health:'Healthy'  },
  { id:'AST-1013', type:'Network',  model:'Fortinet FortiGate 100F',serial:'FG-100F-4415',  assignedTo:'Infrastructure',  location:'HQ · MDF',       purchased:'2023-07-12', health:'Healthy'  },
  { id:'AST-1014', type:'Keyboard', model:'Keychron K8 Pro',        serial:'KC-K8P-1152',   assignedTo:'Priya Natarajan', location:'HQ · Floor 3',   purchased:'2024-08-06', health:'Healthy'  },
  { id:'AST-1015', type:'Laptop',   model:'Surface Laptop 5',       serial:'SF-L5-7743',    assignedTo:'Tom Okafor',      location:'Remote',         purchased:'2023-04-04', health:'Failed'   },
  { id:'AST-1016', type:'Printer',  model:'Brother HL-L8360CDW',    serial:'BR-HL8-9034',   assignedTo:'HR (shared)',     location:'HQ · Floor 1',   purchased:'2021-12-13', health:'Healthy'  },
];

/* ---------- Mock tickets ---------- */
let ticketSeq = 1090;
let tickets = [
  { id:'TKT-1081', title:'Database error on invoicing service',   requester:'Elena Petrova',  category:'Software', urgency:'Critical', status:'In Progress', createdAt:now-42*MIN,  assetId:'AST-1010', escalated:true  },
  { id:'TKT-1082', title:'Core switch dropping packets on IDF-2', requester:'Marcus Reed',    category:'Network',  urgency:'Critical', status:'New',         createdAt:now-25*MIN,  assetId:'AST-1007', escalated:false },
  { id:'TKT-1083', title:'MacBook battery drains in 2 hours',     requester:'Marcus Reed',    category:'Hardware', urgency:'Medium',   status:'In Progress', createdAt:now-3.2*HR,  assetId:'AST-1002', escalated:false },
  { id:'TKT-1084', title:'Monitor flickering when docked',        requester:'Priya Natarajan',category:'Hardware', urgency:'Low',      status:'New',         createdAt:now-5.5*HR,  assetId:'AST-1005', escalated:false },
  { id:'TKT-1085', title:'VPN drops every 15 minutes',            requester:'Sofia Lindqvist',category:'Network',  urgency:'Medium',   status:'New',         createdAt:now-1.7*HR,  assetId:null,       escalated:false },
  { id:'TKT-1086', title:'Finance printer jams on duplex',        requester:'Dana Whitfield', category:'Hardware', urgency:'Low',      status:'In Progress', createdAt:now-9*HR,    assetId:'AST-1009', escalated:false },
  { id:'TKT-1087', title:'Excel add-in crashes on open',          requester:'Tom Okafor',     category:'Software', urgency:'Low',      status:'New',         createdAt:now-11*HR,   assetId:null,       escalated:false },
  { id:'TKT-1088', title:'ERP node CPU pegged at 100%',           requester:'Infrastructure', category:'Hardware', urgency:'Medium',   status:'In Progress', createdAt:now-6.4*HR,  assetId:'AST-1003', escalated:false },
  { id:'TKT-1089', title:'Surface won\'t POST after update',      requester:'Tom Okafor',     category:'Hardware', urgency:'Medium',   status:'New',         createdAt:now-7.8*HR,  assetId:'AST-1015', escalated:false },
  /* resolved history — feeds MTTR + SLA compliance */
  { id:'TKT-1073', title:'Password reset for shared mailbox',     requester:'Dana Whitfield', category:'Software', urgency:'Low',      status:'Resolved', createdAt:now-30*HR, resolvedAt:now-26*HR,  assetId:null,       escalated:false },
  { id:'TKT-1074', title:'Wi-Fi dead zone in Floor 1 lounge',     requester:'Elena Petrova',  category:'Network',  urgency:'Medium',   status:'Resolved', createdAt:now-28*HR, resolvedAt:now-22.5*HR,assetId:'AST-1013', escalated:false },
  { id:'TKT-1075', title:'Server down — build farm unreachable',  requester:'Infrastructure', category:'Network',  urgency:'Critical', status:'Resolved', createdAt:now-26*HR, resolvedAt:now-25.3*HR,assetId:'AST-1004', escalated:true  },
  { id:'TKT-1076', title:'Keyboard keys sticking',                requester:'Tom Okafor',     category:'Hardware', urgency:'Low',      status:'Resolved', createdAt:now-50*HR, resolvedAt:now-31*HR,  assetId:'AST-1006', escalated:false },
  { id:'TKT-1077', title:'Slack notifications delayed org-wide',  requester:'Priya Natarajan',category:'Software', urgency:'Medium',   status:'Resolved', createdAt:now-45*HR, resolvedAt:now-33*HR,  assetId:null,       escalated:false },
  { id:'TKT-1078', title:'Laptop fan grinding noise',             requester:'Sofia Lindqvist',category:'Hardware', urgency:'Low',      status:'Resolved', createdAt:now-70*HR, resolvedAt:now-40*HR,  assetId:'AST-1012', escalated:false },
];

/* ---------- UI state ---------- */
let statusFilter = 'all';
let urgFilter = 'all';
let selectedUrgency = 'Medium';
let charts = {};

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* =====================================================================
   VIEW SWITCHING & THEME
   ===================================================================== */
const VIEW_TITLES = { employee:'Employee Portal', tech:'Technician Dashboard', assets:'Asset Management Ledger' };
function switchView(v){
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id === 'view-'+v));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  $('viewTitle').textContent = VIEW_TITLES[v];
}
function toggleTheme(){
  const root = document.documentElement;
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  $('iconMoon').style.display = next === 'dark' ? '' : 'none';
  $('iconSun').style.display  = next === 'dark' ? 'none' : '';
  restyleCharts();
}

/* =====================================================================
   BUSINESS LOGIC
   ===================================================================== */
/* Returns the first banned keyword found in the text, or null.
   This is what powers the automatic CRITICAL escalation. */
function detectCriticalKeywords(text){
  const t = text.toLowerCase();
  return CRITICAL_KEYWORDS.find(k => t.includes(k)) || null;
}

function pickUrgency(u){
  selectedUrgency = u;
  document.querySelectorAll('.urg').forEach(b => {
    b.className = 'urg' + (b.dataset.u === u ? ' sel-' + u.toLowerCase() : '');
  });
}

function liveKeywordCheck(){
  const hit = detectCriticalKeywords($('fTitle').value + ' ' + $('fDesc').value);
  const note = $('kwNote');
  if (hit){
    note.textContent = `⚠ "${hit}" detected — this ticket will be auto-escalated to CRITICAL per security policy.`;
    note.classList.add('on');
  } else {
    note.classList.remove('on');
  }
}

function submitTicket(){
  const name  = $('fName').value.trim() || 'Anonymous';
  const title = $('fTitle').value.trim();
  const desc  = $('fDesc').value.trim();
  if (!title){ toast('Missing summary', 'Add a short issue summary before submitting.', 'crit'); return; }

  const hit = detectCriticalKeywords(title + ' ' + desc);
  let urgency = selectedUrgency, escalated = false;
  if (hit && urgency !== 'Critical'){ urgency = 'Critical'; escalated = true; }
  else if (hit){ escalated = true; }

  const ticket = {
    id: 'TKT-' + (++ticketSeq), title, requester: name,
    category: $('fCategory').value, urgency, status: 'New',
    createdAt: Date.now(), assetId: guessAsset(name), escalated
  };
  tickets.unshift(ticket);

  if (escalated){
    triggerSecurityAlert(ticket, hit);
    toast('Ticket escalated to CRITICAL', `${ticket.id} matched security keyword "${hit}". 1-hour SLA started.`, 'crit');
  } else {
    toast('Ticket submitted', `${ticket.id} created with ${urgency} priority. SLA window: ${SLA[urgency]/HR} h.`, 'ok');
  }

  $('fTitle').value = ''; $('fDesc').value = ''; $('kwNote').classList.remove('on');
  renderAll();
}

/* naive correlation: link ticket to the requester's first degraded/failed asset, else any of theirs */
function guessAsset(name){
  const mine = assets.filter(a => a.assignedTo.toLowerCase() === name.toLowerCase());
  const bad = mine.find(a => a.health !== 'Healthy');
  return (bad || mine[0])?.id || null;
}

function setTicketStatus(id, status){
  const t = tickets.find(t => t.id === id);
  if (!t) return;
  t.status = status;
  if (status === 'Resolved'){
    t.resolvedAt = Date.now();
    /* Hardware-ticket correlation: when a ticket tied to a piece of
       hardware is resolved, that asset's health recovers to Healthy. */
    if (t.assetId){
      const a = assets.find(a => a.id === t.assetId);
      if (a && a.health !== 'Healthy'){
        a.health = 'Healthy';
        a.justHealed = true;
        toast('Asset recovered', `${a.id} · ${a.model} health improved to Healthy.`, 'ok');
      }
    }
    const mins = Math.round((t.resolvedAt - t.createdAt)/MIN);
    toast('Ticket resolved', `${t.id} closed in ${fmtDur(t.resolvedAt - t.createdAt)}${(t.resolvedAt-t.createdAt)<=SLA[t.urgency] ? ' — within SLA ✓' : ' — SLA breached'}.`, (t.resolvedAt-t.createdAt)<=SLA[t.urgency] ? 'ok':'crit');
  }
  renderAll();
}

function triggerSecurityAlert(ticket, keyword){
  const el = $('secAlert');
  $('secAlertMsg').textContent = `SECURITY ESCALATION — ${ticket.id} "${ticket.title}" auto-flagged CRITICAL (keyword: "${keyword}"). Response SLA: 60 minutes.`;
  el.classList.remove('on'); void el.offsetWidth; /* restart animation */
  el.classList.add('on');
}
function dismissAlert(){ $('secAlert').classList.remove('on'); }

/* =====================================================================
   METRICS
   ===================================================================== */
function computeMetrics(){
  const open = tickets.filter(t => t.status !== 'Resolved');
  const resolved = tickets.filter(t => t.status === 'Resolved');
  const critOpen = open.filter(t => t.urgency === 'Critical');

  const mttr = resolved.length
    ? resolved.reduce((s,t) => s + (t.resolvedAt - t.createdAt), 0) / resolved.length
    : 0;

  /* SLA compliance = share of tickets still inside their SLA window.
     For a resolved ticket we measure how long it actually took; for an
     open one we measure how long it's been open so far. If that elapsed
     time is within the allowed budget for its urgency, it counts. */
  const nowMs = Date.now();
  let compliant = 0;
  tickets.forEach(t => {
    const elapsed = (t.resolvedAt ?? nowMs) - t.createdAt;
    if (elapsed <= SLA[t.urgency]) compliant++;
  });
  const slaRate = tickets.length ? (compliant / tickets.length) * 100 : 100;

  return { open, resolved, critOpen, mttr, slaRate };
}

function fmtDur(ms){
  if (ms < 0) ms = 0;
  const h = Math.floor(ms / HR), m = Math.floor((ms % HR) / MIN);
  return h > 0 ? `${h}h ${String(m).padStart(2,'0')}m` : `${m}m`;
}
function fmtCountdown(ms){
  const neg = ms < 0; ms = Math.abs(ms);
  const h = Math.floor(ms/HR), m = Math.floor((ms%HR)/MIN), s = Math.floor((ms%MIN)/1000);
  return (neg?'-':'') + String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}

/* =====================================================================
   RENDERING
   ===================================================================== */
function renderStats(){
  const m = computeMetrics();
  $('stOpen').textContent = m.open.length;
  $('stOpenSub').textContent = `${m.open.filter(t=>t.status==='New').length} new · ${m.open.filter(t=>t.status==='In Progress').length} in progress`;
  $('stCrit').textContent = m.critOpen.length;
  $('stCritSub').textContent = m.critOpen.length ? 'Immediate response required' : 'Queue clear';
  $('stCritSub').className = 'stat-delta ' + (m.critOpen.length ? 'bad' : 'ok');

  $('stMttr').textContent = m.resolved.length ? fmtDur(m.mttr) : '—';
  $('mttrBar').style.width = Math.min(100, (m.mttr / (8*HR)) * 100) + '%';
  $('mttrBar').style.background = m.mttr <= 8*HR ? 'var(--accent)' : 'var(--warn)';

  $('stSla').textContent = m.slaRate.toFixed(1) + '%';
  $('slaBar').style.width = m.slaRate + '%';
  $('slaBar').style.background = m.slaRate >= 90 ? 'var(--ok)' : m.slaRate >= 75 ? 'var(--warn)' : 'var(--crit)';

  /* ticker + nav badges */
  $('tickOpen').textContent = m.open.length;
  $('tickCrit').textContent = m.critOpen.length;
  const deg = assets.filter(a => a.health !== 'Healthy').length;
  $('tickDeg').textContent = deg;
  $('navOpenCount').textContent = m.open.length;
  $('navOpenCount').className = 'nav-badge' + (m.critOpen.length ? ' hot' : '');
  $('navDegradedCount').textContent = deg;
}

function ticketMatchesFilters(t){
  const sOK = statusFilter === 'all' ? t.status !== 'Resolved' : t.status === statusFilter;
  const uOK = urgFilter === 'all' || t.urgency === urgFilter;
  return sOK && uOK;
}

function setStatusFilter(s){
  statusFilter = s;
  document.querySelectorAll('[data-status]').forEach(c => c.classList.toggle('active', c.dataset.status === s));
  renderTickets();
}
function setUrgFilter(u){
  urgFilter = u;
  document.querySelectorAll('[data-urg]').forEach(c => c.classList.toggle('active', c.dataset.urg === u));
  renderTickets();
}

function statusPill(s){
  const cls = s === 'New' ? 'new' : s === 'In Progress' ? 'progress' : 'resolved';
  return `<span class="pill ${cls}">${s}</span>`;
}

function renderTickets(){
  const list = $('ticketList');
  const rows = tickets.filter(ticketMatchesFilters)
    .sort((a,b) => ({Critical:0,Medium:1,Low:2}[a.urgency] - {Critical:0,Medium:1,Low:2}[b.urgency]) || a.createdAt - b.createdAt);

  if (!rows.length){
    list.innerHTML = `<div class="empty">No tickets match these filters. Adjust the chips above, or enjoy the quiet while it lasts.</div>`;
    return;
  }

  list.innerHTML = rows.map(t => {
    const asset = t.assetId ? assets.find(a => a.id === t.assetId) : null;
    const isOpen = t.status !== 'Resolved';
    const critical = t.urgency === 'Critical' && isOpen;
    return `
    <article class="ticket ${critical ? 'crit-glow' : ''}" data-tid="${t.id}">
      <div>
        <div class="t-head">
          <span class="t-id">${t.id}</span>
          <span class="t-title">${esc(t.title)}</span>
          <span class="pill ${t.urgency.toLowerCase()}">${t.urgency}</span>
          ${statusPill(t.status)}
          ${t.escalated ? '<span class="pill esc">Auto-escalated</span>' : ''}
        </div>
        <div class="t-meta">
          <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${esc(t.requester)}</span>
          <span>${t.category}</span>
          ${asset ? `<span class="mono">${asset.id} · ${esc(asset.model)}</span>` : '<span>No linked asset</span>'}
        </div>
      </div>
      <div class="t-actions">
        ${t.status === 'New' ? '<button class="btn" data-action="start">Start work</button>' : ''}
        ${isOpen ? '<button class="btn ok" data-action="resolve">Resolve</button>' : '<button class="btn" data-action="reopen">Reopen</button>'}
      </div>
      <div class="sla" data-sla="${t.id}"></div>
    </article>`;
  }).join('');
  updateSlaTimers();
}

function updateSlaTimers(){
  const nowMs = Date.now();
  document.querySelectorAll('[data-sla]').forEach(el => {
    const t = tickets.find(t => t.id === el.dataset.sla);
    if (!t) return;
    if (t.status === 'Resolved'){
      const within = (t.resolvedAt - t.createdAt) <= SLA[t.urgency];
      el.innerHTML = `<div class="sla-done">Resolved in <span class="mono">${fmtDur(t.resolvedAt - t.createdAt)}</span> ${within ? '· within SLA ✓' : '<span style="color:var(--crit)">· SLA breached</span>'}</div>`;
      return;
    }
    const budget = SLA[t.urgency];
    const remaining = t.createdAt + budget - nowMs;
    const pct = Math.max(0, Math.min(100, (remaining / budget) * 100));
    const breach = remaining <= 0;
    const warn = !breach && pct < 25;
    const color = breach ? 'var(--crit)' : warn ? 'var(--warn)' : pct < 55 ? 'var(--warn)' : 'var(--ok)';
    el.innerHTML = `
      <div class="sla-row">
        <span>SLA response window · ${budget/HR} h</span>
        <span class="sla-timer ${breach ? 'breach' : warn ? 'warn' : ''}">${breach ? 'BREACHED ' : ''}${fmtCountdown(remaining)}</span>
      </div>
      <div class="sla-track"><div class="sla-fill" style="width:${pct}%;background:${color}"></div></div>`;
  });
}

function renderRecent(){
  const el = $('recentTickets');
  const rows = tickets.slice().sort((a,b) => b.createdAt - a.createdAt).slice(0, 7);
  el.innerHTML = rows.map(t => `
    <div class="recent-item">
      <span class="t-id mono">${t.id}</span>
      <span class="grow">${esc(t.title)}</span>
      <span class="pill ${t.urgency.toLowerCase()}">${t.urgency}</span>
      ${statusPill(t.status)}
    </div>`).join('');
}

function renderAssets(){
  const q = $('assetSearch').value.trim().toLowerCase();
  const type = $('assetType').value;
  const health = $('assetHealth').value;
  const openByAsset = {};
  tickets.forEach(t => { if (t.assetId && t.status !== 'Resolved') openByAsset[t.assetId] = (openByAsset[t.assetId]||0)+1; });

  const rows = assets.filter(a => {
    if (type !== 'all' && a.type !== type) return false;
    if (health !== 'all' && a.health !== health) return false;
    if (q){
      const hay = `${a.id} ${a.type} ${a.model} ${a.serial} ${a.assignedTo} ${a.location}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  $('assetRows').innerHTML = rows.length ? rows.map(a => {
    const healed = a.justHealed; a.justHealed = false;
    return `
    <tr class="${healed ? 'just-healed' : ''}">
      <td><div class="asset-name">${esc(a.model)}<small>${a.id} · ${a.type}</small></div></td>
      <td class="mono">${a.serial}</td>
      <td>${esc(a.assignedTo)}</td>
      <td>${a.location}</td>
      <td class="mono">${a.purchased}</td>
      <td><span class="health ${a.health}"><span class="dot"></span>${a.health}</span></td>
      <td class="mono">${openByAsset[a.id] || '—'}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="7"><div class="empty" style="border:0">No assets match this search.</div></td></tr>`;
}

/* =====================================================================
   CHARTS
   ===================================================================== */
function chartColors(){
  const cs = getComputedStyle(document.documentElement);
  return {
    text: cs.getPropertyValue('--muted').trim(),
    grid: cs.getPropertyValue('--chart-grid').trim(),
    accent: cs.getPropertyValue('--accent').trim(),
    ok: cs.getPropertyValue('--ok').trim(),
    warn: cs.getPropertyValue('--warn').trim(),
    crit: cs.getPropertyValue('--crit').trim(),
  };
}

function catCounts(){
  const open = tickets.filter(t => t.status !== 'Resolved');
  return ['Hardware','Software','Network'].map(c => open.filter(t => t.category === c).length);
}
function urgStatusCounts(){
  const open = tickets.filter(t => t.status !== 'Resolved');
  const by = (u,s) => open.filter(t => t.urgency === u && t.status === s).length;
  return {
    neu: ['Low','Medium','Critical'].map(u => by(u,'New')),
    prog:['Low','Medium','Critical'].map(u => by(u,'In Progress')),
  };
}

function initCharts(){
  const c = chartColors();
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 11.5;

  charts.cat = new Chart($('catChart'), {
    type: 'doughnut',
    data: {
      labels: ['Hardware','Software','Network'],
      datasets: [{ data: catCounts(), backgroundColor: [c.accent, c.ok, c.warn], borderWidth: 0, hoverOffset: 6 }]
    },
    options: {
      maintainAspectRatio: false, cutout: '68%',
      plugins: { legend: { position: 'right', labels: { color: c.text, boxWidth: 10, boxHeight: 10, padding: 14 } } },
      animation: { duration: 500 }
    }
  });

  const us = urgStatusCounts();
  charts.urg = new Chart($('urgChart'), {
    type: 'bar',
    data: {
      labels: ['Low','Medium','Critical'],
      datasets: [
        { label:'New',         data: us.neu,  backgroundColor: c.accent, borderRadius: 5, maxBarThickness: 34 },
        { label:'In Progress', data: us.prog, backgroundColor: c.warn,   borderRadius: 5, maxBarThickness: 34 },
      ]
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        x: { stacked:true, grid:{ display:false }, ticks:{ color: c.text } },
        y: { stacked:true, grid:{ color: c.grid }, ticks:{ color: c.text, precision: 0 }, beginAtZero:true }
      },
      plugins: { legend: { labels: { color: c.text, boxWidth: 10, boxHeight: 10 } } },
      animation: { duration: 500 }
    }
  });
}

function updateCharts(){
  if (!charts.cat) return;
  charts.cat.data.datasets[0].data = catCounts();
  charts.cat.update();
  const us = urgStatusCounts();
  charts.urg.data.datasets[0].data = us.neu;
  charts.urg.data.datasets[1].data = us.prog;
  charts.urg.update();
}

function restyleCharts(){
  if (!charts.cat) return;
  const c = chartColors();
  charts.cat.data.datasets[0].backgroundColor = [c.accent, c.ok, c.warn];
  charts.cat.options.plugins.legend.labels.color = c.text;
  charts.urg.data.datasets[0].backgroundColor = c.accent;
  charts.urg.data.datasets[1].backgroundColor = c.warn;
  charts.urg.options.scales.x.ticks.color = c.text;
  charts.urg.options.scales.y.ticks.color = c.text;
  charts.urg.options.scales.y.grid.color = c.grid;
  charts.urg.options.plugins.legend.labels.color = c.text;
  charts.cat.update(); charts.urg.update();
}

/* =====================================================================
   TOASTS, CLOCK, BOOT
   ===================================================================== */
function toast(title, body, kind = ''){
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = `<b>${esc(title)}</b><p>${esc(body)}</p>`;
  $('toasts').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, 4600);
}

function renderAll(){
  renderStats();
  renderTickets();
  renderRecent();
  renderAssets();
  updateCharts();
}

/* =====================================================================
   9. EVENT BINDING & BOOT
   ---------------------------------------------------------------------
   In the old single-file version, buttons called functions directly via
   inline onclick="" attributes. Here we attach every listener in JS
   instead — cleaner, and it keeps the HTML free of behavior.
   ===================================================================== */

/* Map a button's data-action value to what it should do to a ticket. */
const TICKET_ACTIONS = {
  start:   id => setTicketStatus(id, 'In Progress'),
  resolve: id => setTicketStatus(id, 'Resolved'),
  reopen:  id => setTicketStatus(id, 'In Progress'),
};

function bindEvents(){
  /* --- sidebar navigation: each nav button knows its view via data-view --- */
  document.querySelectorAll('.nav-btn').forEach(btn =>
    btn.addEventListener('click', () => switchView(btn.dataset.view)));

  /* --- theme toggle + acknowledge-alert button --- */
  $('themeToggle').addEventListener('click', toggleTheme);
  $('btnAckAlert').addEventListener('click', dismissAlert);

  /* --- employee ticket form --- */
  $('btnSubmit').addEventListener('click', submitTicket);
  document.querySelectorAll('.urg').forEach(btn =>
    btn.addEventListener('click', () => pickUrgency(btn.dataset.u)));
  /* scan the text fields for critical keywords as the user types */
  ['fTitle', 'fDesc'].forEach(id => $(id).addEventListener('input', liveKeywordCheck));

  /* --- technician queue filter chips --- */
  document.querySelectorAll('[data-status]').forEach(chip =>
    chip.addEventListener('click', () => setStatusFilter(chip.dataset.status)));
  document.querySelectorAll('[data-urg]').forEach(chip =>
    chip.addEventListener('click', () => setUrgFilter(chip.dataset.urg)));

  /* --- ticket action buttons (Start / Resolve / Reopen) ---
     These buttons are re-created every time the queue re-renders, so we
     DON'T attach a listener to each one. Instead we attach ONE listener
     to the list container and figure out which button was clicked. This
     pattern is called "event delegation" and it never goes stale. */
  $('ticketList').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;                              // clicked empty space
    const id = btn.closest('.ticket')?.dataset.tid; // which ticket?
    if (id) TICKET_ACTIONS[btn.dataset.action]?.(id);
  });

  /* --- asset ledger search + dropdown filters --- */
  $('assetSearch').addEventListener('input', renderAssets);
  $('assetType').addEventListener('change', renderAssets);
  $('assetHealth').addEventListener('change', renderAssets);
}

/* Tick once per second: refresh every SLA countdown and the topbar clock. */
setInterval(() => {
  updateSlaTimers();
  $('clock').textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
}, 1000);

/* ---- Boot sequence: wire events, set defaults, draw charts, paint UI ---- */
bindEvents();
pickUrgency('Medium');   // sensible default urgency on the form
initCharts();            // build the two Chart.js instances once
renderAll();             // first paint from the mock data

})();  // end IIFE — nothing above leaked into global scope
