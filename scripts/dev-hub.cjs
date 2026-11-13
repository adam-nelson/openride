'use strict';

const http = require('node:http');
const { randomBytes } = require('node:crypto');
const { Script } = require('node:vm');

if (process.env.NODE_ENV === 'production') {
  throw new Error('Developer hub is disabled in production.');
}

const styles = String.raw`
:root{color-scheme:dark;font:16px/1.5 system-ui,sans-serif}
*{box-sizing:border-box}
body{margin:0;background:#101827;color:#f8fafc}
main{max-width:900px;margin:24px auto;padding:20px}
h1,h2{line-height:1.25}
h1{font-size:1.8rem}
h2{font-size:1.25rem}
a{color:#a7f3d0}
button,input,select,textarea{font:inherit}
button,select,textarea{border:1px solid #64748b;border-radius:8px}
button{padding:10px 14px;background:#243247;color:white;cursor:pointer}
button.primary,button[aria-pressed="true"]{background:#166534}
button.danger{background:#881337}
button:disabled{opacity:.45;cursor:not-allowed}
button:focus-visible,a:focus-visible,input:focus-visible,
select:focus-visible,textarea:focus-visible{outline:3px solid #facc15;outline-offset:3px}
input[type="checkbox"]{width:20px;height:20px;vertical-align:middle}
select,textarea{padding:10px;background:#101827;color:white;width:100%}
textarea{min-height:110px;resize:vertical}
label{display:block;margin:12px 0}
nav,.row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
nav{margin:20px 0}
.card,.launch{background:#1d293b;border:1px solid #475569;border-radius:12px;padding:18px;margin:16px 0}
.launch{display:block;text-decoration:none;color:white}
.notice{border-left:4px solid #facc15;padding:12px;background:#243247}
.muted,small{color:#cbd5e1}
.badge{display:inline-block;background:#334155;border-radius:20px;padding:4px 12px}
dl{margin:0}
dl>div{display:flex;justify-content:space-between;gap:20px;padding:8px 0;border-bottom:1px solid #334155}
dt{color:#cbd5e1}
dd{margin:0;text-align:right;font-weight:600}
progress{width:100%;height:20px;accent-color:#22c55e}
.document{border-bottom:1px solid #475569;padding:12px 0}
.document p{margin:5px 0}
#message{min-height:1.5em;color:#a7f3d0}
.report-text{white-space:pre-wrap;overflow-wrap:anywhere}
[hidden]{display:none!important}
@media(max-width:480px){
  main{padding:14px;margin:8px auto}
  dl>div{gap:10px}
  button{min-height:44px}
}
`;

const hubBody = String.raw`
<h1>ZOLU Developer Hub</h1>
<p class="notice">Development only. Keep all forwarded ports private.</p>

<a class="launch" href="/simulator">
  <strong>Mock driver simulator</strong><br>
  <small>Simulated scenarios, documents, offers, trips, and reports. No real login bypass.</small>
</a>

<a class="launch" data-port="8081" target="_blank" rel="noopener noreferrer">Driver — 8081</a>
<a class="launch" data-port="8082" target="_blank" rel="noopener noreferrer">Rider — 8082</a>
<a class="launch" data-port="8083" target="_blank" rel="noopener noreferrer">Admin — 8083</a>

<p class="muted">
  Apps must be started separately. The simulator does not sign you into them,
  approve their documents, or create real trips.
</p>
`;

const hubScript = String.raw`
document.querySelectorAll('[data-port]').forEach(function (link) {
  const url = new URL(location.origin);
  if (url.hostname.includes('-8084.')) {
    url.hostname = url.hostname.replace('-8084.', '-' + link.dataset.port + '.');
    url.port = '';
  } else {
    url.port = link.dataset.port;
  }
  link.href = url.href;
});
`;

const simulatorBody = String.raw`
<a href="/">← Developer hub</a>
<h1>Mock driver simulator</h1>

<p class="notice">
  SIMULATION ONLY. Actions stay in this page's memory and clear when you refresh
  or close it. No real documents, trips, reports, payments, or approvals are created.
</p>

<nav aria-label="Simulator screens">
  <button type="button" data-view="home">Home</button>
  <button type="button" data-view="documents">Mock documents</button>
  <button type="button" data-view="reports">Mock reports</button>
  <button type="button" id="reset" class="danger">Reset all mock data</button>
</nav>

<p id="message" role="status" aria-live="polite"></p>

<section id="view-home">
  <div class="card">
    <h2>Simulated driver</h2>
    <p><span class="badge" id="online-status"></span></p>
    <p id="compliance-status"></p>

    <label for="vehicle">Mock vehicle</label>
    <select id="vehicle">
      <option value="dev-preview-vehicle">DEV-001 · ZOLU Preview · sedan (mock)</option>
      <option value="">No vehicle selected</option>
    </select>

    <div class="row">
      <button type="button" id="toggle-online" class="primary"></button>
      <button type="button" id="simulate-offer">Simulate ₦4,500 offer</button>
    </div>
    <p class="muted">
      Going online here changes only this simulator. Resolve mock verification
      requirements in Mock documents first.
    </p>
  </div>

  <section id="offer-panel" class="card" hidden>
    <h2>Mock ride offer — ₦4,500</h2>
    <p>Victoria Island, Lagos → Lekki Phase 1, Lagos</p>
    <p>Pickup ETA: 12 minutes · Distance to pickup: 8.5 km</p>
    <p id="offer-countdown"></p>
    <div class="row">
      <button type="button" id="accept-offer" class="primary">Accept mock offer</button>
      <button type="button" id="decline-offer">Decline</button>
    </div>
  </section>

  <section id="trip-panel" class="card" hidden>
    <h2>Active mock trip</h2>
    <p>Victoria Island, Lagos → Lekki Phase 1, Lagos</p>
    <p id="trip-status"></p>
    <div class="row">
      <button type="button" id="arrive">Arrived at pickup</button>
      <button type="button" id="start-trip">Start mock trip</button>
      <button type="button" id="complete-trip" class="primary">Complete mock trip</button>
      <button type="button" id="cancel-trip" class="danger">Cancel mock trip</button>
    </div>
  </section>

  <div class="card">
    <h2>Mock earnings scenarios</h2>
    <div class="row">
      <button type="button" data-scenario="free">Free Day</button>
      <button type="button" data-scenario="topup">Top-Up Eligible</button>
      <button type="button" data-scenario="capped">Max Cap &amp; Vested</button>
    </div>
    <p class="muted">
      Presets replace mock earnings and trip counters, not documents or reports.
      They are disabled during an offer or active trip. Hours are preset values,
      not a running online timer.
    </p>
    <dl>
      <div><dt>Gross earnings today</dt><dd id="gross"></dd></div>
      <div><dt>Today's ZoluRide fee</dt><dd id="fee"></dd></div>
      <div><dt>Fee cap remaining</dt><dd id="cap"></dd></div>
      <div><dt>Completed trips today</dt><dd id="trips-today"></dd></div>
      <div><dt>Mock hours online today</dt><dd id="hours"></dd></div>
    </dl>
  </div>

  <div class="card">
    <h2>Mock Stabilisation Fund</h2>
    <dl>
      <div><dt>Pooled contribution*</dt><dd id="pool"></dd></div>
      <div><dt>Potential allocation</dt><dd id="topup"></dd></div>
    </dl>
    <small>*Displayed as the daily deduction, matching the supplied Home screen.</small>
  </div>

  <div class="card">
    <h2>Illustrative net earnings comparison</h2>
    <dl>
      <div><dt>ZoluRide</dt><dd id="zolu-net"></dd></div>
      <div><dt>Uber assumption: 25% fee</dt><dd id="uber-net"></dd></div>
      <div><dt>Bolt assumption: 20% fee</dt><dd id="bolt-net"></dd></div>
      <div><dt>Difference vs. Uber assumption</dt><dd id="savings"></dd></div>
    </dl>
    <p class="muted">
      Competitor percentages are illustrative assumptions from the domain
      comparison, not a statement of current competitor pricing.
    </p>
  </div>

  <div class="card">
    <h2>Mock ownership vesting</h2>
    <label for="vesting-progress" id="vesting-label"></label>
    <progress id="vesting-progress" max="100" value="0"></progress>
    <p id="vesting-detail"></p>
  </div>
</section>

<section id="view-documents" hidden>
  <div class="card">
    <h2>Mock driver documents</h2>
    <p>
      Select a pretend upload or renewal, submit it, then simulate verification.
      No file is requested or uploaded.
    </p>
    <p class="muted">
      The current driver compliance helper requires License, LASDRI, and NHIA,
      and checks verified status only. Go mock offline before changing documents.
    </p>
    <div id="document-list"></div>
    <div class="row">
      <button type="button" id="submit-documents">Submit mock documents</button>
      <button type="button" id="verify-documents" class="primary">Simulate verification</button>
    </div>
  </div>
</section>

<section id="view-reports" hidden>
  <div class="card">
    <h2>Mock incident report</h2>
    <p class="notice">
      Test text only. This does not notify support, emergency services, or anyone else.
      Do not enter personal or sensitive information.
    </p>
    <form id="report-form">
      <label for="report-category">Category</label>
      <select id="report-category">
        <option value="safety">Safety</option>
        <option value="medical">Medical</option>
        <option value="abuse">Abuse</option>
        <option value="other">Other</option>
      </select>
      <label for="report-description">Test description — at least 5 characters</label>
      <textarea id="report-description" minlength="5" maxlength="1000" required></textarea>
      <button type="submit" class="primary">Save mock report in memory</button>
    </form>
  </div>
  <div class="card">
    <h2>Reports in this page</h2>
    <div id="report-list"></div>
  </div>
</section>
`;

const simulatorScript = String.raw`
(function () {
  'use strict';

  const byId = function (id) { return document.getElementById(id); };
  const money = new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN',
    minimumFractionDigits: 0, maximumFractionDigits: 2
  });
  const cash = function (kobo) { return money.format(kobo / 100); };
  const requiredTypes = ['License', 'LASDRI', 'NHIA'];
  const milestones = [150, 300, 500, 750];
  const presets = {
    free: { gross: 320000, today: 2, hours: 3.5, lifetime: 120 },
    topup: { gross: 1400000, today: 9, hours: 10.5, lifetime: 350 },
    capped: { gross: 3500000, today: 14, hours: 10, lifetime: 750 }
  };

  function initialState() {
    return {
      view: 'home',
      online: false,
      vehicle: 'dev-preview-vehicle',
      offer: null,
      trip: null,
      scenario: 'initial',
      metrics: { gross: 0, today: 0, hours: 0, lifetime: 0 },
      queued: new Set(),
      reports: [],
      documents: [
        { type: 'License', label: "Nigerian Driver's Licence", status: 'verified', uploaded: true },
        { type: 'LASDRI', label: 'LASDRI Driver Institute Card', status: 'verified', uploaded: true },
        { type: 'NHIA', label: 'NHIA — required mock document', status: 'pending', uploaded: false }
      ]
    };
  }

  let state = initialState();

  function notify(message) {
    byId('message').textContent = message;
  }

  function missingDocuments() {
    return requiredTypes.filter(function (type) {
      return !state.documents.some(function (doc) {
        return doc.type === type && doc.status === 'verified';
      });
    });
  }

  function deduction(gross) {
    if (gross < 400000) return 0;
    return Math.min(
      50000 * (1 + Math.floor((gross - 400000) / 300000)),
      150000
    );
  }

  function topUp(metrics) {
    if (metrics.hours < 10 || metrics.today < 8 || metrics.gross >= 2000000) {
      return 0;
    }
    return Math.min(2000000 - metrics.gross, 300000);
  }

  function vesting(trips) {
    const count = Number.isFinite(trips) ? Math.max(0, Math.trunc(trips)) : 0;
    const achieved = milestones.filter(function (value) { return count >= value; });
    const next = milestones.find(function (value) { return count < value; });
    return {
      percentage: achieved.length * 25,
      achieved: achieved.length ? achieved[achieved.length - 1] : 0,
      next: next,
      remaining: next === undefined ? 0 : next - count
    };
  }

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function renderDocuments() {
    const container = byId('document-list');
    container.replaceChildren();

    state.documents.forEach(function (doc) {
      const item = element('div', undefined, 'document');
      item.appendChild(element('strong', doc.label));
      item.appendChild(element('p', !doc.uploaded ? 'Missing mock upload' :
        doc.status === 'verified' ? 'Verified (mock)' : 'Pending (mock)'));

      const label = element('label');
      const checkbox = element('input');
      checkbox.type = 'checkbox';
      checkbox.checked = state.queued.has(doc.type);
      checkbox.disabled = state.online;
      checkbox.addEventListener('change', function () {
        if (checkbox.checked) state.queued.add(doc.type);
        else state.queued.delete(doc.type);
        byId('submit-documents').disabled = state.online || state.queued.size === 0;
      });
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(' Queue pretend upload / renewal'));
      item.appendChild(label);
      container.appendChild(item);
    });

    byId('submit-documents').disabled = state.online || state.queued.size === 0;
    byId('verify-documents').disabled = state.online ||
      !state.documents.some(function (doc) { return doc.renewalSubmitted; });
  }

  function renderReports() {
    const container = byId('report-list');
    container.replaceChildren();
    if (!state.reports.length) {
      container.appendChild(element('p', 'No mock reports saved.'));
      return;
    }
    state.reports.forEach(function (report, index) {
      const item = element('div', undefined, 'document');
      item.appendChild(element('strong',
        'Mock report ' + (index + 1) + ' · ' + report.category +
        ' · ' + report.severity + ' severity'));
      item.appendChild(element('p', report.description, 'report-text'));
      container.appendChild(item);
    });
  }

  function updateCountdown() {
    if (!state.offer) return;
    const seconds = Math.max(0, Math.ceil((state.offer.expiresAt - Date.now()) / 1000));
    byId('offer-countdown').textContent = 'Expires in ' + seconds + ' seconds';
    if (seconds === 0) {
      state.offer = null;
      render();
      notify('The mock offer expired. No earnings changed.');
    }
  }

  function render() {
    ['home', 'documents', 'reports'].forEach(function (view) {
      byId('view-' + view).hidden = state.view !== view;
    });
    document.querySelectorAll('[data-view]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.view === state.view));
    });

    const missing = missingDocuments();
    const busy = Boolean(state.offer || state.trip);
    byId('online-status').textContent = state.online ? 'Mock online' : 'Mock offline';
    byId('compliance-status').textContent = missing.length
      ? 'Mock verification required: ' + missing.join(', ')
      : 'Required mock documents verified.';
    byId('vehicle').value = state.vehicle;
    byId('vehicle').disabled = state.online;

    byId('toggle-online').textContent = state.online ? 'Go mock offline' : 'Go mock online';
    byId('toggle-online').disabled = busy ||
      (!state.online && (!state.vehicle || missing.length > 0));
    byId('simulate-offer').disabled =
      !state.online || !state.vehicle || missing.length > 0 || busy;

    byId('offer-panel').hidden = !state.offer;
    byId('trip-panel').hidden = !state.trip;

    if (state.trip) {
      const labels = {
        assigned: 'Assigned',
        arrived_at_pickup: 'Arrived at pickup',
        in_progress: 'In progress'
      };
      byId('trip-status').textContent = 'Mock status: ' + labels[state.trip.status];
    }
    byId('arrive').hidden = !state.trip || state.trip.status !== 'assigned';
    byId('start-trip').hidden = !state.trip || state.trip.status !== 'arrived_at_pickup';
    byId('complete-trip').hidden = !state.trip || state.trip.status !== 'in_progress';

    document.querySelectorAll('[data-scenario]').forEach(function (button) {
      button.disabled = busy;
      button.setAttribute('aria-pressed',
        String(button.dataset.scenario === state.scenario));
    });

    const metrics = state.metrics;
    const fee = deduction(metrics.gross);
    const zoluNet = metrics.gross - fee;
    const uberNet = Math.round(metrics.gross * 0.75);
    const boltNet = Math.round(metrics.gross * 0.8);
    const ownership = vesting(metrics.lifetime);

    byId('gross').textContent = cash(metrics.gross);
    byId('fee').textContent = metrics.gross < 400000 ? 'Free day' : cash(fee);
    byId('cap').textContent = cash(Math.max(0, 150000 - fee));
    byId('trips-today').textContent = String(metrics.today);
    byId('hours').textContent = String(metrics.hours);
    byId('pool').textContent = cash(fee);
    byId('topup').textContent = cash(topUp(metrics));
    byId('zolu-net').textContent = cash(zoluNet);
    byId('uber-net').textContent = cash(uberNet);
    byId('bolt-net').textContent = cash(boltNet);
    byId('savings').textContent = cash(zoluNet - uberNet);
    byId('vesting-progress').value = ownership.percentage;
    byId('vesting-label').textContent =
      ownership.percentage + '% · ' + metrics.lifetime + ' / 750 trips';
    byId('vesting-detail').textContent = ownership.next === undefined
      ? 'Fully vested at 750 trips.'
      : (ownership.achieved ? ownership.achieved + '-trip milestone reached. ' : '') +
        ownership.remaining + ' trips to the ' + ownership.next + '-trip milestone.';

    renderDocuments();
    renderReports();
    updateCountdown();
  }

  document.querySelectorAll('[data-view]').forEach(function (button) {
    button.addEventListener('click', function () {
      state.view = button.dataset.view;
      render();
    });
  });

  document.querySelectorAll('[data-scenario]').forEach(function (button) {
    button.addEventListener('click', function () {
      if (state.offer || state.trip) return;
      const preset = presets[button.dataset.scenario];
      if (!preset) return;
      state.scenario = button.dataset.scenario;
      state.metrics = Object.assign({}, preset);
      render();
      notify('Mock earnings preset applied. Documents and reports are unchanged.');
    });
  });

  byId('vehicle').addEventListener('change', function () {
    if (state.online) return;
    state.vehicle = byId('vehicle').value;
    render();
  });

  byId('toggle-online').addEventListener('click', function () {
    if (state.offer || state.trip) return;
    if (!state.online && (!state.vehicle || missingDocuments().length)) return;
    state.online = !state.online;
    render();
    notify(state.online ? 'Online in this simulator only.' : 'Mock driver is offline.');
  });

  byId('simulate-offer').addEventListener('click', function () {
    if (!state.online || !state.vehicle || missingDocuments().length ||
        state.offer || state.trip) return;
    state.offer = { expiresAt: Date.now() + 10 * 60 * 1000 };
    render();
    notify('Created a mock offer. No dispatch request was sent.');
  });

  byId('accept-offer').addEventListener('click', function () {
    if (!state.offer) return;
    if (state.offer.expiresAt <= Date.now()) {
      state.offer = null;
      render();
      notify('The mock offer expired.');
      return;
    }
    if (!state.online || !state.vehicle || missingDocuments().length) return;
    state.offer = null;
    state.trip = { status: 'assigned' };
    render();
    notify('Mock offer accepted.');
  });

  byId('decline-offer').addEventListener('click', function () {
    if (!state.offer) return;
    state.offer = null;
    render();
    notify('Mock offer declined. No earnings changed.');
  });

  byId('arrive').addEventListener('click', function () {
    if (!state.trip || state.trip.status !== 'assigned') return;
    state.trip.status = 'arrived_at_pickup';
    render();
    notify('Mock arrival recorded.');
  });

  byId('start-trip').addEventListener('click', function () {
    if (!state.trip || state.trip.status !== 'arrived_at_pickup') return;
    state.trip.status = 'in_progress';
    render();
    notify('Mock trip started.');
  });

  byId('complete-trip').addEventListener('click', function () {
    if (!state.trip || state.trip.status !== 'in_progress') return;
    state.metrics.gross += 450000;
    state.metrics.today += 1;
    state.metrics.lifetime += 1;
    state.scenario = 'custom';
    state.trip = null;
    render();
    notify('Mock trip completed: added ₦4,500 and one completed trip. No payment occurred.');
  });

  byId('cancel-trip').addEventListener('click', function () {
    if (!state.trip) return;
    state.trip = null;
    render();
    notify('Mock trip cancelled. No earnings changed.');
  });

  byId('submit-documents').addEventListener('click', function () {
    if (state.online || !state.queued.size) return;
    state.documents = state.documents.map(function (doc) {
      return state.queued.has(doc.type)
        ? Object.assign({}, doc, {
            status: 'pending', uploaded: true, renewalSubmitted: true
          })
        : doc;
    });
    state.queued.clear();
    render();
    notify('Pretend documents submitted in memory. No upload or review request was sent.');
  });

  byId('verify-documents').addEventListener('click', function () {
    if (state.online) return;
    let changed = false;
    state.documents = state.documents.map(function (doc) {
      if (!doc.renewalSubmitted) return doc;
      changed = true;
      return Object.assign({}, doc, {
        status: 'verified',
        uploaded: true,
        renewalSubmitted: false
      });
    });
    render();
    notify(changed
      ? 'Mock verification completed in memory. No real approval was changed.'
      : 'Submit a pretend document before simulating verification.');
  });

  byId('report-form').addEventListener('submit', function (event) {
    event.preventDefault();
    const description = byId('report-description').value.trim();
    if (description.length < 5) {
      notify('Enter at least five non-space characters of test text.');
      return;
    }
    const category = byId('report-category').value;
    state.reports.push({
      category: category,
      description: description.slice(0, 1000),
      severity: ['safety', 'medical', 'abuse'].includes(category) ? 'high' : 'normal'
    });
    byId('report-description').value = '';
    renderReports();
    notify('Mock report saved in page memory only. Nobody was notified.');
  });

  byId('reset').addEventListener('click', function () {
    if (!window.confirm('Clear all mock data in this page?')) return;
    state = initialState();
    byId('report-form').reset();
    render();
    notify('All mock data reset. Real apps are unchanged.');
  });

  render();
  notify('Start with Mock documents: queue NHIA, submit it, then simulate verification.');
  window.setInterval(updateCountdown, 1000);
})();
`;

new Script(hubScript, { filename: 'dev-hub-browser.js' });
new Script(simulatorScript, { filename: 'dev-simulator-browser.js' });

function makePage(title, body, script, nonce) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style nonce="${nonce}">${styles}</style>
</head>
<body>
<main>${body}</main>
<script nonce="${nonce}">${script}</script>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const headers = {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY'
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, {
      ...headers,
      Allow: 'GET, HEAD',
      'Content-Type': 'text/plain; charset=utf-8'
    });
    res.end('Method not allowed');
    return;
  }

  let pathname;
  try {
    pathname = new URL(req.url || '/', 'http://localhost').pathname;
  } catch {
    res.writeHead(400, {
      ...headers,
      'Content-Type': 'text/plain; charset=utf-8'
    });
    res.end(req.method === 'HEAD' ? undefined : 'Bad request');
    return;
  }

  if (pathname === '/favicon.ico') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  const isHub = pathname === '/';
  const isSimulator = ['/simulator', '/simulator/', '/simulator.html'].includes(pathname);

  if (!isHub && !isSimulator) {
    res.writeHead(404, {
      ...headers,
      'Content-Type': 'text/plain; charset=utf-8'
    });
    res.end(req.method === 'HEAD' ? undefined : 'Not found');
    return;
  }

  const nonce = randomBytes(18).toString('base64');
  const html = makePage(
    isHub ? 'ZOLU Developer Hub' : 'ZOLU Mock Driver Simulator',
    isHub ? hubBody : simulatorBody,
    isHub ? hubScript : simulatorScript,
    nonce
  );

  res.writeHead(200, {
    ...headers,
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
    'Content-Security-Policy':
      "default-src 'none'; " +
      "script-src 'nonce-" + nonce + "'; " +
      "style-src 'nonce-" + nonce + "'; " +
      "connect-src 'none'; " +
      "form-action 'none'; " +
      "base-uri 'none'; " +
      "frame-ancestors 'none'"
  });
  res.end(req.method === 'HEAD' ? undefined : html);
});

server.on('error', (error) => {
  console.error(error.message);
  process.exit(1);
});

const configuredPort = process.env.DEV_HUB_PORT;
const port = configuredPort === undefined ? 8084 : Number(configuredPort);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error('DEV_HUB_PORT must be an integer between 0 and 65535.');
}

server.listen(port, '0.0.0.0', () => {
  const address = server.address();
  const listeningPort = address && typeof address === 'object' ? address.port : port;
  console.log('ZOLU Developer Hub listening on port ' + listeningPort);
  console.log('Mock simulator: /simulator');
  console.log('Development only. Keep forwarded ports private.');
});
