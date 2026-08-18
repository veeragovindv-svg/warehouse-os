/* ============================================================
   WarehouseOS — modules/picking.js
   Picking & Packing Management Module
   ============================================================ */

const PickingModule = (() => {

  let selectedTask = null;

  function render(container) {
    container.innerHTML = buildHTML();
    bindEvents(container);
  }

  function buildHTML() {
    const tasks = Store.get.pickTasks();
    const pending    = tasks.filter(t => t.status === 'pending');
    const inProgress = tasks.filter(t => t.status === 'in_progress');
    const completed  = tasks.filter(t => t.status === 'completed');
    const staff      = Store.get.staff();

    return `
    <div class="picking-module">
      <div class="section-header">
        <div class="section-header-left">
          <h2 class="section-title">Picking & Packing</h2>
          <p class="section-sub">${tasks.length} pick tasks · ${inProgress.length} in progress</p>
        </div>
        <div class="section-actions">
          <span class="chip">${pending.length} pending</span>
          <span class="chip">${inProgress.length} in progress</span>
          <span class="chip text-success">${completed.length} done</span>
        </div>
      </div>

      <!-- KPI Row -->
      <div class="data-grid data-grid-3 mb-6">
        <div class="kpi-card">
          <div class="kpi-label">Active Pickers</div>
          <div class="kpi-value" style="color:var(--clr-primary-light)">${staff.filter(s=>s.status==='active').length}</div>
          <div class="kpi-sub">of ${staff.length} staff</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Items to Pick</div>
          <div class="kpi-value" style="color:var(--clr-warning-text)">
            ${[...pending,...inProgress].reduce((s,t)=>s+t.items.filter(i=>!i.picked).length,0)}
          </div>
          <div class="kpi-sub">across ${pending.length + inProgress.length} tasks</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Completed Today</div>
          <div class="kpi-value" style="color:var(--clr-success-text)">${completed.length}</div>
          <div class="kpi-sub">tasks completed</div>
        </div>
      </div>

      <div class="split-layout wide">
        <!-- Task List -->
        <div>
          <div class="line-tabs" id="pick-tabs">
            <button class="line-tab-btn active" data-tab="pending">Pending (${pending.length})</button>
            <button class="line-tab-btn" data-tab="in_progress">In Progress (${inProgress.length})</button>
            <button class="line-tab-btn" data-tab="completed">Completed (${completed.length})</button>
          </div>

          <div id="pick-task-list">
            ${renderTaskListHTML(pending, staff, 'pending')}
          </div>
        </div>

        <!-- Staff Panel -->
        <div>
          <h4 class="font-semibold mb-4">Staff Performance</h4>
          <div class="flex flex-col gap-3">
            ${staff.map(s => staffCardHTML(s)).join('')}
          </div>
        </div>
      </div>
    </div>`;
  }

  function renderTaskListHTML(tasks, staff, tab) {
    if (tasks.length === 0) {
      return `<div class="empty-state" style="padding:var(--sp-8)">
        <div class="empty-state-icon">${tab==='completed'?'✅':'📋'}</div>
        <h4>${tab==='completed'?'No completed tasks yet':'No tasks in this stage'}</h4>
        <p>${tab==='pending'?'Allocate orders to generate pick tasks':''}</p>
      </div>`;
    }
    return tasks.map(task => pickTaskCardHTML(task, staff)).join('');
  }

  function pickTaskCardHTML(task, staff) {
    const order    = Store.get.orderById(task.orderId);
    const assignee = staff.find(s => s.id === task.assignedTo);
    const pickedCount = task.items.filter(i => i.picked).length;
    const totalCount  = task.items.length;
    const pct = totalCount ? Math.round(pickedCount/totalCount*100) : 0;

    // Group by zone for route display
    const zones = [...new Set(task.items.map(i => i.zone))].sort();

    return `
    <div class="card card-interactive mb-4" onclick="PickingModule.selectTask('${task.id}')">
      <div class="card-header">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-mono font-bold text-sm" style="color:var(--clr-primary-light)">${task.id}</span>
            <span class="badge status-${task.status==='in_progress'?'picking':task.status==='completed'?'delivered':'pending'}">${
              task.status==='in_progress'?'In Progress':task.status==='completed'?'Complete':'Pending'
            }</span>
          </div>
          <div class="text-sm text-muted mt-1">→ Order ${task.orderId} · ${order?.customerName||'Unknown'}</div>
        </div>
        <div class="flex flex-col items-end gap-2">
          ${assignee ? `
          <div class="flex items-center gap-2">
            <div class="user-avatar-sm" style="width:28px;height:28px;font-size:10px">${assignee.initials}</div>
            <span class="text-xs">${assignee.name}</span>
          </div>` : `<button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();PickingModule.openAssignModal('${task.id}')">Assign Staff</button>`}
        </div>
      </div>
      <div class="card-body" style="padding:var(--sp-4)">
        <!-- Progress -->
        <div class="flex items-center gap-3 mb-3">
          <div class="progress flex-1" style="height:8px">
            <div class="progress-bar ${pct===100?'success':'warning'}" style="width:${pct}%"></div>
          </div>
          <span class="font-mono text-xs font-bold">${pickedCount}/${totalCount}</span>
        </div>

        <!-- Zone route -->
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xs text-muted">Route:</span>
          ${zones.map(z => `<span class="product-row-zone zone-${z}">${z}</span>`).join(' → ')}
        </div>

        <!-- Action buttons -->
        <div class="flex gap-2">
          ${task.status !== 'completed' ? `
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();PickingModule.openPickList('${task.id}')">
            ${task.status === 'in_progress' ? '📦 Continue Picking' : '▶️ Start Picking'}
          </button>` : `<span class="badge badge-success">✅ All Items Picked</span>`}
          ${task.startedAt ? `<span class="text-xs text-muted items-center flex">Started ${Utils.timeAgo(task.startedAt)}</span>` : ''}
        </div>
      </div>
    </div>`;
  }

  function staffCardHTML(s) {
    const activeTasks = Store.get.pickTasks().filter(t => t.assignedTo === s.id && t.status !== 'completed').length;
    const statusColor = s.status === 'active' ? 'var(--clr-success)' : 'var(--clr-warning)';
    return `
    <div class="staff-card">
      <div class="staff-avatar">${s.initials}</div>
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-sm">${s.name}</div>
        <div class="text-xs text-muted">${s.role} · Zone ${s.zone}</div>
        <div class="flex items-center gap-3 mt-2">
          <div class="text-xs">
            <span class="font-mono font-bold" style="color:var(--clr-success-text)">${s.accuracy}%</span>
            <span class="text-muted"> acc.</span>
          </div>
          <div class="text-xs">
            <span class="font-mono font-bold">${s.avgPickTime}m</span>
            <span class="text-muted">/item</span>
          </div>
          <div class="text-xs">
            <span class="font-mono font-bold text-primary">${activeTasks}</span>
            <span class="text-muted"> active</span>
          </div>
        </div>
      </div>
      <div class="flex flex-col items-end gap-1">
        <div style="width:8px;height:8px;border-radius:50%;background:${statusColor};box-shadow:0 0 6px ${statusColor}"></div>
        <span class="text-xs text-muted">${s.tasksCompleted} done</span>
      </div>
    </div>`;
  }

  // ─── PICK LIST MODAL ───────────────────────────────────────
  function openPickList(taskId) {
    const task = Store.get.pickTaskById(taskId);
    if (!task) return;
    const order   = Store.get.orderById(task.orderId);
    const assignee = Store.get.staffById(task.assignedTo);

    if (!task.assignedTo) {
      Utils.Toast.warning('Assign Staff First', 'Please assign a picker before starting');
      openAssignModal(taskId);
      return;
    }

    Utils.Modal.open(`Pick List — ${task.id}`, buildPickListHTML(task, order, assignee), {
      size:'lg',
      footer:`<button class="btn btn-ghost" onclick="Utils.Modal.close()">Close</button>
              ${task.status!=='completed'?`<button class="btn btn-primary" onclick="PickingModule.openPackModal('${taskId}')">📦 Proceed to Pack</button>`:''}`
    });
  }

  function buildPickListHTML(task, order, assignee) {
    const pickedCount = task.items.filter(i => i.picked).length;
    const allPicked   = pickedCount === task.items.length;

    // Group by zone
    const byZone = {};
    task.items.forEach(item => {
      if (!byZone[item.zone]) byZone[item.zone] = [];
      byZone[item.zone].push(item);
    });

    return `
    <div>
      <div class="flex items-center gap-3 mb-5">
        ${assignee ? `<div class="flex items-center gap-2">
          <div class="user-avatar-sm">${assignee.initials}</div>
          <span class="font-medium">${assignee.name}</span>
        </div>` : ''}
        <span class="text-muted">→</span>
        <span class="font-mono text-sm">Order ${order?.id}</span>
        <span class="text-muted text-sm">${order?.customerName}</span>
        <div class="ml-auto flex items-center gap-2">
          <span class="font-mono text-sm font-bold">${pickedCount}/${task.items.length}</span>
          <div class="progress" style="width:80px;height:6px">
            <div class="progress-bar ${allPicked?'success':'warning'}" style="width:${Math.round(pickedCount/task.items.length*100)}%"></div>
          </div>
        </div>
      </div>

      ${allPicked ? `<div class="alert-banner success mb-4"><span class="alert-banner-icon">🎉</span><span>All items picked! Ready to pack.</span></div>` : ''}

      ${Object.entries(byZone).sort(([a],[b])=>a.localeCompare(b)).map(([zone,items]) => `
        <div class="pick-list-zone-header">
          <span class="product-row-zone zone-${zone}">${zone}</span>
          <span class="pick-list-zone-label">${SeedData.zoneInfo[zone]?.name || 'Zone '+zone}</span>
          <span class="text-xs text-muted ml-auto">${items.filter(i=>i.picked).length}/${items.length} picked</span>
        </div>
        ${items.sort((a,b)=>a.bin.localeCompare(b.bin)).map(item => `
        <div class="pick-item-row ${item.picked?'picked':''}" onclick="PickingModule.togglePick('${task.id}','${item.productId}')">
          <div class="pick-checkbox">
            ${item.picked ? '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold truncate">${item.name}</div>
            <div class="font-mono text-xs text-muted">${item.sku}</div>
          </div>
          <div class="flex items-center gap-3">
            <span class="pick-bin-tag">${item.bin}</span>
            <div class="order-item-qty">${item.quantity}</div>
          </div>
        </div>`).join('')}
      `).join('')}
    </div>`;
  }

  function togglePick(taskId, productId) {
    Utils.Sound?.playScan?.();
    Store.markItemPicked(taskId, productId);
    // Re-render modal content if open
    const task = Store.get.pickTaskById(taskId);
    const order = Store.get.orderById(task?.orderId);
    const assignee = Store.get.staffById(task?.assignedTo);
    const bodyEl = document.getElementById('modal-body');
    if (bodyEl && task) {
      bodyEl.innerHTML = buildPickListHTML(task, order, assignee);
      if (task.status === 'completed') {
        Utils.Sound?.playSuccess?.();
        Utils.Toast.success('Pick Complete!', `All items picked for order ${task.orderId}`);
      }
    }
  }

  function openAssignModal(taskId) {
    const staff  = Store.get.staff().filter(s => s.status === 'active');
    const task   = Store.get.pickTaskById(taskId);
    const zones  = [...new Set(task?.items.map(i=>i.zone)||[])];

    Utils.Modal.open('Assign Picker', `
      <p class="text-sm text-muted mb-4">Select a staff member for pick task <strong>${taskId}</strong></p>
      <p class="text-xs text-muted mb-4">Zones required: ${zones.map(z=>`<span class="product-row-zone zone-${z}">${z}</span>`).join(' ')}</p>
      <div class="flex flex-col gap-3" id="staff-select-list">
        ${staff.map(s => {
          const activeTasks = Store.get.pickTasks().filter(t=>t.assignedTo===s.id&&t.status!=='completed').length;
          return `
          <div class="staff-card" onclick="PickingModule.assignAndClose('${taskId}','${s.id}')" style="cursor:pointer">
            <div class="staff-avatar">${s.initials}</div>
            <div class="flex-1">
              <div class="font-semibold text-sm">${s.name}</div>
              <div class="text-xs text-muted">${s.role} · Zone ${s.zone}</div>
            </div>
            <div class="text-xs text-right text-muted">
              <div class="font-mono font-bold ${activeTasks>2?'text-warning':'text-success'}">${activeTasks} active tasks</div>
              <div>${s.accuracy}% accuracy</div>
            </div>
          </div>`;
        }).join('')}
      </div>`);
  }

  function assignAndClose(taskId, staffId) {
    Store.assignPickTask(taskId, staffId);
    const staff = Store.get.staffById(staffId);
    Utils.Modal.close();
    Utils.Toast.success('Assigned', `${staff?.name} assigned to ${taskId}`);
    Router.dispatch();
  }

  function openPackModal(taskId) {
    const task = Store.get.pickTaskById(taskId);
    if (!task) return;
    const allPicked = task.items.every(i => i.picked);
    if (!allPicked) { Utils.Toast.warning('Not all items picked yet'); return; }

    Utils.Modal.open('Packing Checklist', `
      <div class="alert-banner success mb-4"><span class="alert-banner-icon">✅</span><span>All items picked — proceed with packing.</span></div>
      <div class="form-grid form-grid-2 mb-4">
        <div class="form-group"><label class="form-label">Total Weight (kg)</label>
          <input id="pack-weight" type="number" class="form-control" step="0.1" min="0" placeholder="0.0" /></div>
        <div class="form-group"><label class="form-label">Box Dimensions (cm)</label>
          <input id="pack-dims" class="form-control" placeholder="L × W × H" /></div>
      </div>
      <div class="form-group mb-4">
        <label class="form-label">Packaging Material</label>
        <select id="pack-material" class="form-control">
          <option>Single-Wall Box</option>
          <option>Double-Wall Box</option>
          <option>Padded Envelope</option>
          <option>Wooden Crate</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-group">Packing Notes</label>
        <textarea id="pack-notes" class="form-control" placeholder="Fragile items, special instructions…"></textarea>
      </div>`,
      { footer:`<button class="btn btn-ghost" onclick="Utils.Modal.close()">Cancel</button>
                <button class="btn btn-success" onclick="PickingModule.completePack('${taskId}')">✅ Mark as Packed</button>` }
    );
  }

  function completePack(taskId) {
    const task = Store.get.pickTaskById(taskId);
    if (!task) return;
    Store.updateOrderStatus(task.orderId, 'packed');
    Utils.Sound?.playSuccess?.();
    Utils.Modal.close();
    Utils.Toast.success('Order Packed', `Order ${task.orderId} is packed and ready for dispatch`);
    Router.dispatch();
  }

  function selectTask(taskId) {
    selectedTask = taskId;
  }

  // ─── TAB SWITCHING ─────────────────────────────────────────
  function bindEvents(container) {
    const tabs = Utils.qsa('.line-tab-btn', container);
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tabName = tab.dataset.tab;
        const tasks = Store.get.pickTasks().filter(t => t.status === tabName);
        const staff  = Store.get.staff();
        Utils.setHTML('#pick-task-list', renderTaskListHTML(tasks, staff, tabName), container);
      });
    });
  }

  return { render, openPickList, togglePick, openAssignModal, assignAndClose,
           openPackModal, completePack, selectTask };
})();
