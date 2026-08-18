/* ============================================================
   WarehouseOS — utils.js
   Formatters, ID generator, toast system, chart helpers
   ============================================================ */

const Utils = (() => {

  // ─── ID GENERATOR ──────────────────────────────────────────
  /** @param {string} prefix - ID prefix string @returns {string} Unique identifier */
  function uid(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  // ─── FORMATTERS ────────────────────────────────────────────
  /** @param {number} amount - Amount to format @param {string} symbol - Currency symbol @returns {string} Formatted currency string */
  function currency(amount, symbol = '$') {
    return symbol + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  /** @param {number} n - Number to format @returns {string} Locale-formatted number string */
  function number(n) {
    return Number(n).toLocaleString('en-US');
  }
  /** @param {number} val - Numerator value @param {number} total - Denominator value @returns {string} Rounded percentage string */
  function percent(val, total) {
    if (!total) return '0%';
    return Math.round((val / total) * 100) + '%';
  }
  /** @param {string} isoString - ISO 8601 timestamp @returns {string} Human-readable relative time */
  function timeAgo(isoString) {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7)   return `${days}d ago`;
    return formatDate(isoString);
  }

  function formatDate(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  }

  function formatDateTime(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month:'short', day:'numeric' }) + ' ' +
           d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
  }

  function formatTime(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
  }

  function dueUrgency(dueDateISO) {
    if (!dueDateISO) return 'ok';
    const diff = new Date(dueDateISO) - Date.now();
    const hours = diff / 3600000;
    if (hours < 0)  return 'overdue';
    if (hours < 24) return 'urgent';
    if (hours < 72) return 'soon';
    return 'ok';
  }

  function dueLabel(dueDateISO) {
    if (!dueDateISO) return '—';
    const diff = new Date(dueDateISO) - Date.now();
    const hours = Math.round(Math.abs(diff) / 3600000);
    const days  = Math.floor(Math.abs(diff) / 86400000);
    if (diff < 0)         return `${days}d overdue`;
    if (hours < 1)        return 'Due <1h';
    if (hours < 24)       return `Due in ${hours}h`;
    if (days === 1)       return 'Due tomorrow';
    return `Due in ${days}d`;
  }

  function stockLevel(quantity, maxCapacity) {
    return Math.min(100, Math.round((quantity / maxCapacity) * 100));
  }

  function stockClass(quantity, reorderPoint) {
    if (quantity === 0) return 'critical';
    if (quantity <= reorderPoint) return 'low';
    return 'healthy';
  }

  function priorityLabel(priority) {
    return { vip:'VIP', express:'Express', standard:'Standard' }[priority] || priority;
  }

  function statusLabel(status) {
    const map = {
      pending:'Pending', allocated:'Allocated', picking:'Picking',
      packed:'Packed', dispatched:'Dispatched', delivered:'Delivered',
      cancelled:'Cancelled'
    };
    return map[status] || status;
  }

  function carrierIcon(carrier) {
    const icons = { FedEx:'🚀', UPS:'📦', DHL:'✈️', Local:'🚚' };
    return icons[carrier] || '📤';
  }

  // ─── DOM HELPERS ───────────────────────────────────────────
  function el(tag, attrs = {}, ...children) {
    const element = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') element.className = v;
      else if (k === 'html') element.innerHTML = v;
      else if (k.startsWith('on')) element[k] = v;
      else element.setAttribute(k, v);
    });
    children.flat().forEach(child => {
      if (typeof child === 'string') element.appendChild(document.createTextNode(child));
      else if (child instanceof Node) element.appendChild(child);
    });
    return element;
  }

  function qs(selector, parent = document) {
    return parent.querySelector(selector);
  }

  function qsa(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
  }

  function setHTML(selector, html, parent = document) {
    const el = qs(selector, parent);
    if (el) el.innerHTML = html;
    return el;
  }

  // ─── TOAST SYSTEM ──────────────────────────────────────────
  const Toast = (() => {
    const container = () => document.getElementById('toast-container');

    function show(title, message = '', type = 'info', duration = 4000) {
      const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
      const toastEl = document.createElement('div');
      toastEl.className = `toast ${type}`;
      toastEl.setAttribute('role', 'alert');
      const iconSpan = document.createElement('span');
      iconSpan.className = 'toast-icon';
      iconSpan.textContent = icons[type] || 'ℹ️';

      const contentDiv = document.createElement('div');
      contentDiv.className = 'toast-content';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'toast-title';
      titleDiv.textContent = title;
      contentDiv.appendChild(titleDiv);

      if (message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'toast-message';
        messageDiv.textContent = message;
        contentDiv.appendChild(messageDiv);
      }

      toastEl.appendChild(iconSpan);
      toastEl.appendChild(contentDiv);

      toastEl.onclick = () => dismiss(toastEl);
      container().appendChild(toastEl);

      const timer = setTimeout(() => dismiss(toastEl), duration);
      toastEl._timer = timer;
      return toastEl;
    }

    function dismiss(toastEl) {
      clearTimeout(toastEl._timer);
      toastEl.classList.add('hiding');
      setTimeout(() => toastEl.remove(), 200);
    }

    return {
      success: (t, m, d) => show(t, m, 'success', d),
      error:   (t, m, d) => show(t, m, 'error',   d),
      warning: (t, m, d) => show(t, m, 'warning',  d),
      info:    (t, m, d) => show(t, m, 'info',     d),
    };
  })();

  // ─── MODAL SYSTEM ──────────────────────────────────────────
  const Modal = (() => {
    function open(title, bodyHTML, options = {}) {
      const overlay = document.getElementById('modal-overlay');
      const modal   = document.getElementById('modal');
      const titleEl = document.getElementById('modal-title');
      const bodyEl  = document.getElementById('modal-body');
      const footerEl = document.getElementById('modal-footer');

      titleEl.textContent = title;
      bodyEl.innerHTML    = bodyHTML;

      // Modal size
      modal.className = 'modal';
      if (options.size) modal.classList.add('modal-' + options.size);

      // Footer buttons
      if (options.footer) {
        footerEl.innerHTML  = options.footer;
        footerEl.classList.remove('hidden');
      } else {
        footerEl.innerHTML = '';
        footerEl.classList.add('hidden');
      }

      overlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';

      // Run any callback after render
      if (options.onOpen) setTimeout(() => options.onOpen(bodyEl), 0);
      return bodyEl;
    }

    function close() {
      document.getElementById('modal-overlay').classList.add('hidden');
      document.body.style.overflow = '';
    }

    return { open, close };
  })();

  // ─── CONFIRM DIALOG ────────────────────────────────────────
  function confirm(message, title = 'Confirm Action') {
    return new Promise(resolve => {
      const overlay = document.getElementById('confirm-overlay');
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-message').textContent = message;
      overlay.classList.remove('hidden');

      const ok = document.getElementById('confirm-ok-btn');
      const cancel = document.getElementById('confirm-cancel-btn');

      function cleanup(result) {
        overlay.classList.add('hidden');
        ok.removeEventListener('click', onOk);
        cancel.removeEventListener('click', onCancel);
        resolve(result);
      }

      const onOk = () => cleanup(true);
      const onCancel = () => cleanup(false);

      ok.addEventListener('click', onOk);
      cancel.addEventListener('click', onCancel);
    });
  }

  // ─── CANVAS CHARTS ─────────────────────────────────────────
  const Charts = (() => {

    function drawLineChart(canvas, data, options = {}) {
      const ctx = canvas.getContext('2d');
      const W = canvas.offsetWidth || 600;
      const H = canvas.offsetHeight || 200;
      canvas.width  = W * devicePixelRatio;
      canvas.height = H * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);

      const {
        labels = [],
        datasets = [],
        padding = { top:20, right:20, bottom:40, left:50 },
        gridColor = 'rgba(255,255,255,0.05)',
        labelColor = 'rgba(255,255,255,0.35)',
        fontSize = 11,
        gridLines = 5,
      } = options;

      ctx.clearRect(0, 0, W, H);

      const chartW = W - padding.left - padding.right;
      const chartH = H - padding.top  - padding.bottom;

      // Flatten all values
      const allVals = datasets.flatMap(d => d.data);
      const maxVal  = Math.max(...allVals, 1);
      const minVal  = 0;

      // Grid
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.fillStyle = labelColor;
      ctx.textAlign = 'right';
      for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + chartH - (i / gridLines) * chartH;
        const val = Math.round((i / gridLines) * maxVal);
        ctx.fillText(val, padding.left - 8, y + 4);
        ctx.beginPath();
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartW, y);
        ctx.stroke();
      }

      // X labels
      ctx.textAlign = 'center';
      ctx.fillStyle = labelColor;
      const step = chartW / Math.max(labels.length - 1, 1);
      labels.forEach((label, i) => {
        const x = padding.left + i * step;
        ctx.fillText(label, x, H - padding.bottom + 18);
      });

      // Datasets
      datasets.forEach(({ data: vals, color = '#4a9eff', fill = true, lineWidth = 2 }) => {
        const points = vals.map((v, i) => ({
          x: padding.left + (i / Math.max(vals.length - 1, 1)) * chartW,
          y: padding.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH
        }));

        if (fill) {
          ctx.beginPath();
          ctx.moveTo(points[0].x, padding.top + chartH);
          points.forEach(p => ctx.lineTo(p.x, p.y));
          ctx.lineTo(points[points.length-1].x, padding.top + chartH);
          ctx.closePath();
          const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
          grad.addColorStop(0, color.replace(')', ',0.25)').replace('hsl(', 'hsla(').replace('rgb(', 'rgba('));
          grad.addColorStop(1, color.replace(')', ',0.02)').replace('hsl(', 'hsla(').replace('rgb(', 'rgba('));
          if (color.startsWith('#')) {
            grad.addColorStop(0, color + '40');
            grad.addColorStop(1, color + '04');
          }
          ctx.fillStyle = grad;
          ctx.fill();
        }

        // Line
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();

        // Dots
        points.forEach(p => {
          ctx.beginPath();
          ctx.fillStyle = color;
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#10131a';
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      });
    }

    function drawBarChart(canvas, data, options = {}) {
      const ctx = canvas.getContext('2d');
      const W = canvas.offsetWidth || 400;
      const H = canvas.offsetHeight || 200;
      canvas.width  = W * devicePixelRatio;
      canvas.height = H * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);

      const {
        labels = [], values = [], colors = [],
        padding = { top:20, right:20, bottom:40, left:50 },
        gridColor = 'rgba(255,255,255,0.05)',
        labelColor = 'rgba(255,255,255,0.35)',
        barRadius = 4, gap = 0.3, gridLines = 4,
      } = options;

      ctx.clearRect(0, 0, W, H);

      const chartW = W - padding.left - padding.right;
      const chartH = H - padding.top  - padding.bottom;
      const maxVal  = Math.max(...values, 1);

      // Grid
      ctx.font = `11px Inter, sans-serif`;
      ctx.fillStyle = labelColor;
      for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + chartH - (i / gridLines) * chartH;
        const val = Math.round((i / gridLines) * maxVal);
        ctx.textAlign = 'right';
        ctx.fillText(val, padding.left - 8, y + 4);
        ctx.beginPath();
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartW, y);
        ctx.stroke();
      }

      // Bars
      const barW = (chartW / values.length) * (1 - gap);
      const barGap = (chartW / values.length) * gap;

      values.forEach((val, i) => {
        const barH = (val / maxVal) * chartH;
        const x = padding.left + i * (barW + barGap) + barGap / 2;
        const y = padding.top + chartH - barH;
        const color = colors[i] || '#4a9eff';

        ctx.beginPath();
        ctx.fillStyle = color;
        roundRect(ctx, x, y, barW, barH, barRadius);
        ctx.fill();

        // Label
        ctx.textAlign = 'center';
        ctx.fillStyle = labelColor;
        ctx.fillText(labels[i] || '', x + barW / 2, H - padding.bottom + 18);
      });
    }

    function drawDonut(canvas, data, options = {}) {
      const ctx = canvas.getContext('2d');
      const W = canvas.offsetWidth || 160;
      const H = canvas.offsetHeight || 160;
      canvas.width  = W * devicePixelRatio;
      canvas.height = H * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);

      const { segments = [], centerText = '', subText = '', thickness = 24 } = options;

      ctx.clearRect(0, 0, W, H);

      const cx = W / 2, cy = H / 2;
      const r = Math.min(cx, cy) - thickness / 2 - 4;
      const total = segments.reduce((s, seg) => s + seg.value, 0);

      // Track
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = thickness;
      ctx.stroke();

      let startAngle = -Math.PI / 2;
      segments.filter(s => s.value > 0).forEach(seg => {
        const sweep = (seg.value / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, startAngle, startAngle + sweep);
        ctx.strokeStyle = seg.color;
        ctx.lineWidth = thickness;
        ctx.lineCap = 'round';
        ctx.stroke();
        startAngle += sweep;
      });

      // Center text
      if (centerText) {
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = `bold ${Math.floor(W/5)}px Inter, sans-serif`;
        ctx.fillText(centerText, cx, cy + 6);
        if (subText) {
          ctx.font = `${Math.floor(W/10)}px Inter, sans-serif`;
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fillText(subText, cx, cy + 22);
        }
      }
    }

    function roundRect(ctx, x, y, w, h, r) {
      r = Math.min(r, h / 2, w / 2);
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    return { drawLineChart, drawBarChart, drawDonut };
  })();

  // ─── SEARCH / FILTER ───────────────────────────────────────
  function fuzzyMatch(str, query) {
    if (!query) return true;
    const s = str.toLowerCase();
    const q = query.toLowerCase();
    return s.includes(q);
  }

  function filterProducts(products, { search, zone, category, status }) {
    return products.filter(p => {
      if (search && !fuzzyMatch(`${p.name} ${p.sku} ${p.bin}`, search)) return false;
      if (zone && zone !== 'all' && p.zone !== zone) return false;
      if (category && category !== 'all' && p.category !== category) return false;
      if (status === 'low')      return p.quantity > 0 && p.quantity <= p.reorderPoint;
      if (status === 'out')      return p.quantity === 0;
      if (status === 'healthy')  return p.quantity > p.reorderPoint;
      return true;
    });
  }

  function filterOrders(orders, { search, status, priority }) {
    return orders.filter(o => {
      if (search && !fuzzyMatch(`${o.id} ${o.customerName}`, search)) return false;
      if (status && status !== 'all' && o.status !== status) return false;
      if (priority && priority !== 'all' && o.priority !== priority) return false;
      return true;
    });
  }

  // ─── SORT ──────────────────────────────────────────────────
  function sortBy(arr, key, dir = 'asc') {
    return [...arr].sort((a, b) => {
      let va = a[key], vb = b[key];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      return dir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0)
                           : (va > vb ? -1 : va < vb ? 1 : 0);
    });
  }

  // ─── CSV EXPORT ────────────────────────────────────────────
  function exportCSV(rows, filename = 'export.csv') {
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(row => headers.map(h => {
        const v = row[h] == null ? '' : String(row[h]);
        return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  // ─── DEBOUNCE ──────────────────────────────────────────────
  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
  }

  // ─── SYNTHETIC WEB AUDIO FEEDBACK ─────────────────────────
  const Sound = (() => {
    let ctx = null;
    function getCtx() {
      if (!ctx && (window.AudioContext || window.webkitAudioContext)) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
      return ctx;
    }
    function playScan() {
      try {
        const c = getCtx();
        if (!c) return;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, c.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1850, c.currentTime + 0.07);
        gain.gain.setValueAtTime(0.08, c.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, c.currentTime + 0.07);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start();
        osc.stop(c.currentTime + 0.07);
      } catch(e) {}
    }
    function playSuccess() {
      try {
        const c = getCtx();
        if (!c) return;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const osc = c.createOscillator();
          const gain = c.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, c.currentTime + i * 0.06);
          gain.gain.setValueAtTime(0.06, c.currentTime + i * 0.06);
          gain.gain.linearRampToValueAtTime(0.001, c.currentTime + (i + 1) * 0.08);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start(c.currentTime + i * 0.06);
          osc.stop(c.currentTime + (i + 1) * 0.08);
        });
      } catch(e) {}
    }
    function playAlert() {
      try {
        const c = getCtx();
        if (!c) return;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(340, c.currentTime);
        osc.frequency.linearRampToValueAtTime(220, c.currentTime + 0.14);
        gain.gain.setValueAtTime(0.06, c.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, c.currentTime + 0.14);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start();
        osc.stop(c.currentTime + 0.14);
      } catch(e) {}
    }
    return { playScan, playSuccess, playAlert };
  })();

  // ─── PRIORITY SCORE ────────────────────────────────────────
  function orderPriorityScore(order) {
    const tierScore  = { vip: 100, express: 60, standard: 20 }[order.priority] || 0;
    const hoursLeft  = (new Date(order.dueDate) - Date.now()) / 3600000;
    const urgency    = hoursLeft < 0 ? 100 : hoursLeft < 24 ? 80 : hoursLeft < 72 ? 40 : 10;
    return tierScore + urgency;
  }

  // ─── INPUT SANITIZATION (XSS Prevention) ──────────────────
  /** @param {string} str - Raw string to sanitize @returns {string} HTML-escaped safe string for XSS prevention */
  function sanitizeHTML(str) {
    if (typeof str !== 'string') return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;', '/': '&#x2F;' };
    return str.replace(/[&<>"'\/]/g, c => map[c]);
  }
  /** @param {string} str - User input to clean @returns {string} Stripped and trimmed safe string */
  function sanitizeInput(str) {
    if (typeof str !== 'string') return '';
    return str.trim().replace(/[<>"'`]/g, '');
  }

  return {
    uid, currency, number, percent, timeAgo, formatDate, formatDateTime, formatTime,
    dueUrgency, dueLabel, stockLevel, stockClass, priorityLabel, statusLabel, carrierIcon,
    el, qs, qsa, setHTML,
    Toast, Modal, confirm,
    Charts, Sound,
    fuzzyMatch, filterProducts, filterOrders, sortBy, exportCSV, debounce,
    orderPriorityScore, sanitizeHTML, sanitizeInput,
  };
})();
