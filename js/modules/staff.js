/* ============================================================
   WarehouseOS — modules/staff.js
   Admin-Protected Staff Management & Operator Onboarding Module
   ============================================================ */

const StaffModule = (() => {

  let currentFilters = { search: '', zone: 'all', role: 'all', status: 'all' };

  function render(container) {
    container.innerHTML = buildHTML();
    bindEvents(container);
    renderStaffGrid(container);
  }

  function buildHTML() {
    const staff = Store.get.staff();
    const activeStaff = staff.filter(s => s.status === 'active').length;
    const onBreak = staff.filter(s => s.status === 'break').length;

    return `
    <div class="staff-module">
      <!-- Section Header with Admin Security Clearance Badge -->
      <div class="section-header">
        <div class="section-header-left">
          <div class="flex items-center gap-2 mb-1">
            <h2 class="section-title">Staff & Workforce Operations</h2>
            <span class="badge badge-purple font-mono font-bold" style="font-size:10px">
              👑 Admin Access Only (Veera Govind)
            </span>
          </div>
          <p class="section-sub">${staff.length} registered personnel · ${activeStaff} active on floor · ${onBreak} on break</p>
        </div>
        <div class="section-actions flex items-center gap-2">
          <button class="btn btn-secondary btn-sm" onclick="StaffModule.openQuickAddPresets()" aria-label="Open quick add presets">
            ⚡ 1-Click Quick Onboard
          </button>
          <button class="btn btn-primary btn-sm font-bold" onclick="StaffModule.openAddStaffModal()" aria-label="Add new staff member">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            ➕ Add New Staff
          </button>
        </div>
      </div>

      <!-- Admin Access Banner -->
      <div class="card card-glow-interactive mb-4 p-3.5" style="background:linear-gradient(135deg, rgba(168,85,247,0.1), rgba(15,23,42,0.9));border:1px solid rgba(168,85,247,0.35)">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2.5">
            <span class="text-2xl">🛡️</span>
            <div>
              <div class="font-bold text-xs" style="color:#C084FC">Executive Admin Clearance Active</div>
              <div class="text-xs text-muted">Signed in as <strong>Veera Govind (Operations Director)</strong>. Full permissions to onboard, assign zones, manage shift rosters, and adjust pick quotas.</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="badge badge-success" style="font-size:10px">● Role-Based Access: Full Control</span>
          </div>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="data-grid data-grid-4 mb-6">
        <div class="kpi-card" style="cursor:default">
          <div class="kpi-icon">👥</div>
          <div class="kpi-label">Total Roster</div>
          <div class="kpi-value" style="color:var(--clr-primary-light)">${staff.length}</div>
          <div class="kpi-sub">Registered Staff</div>
        </div>

        <div class="kpi-card" style="cursor:default">
          <div class="kpi-icon">🟢</div>
          <div class="kpi-label">Active on Floor</div>
          <div class="kpi-value" style="color:var(--clr-success-text)">${activeStaff}</div>
          <div class="kpi-sub">${Math.round(activeStaff/staff.length*100 || 0)}% floor coverage</div>
        </div>

        <div class="kpi-card" style="cursor:default">
          <div class="kpi-icon">🎯</div>
          <div class="kpi-label">Avg Pick Accuracy</div>
          <div class="kpi-value" style="color:var(--clr-accent)">${(staff.reduce((s,m)=>s+m.accuracy,0)/staff.length || 99).toFixed(1)}%</div>
          <div class="kpi-sub">Error tolerance: &lt;1%</div>
        </div>

        <div class="kpi-card" style="cursor:default">
          <div class="kpi-icon">⚡</div>
          <div class="kpi-label">Total Completed Tasks</div>
          <div class="kpi-value" style="color:var(--clr-warning-text)">${staff.reduce((s,m)=>s+m.tasksCompleted,0)}</div>
          <div class="kpi-sub">All-time fulfillment</div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="filter-search">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          <input type="search" id="staff-search" placeholder="Search staff name, ID or role…" value="${currentFilters.search}" aria-label="Search staff" />
        </div>
        <select id="staff-zone-filter" class="filter-select" aria-label="Filter staff by zone">
          <option value="all">All Zones</option>
          ${['A','B','C','D','E','F'].map(z => `<option value="${z}" ${currentFilters.zone===z?'selected':''}>Zone ${z} (${SeedData.zoneInfo[z]?.name||z})</option>`).join('')}
        </select>
        <select id="staff-role-filter" class="filter-select" aria-label="Filter staff by role">
          <option value="all">All Roles</option>
          <option value="Picker">Picker</option>
          <option value="Senior Picker">Senior Picker</option>
          <option value="Packer">Packer</option>
          <option value="Supervisor">Supervisor</option>
          <option value="AGV Controller">AGV Controller</option>
        </select>
        <select id="staff-status-filter" class="filter-select" aria-label="Filter staff by status">
          <option value="all">All Statuses</option>
          <option value="active">🟢 Active</option>
          <option value="break">☕ On Break</option>
          <option value="off">⚪ Off Shift</option>
        </select>
      </div>

      <!-- Staff Grid -->
      <div id="staff-content"></div>
    </div>`;
  }

  function renderStaffGrid(container) {
    const contentEl = Utils.qs('#staff-content', container || document);
    if (!contentEl) return;

    let staff = Store.get.staff();

    // Filters
    if (currentFilters.search) {
      const q = currentFilters.search.toLowerCase();
      staff = staff.filter(s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.role.toLowerCase().includes(q));
    }
    if (currentFilters.zone !== 'all') {
      staff = staff.filter(s => s.zone === currentFilters.zone);
    }
    if (currentFilters.role !== 'all') {
      staff = staff.filter(s => s.role.toLowerCase().includes(currentFilters.role.toLowerCase()));
    }
    if (currentFilters.status !== 'all') {
      staff = staff.filter(s => s.status === currentFilters.status);
    }

    if (staff.length === 0) {
      contentEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <h4>No staff members found</h4>
          <p>Try adjusting filters or click "+ Add New Staff" above</p>
        </div>`;
      return;
    }

    contentEl.innerHTML = `
      <div class="data-grid data-grid-3" style="gap:var(--sp-4)">
        ${staff.map(s => staffCardHTML(s)).join('')}
      </div>`;
  }

  function staffCardHTML(s) {
    const statusColors = { active: '#10B981', break: '#F59E0B', off: '#64748B' };
    const statusLabels = { active: '🟢 Active on Floor', break: '☕ On Break', off: '⚪ Off Shift' };
    const color = statusColors[s.status] || '#10B981';

    return `
    <div class="card card-glow-interactive" style="border-top:3px solid ${color}">
      <div class="card-body p-4">
        <!-- Top row: Avatar + Name + ID -->
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="user-avatar-sm font-bold" style="width:38px;height:38px;font-size:12px;background:rgba(6,182,212,0.15);border:1px solid rgba(6,182,212,0.4);color:#38BDF8">
              ${s.initials || s.name.slice(0,2).toUpperCase()}
            </div>
            <div>
              <div class="font-bold text-sm" style="color:var(--clr-text)">${s.name}</div>
              <div class="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                <span class="font-mono text-primary font-bold">${s.id}</span>
                <span>·</span>
                <span>${s.role}</span>
              </div>
            </div>
          </div>
          <span class="product-row-zone zone-${s.zone}" title="Assigned to Zone ${s.zone}">${s.zone}</span>
        </div>

        <!-- Metric pill row -->
        <div class="data-grid data-grid-3 mb-3 p-2 rounded-lg text-center" style="background:var(--glass-bg-subtle);border:var(--glass-border);gap:6px">
          <div>
            <div class="text-xs text-muted" style="font-size:10px">Picks Done</div>
            <div class="font-mono font-bold text-xs text-primary">${s.tasksCompleted}</div>
          </div>
          <div>
            <div class="text-xs text-muted" style="font-size:10px">Accuracy</div>
            <div class="font-mono font-bold text-xs text-success">${s.accuracy}%</div>
          </div>
          <div>
            <div class="text-xs text-muted" style="font-size:10px">Avg Pace</div>
            <div class="font-mono font-bold text-xs text-warning">${s.avgPickTime || 4.0}m</div>
          </div>
        </div>

        <!-- Shift Schedule & Access Level -->
        <div class="flex items-center justify-between text-xs text-muted mb-3 font-mono" style="font-size:10.5px">
          <span>🕒 ${s.shift || 'Morning Shift'}</span>
          <span class="badge ${s.accessLevel==='Admin'?'badge-purple':'badge-neutral'}" style="font-size:9px">${s.accessLevel || 'Operator'}</span>
        </div>

        <!-- Action row -->
        <div class="flex items-center justify-between gap-2 pt-2" style="border-top:1px solid var(--clr-border)">
          <div class="flex items-center gap-1">
            <button class="btn btn-ghost btn-xs font-semibold" onclick="StaffModule.toggleStaffStatus('${s.id}')" title="Cycle Status (Active / Break / Off)" aria-label="Toggle status for ${s.name}">
              ${statusLabels[s.status] || 'Active'}
            </button>
          </div>
          <div class="flex items-center gap-1">
            <button class="btn btn-secondary btn-xs icon-btn" onclick="StaffModule.openEditStaffModal('${s.id}')" title="Edit Staff & Zone" aria-label="Edit staff ${s.name}">
              ✏️
            </button>
            <button class="btn btn-ghost btn-xs icon-btn text-danger" onclick="StaffModule.deleteStaff('${s.id}')" title="Decommission / Remove Staff" aria-label="Remove staff ${s.name}">
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>`;
  }

  function bindEvents(container) {
    const search = Utils.qs('#staff-search', container);
    if (search) {
      search.addEventListener('input', Utils.debounce(e => {
        currentFilters.search = e.target.value;
        renderStaffGrid(container);
      }, 200));
    }

    ['staff-zone-filter','staff-role-filter','staff-status-filter'].forEach(id => {
      const el = Utils.qs(`#${id}`, container);
      if (!el) return;
      el.addEventListener('change', e => {
        if (id === 'staff-zone-filter') currentFilters.zone = e.target.value;
        if (id === 'staff-role-filter') currentFilters.role = e.target.value;
        if (id === 'staff-status-filter') currentFilters.status = e.target.value;
        renderStaffGrid(container);
      });
    });
  }

  // ─── MODALS ────────────────────────────────────────────────
  function openAddStaffModal() {
    Utils.Modal.open('➕ Add New Warehouse Staff', `
      <form id="add-staff-form" class="form-grid form-grid-2" style="gap:var(--sp-4)">
        <div class="form-group"><label class="form-label">Full Name <span class="required">*</span></label>
          <input name="name" class="form-control" placeholder="e.g. Dev Patel, Sarah Jenkins" required /></div>
        
        <div class="form-group"><label class="form-label">Role Designation</label>
          <select name="role" class="form-control">
            <option value="Picker">Picker</option>
            <option value="Senior Picker">Senior Picker</option>
            <option value="Packer">Packer</option>
            <option value="Supervisor">Supervisor</option>
            <option value="Safety Inspector">Safety Inspector</option>
            <option value="AGV Controller">AGV Controller</option>
          </select></div>

        <div class="form-group"><label class="form-label">Assigned Zone</label>
          <select name="zone" class="form-control">
            <option value="A">Zone A — Electronics & MCUs</option>
            <option value="B">Zone B — Hardware & Fasteners</option>
            <option value="C">Zone C — Packaging Materials</option>
            <option value="D">Zone D — Safety Equipment</option>
            <option value="E">Zone E — High-Value Optical</option>
            <option value="F">Zone F — Machinery Parts & Returns</option>
          </select></div>

        <div class="form-group"><label class="form-label">Shift Timing</label>
          <select name="shift" class="form-control">
            <option value="Morning (06:00 - 14:00)">Morning (06:00 - 14:00)</option>
            <option value="Evening (14:00 - 22:00)">Evening (14:00 - 22:00)</option>
            <option value="Night (22:00 - 06:00)">Night (22:00 - 06:00)</option>
          </select></div>

        <div class="form-group"><label class="form-label">Access Level</label>
          <select name="accessLevel" class="form-control">
            <option value="Floor Operator">Floor Operator</option>
            <option value="Lead Supervisor">Lead Supervisor</option>
            <option value="Admin">Admin</option>
          </select></div>

        <div class="form-group"><label class="form-label">Initial Status</label>
          <select name="status" class="form-control">
            <option value="active">🟢 Active on Floor</option>
            <option value="break">☕ On Break</option>
            <option value="off">⚪ Off Shift</option>
          </select></div>
      </form>`, {
      size: 'md',
      footer: `
        <button class="btn btn-ghost" onclick="Utils.Modal.close()">Cancel</button>
        <button class="btn btn-primary font-bold" onclick="StaffModule.submitAddStaff()">➕ Save & Onboard Staff</button>
      `
    });
  }

  function submitAddStaff() {
    const form = document.getElementById('add-staff-form');
    if (!form?.checkValidity()) { form?.reportValidity(); return; }
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const staffMember = Store.addStaff(data);
    Utils.Modal.close();
    Utils.Sound?.playSuccess?.();
    Utils.Toast.success('Staff Onboarded', `${staffMember.name} (${staffMember.id}) assigned to Zone ${staffMember.zone}`);
    Router.dispatch();
  }

  function openEditStaffModal(staffId) {
    const s = Store.get.staff().find(m => m.id === staffId);
    if (!s) return;

    Utils.Modal.open(`Edit Staff — ${s.name} (${s.id})`, `
      <form id="edit-staff-form" class="form-grid form-grid-2" style="gap:var(--sp-4)">
        <div class="form-group"><label class="form-label">Full Name</label>
          <input name="name" class="form-control" value="${s.name}" required /></div>
        
        <div class="form-group"><label class="form-label">Role Designation</label>
          <select name="role" class="form-control">
            <option value="Picker" ${s.role==='Picker'?'selected':''}>Picker</option>
            <option value="Senior Picker" ${s.role==='Senior Picker'?'selected':''}>Senior Picker</option>
            <option value="Packer" ${s.role==='Packer'?'selected':''}>Packer</option>
            <option value="Supervisor" ${s.role==='Supervisor'?'selected':''}>Supervisor</option>
            <option value="Safety Inspector" ${s.role==='Safety Inspector'?'selected':''}>Safety Inspector</option>
            <option value="AGV Controller" ${s.role==='AGV Controller'?'selected':''}>AGV Controller</option>
          </select></div>

        <div class="form-group"><label class="form-label">Assigned Zone</label>
          <select name="zone" class="form-control">
            ${['A','B','C','D','E','F'].map(z => `<option value="${z}" ${s.zone===z?'selected':''}>Zone ${z}</option>`).join('')}
          </select></div>

        <div class="form-group"><label class="form-label">Shift Timing</label>
          <select name="shift" class="form-control">
            <option value="Morning (06:00 - 14:00)" ${s.shift==='Morning (06:00 - 14:00)'?'selected':''}>Morning (06:00 - 14:00)</option>
            <option value="Evening (14:00 - 22:00)" ${s.shift==='Evening (14:00 - 22:00)'?'selected':''}>Evening (14:00 - 22:00)</option>
            <option value="Night (22:00 - 06:00)" ${s.shift==='Night (22:00 - 06:00)'?'selected':''}>Night (22:00 - 06:00)</option>
          </select></div>

        <div class="form-group"><label class="form-label">Current Status</label>
          <select name="status" class="form-control">
            <option value="active" ${s.status==='active'?'selected':''}>🟢 Active on Floor</option>
            <option value="break" ${s.status==='break'?'selected':''}>☕ On Break</option>
            <option value="off" ${s.status==='off'?'selected':''}>⚪ Off Shift</option>
          </select></div>

        <div class="form-group"><label class="form-label">Accuracy (%)</label>
          <input name="accuracy" type="number" step="0.1" class="form-control" value="${s.accuracy}" /></div>
      </form>`, {
      size: 'md',
      footer: `
        <button class="btn btn-ghost" onclick="Utils.Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="StaffModule.submitEditStaff('${staffId}')">Save Changes</button>
      `
    });
  }

  function submitEditStaff(staffId) {
    const form = document.getElementById('edit-staff-form');
    if (!form) return;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    if (data.accuracy) data.accuracy = parseFloat(data.accuracy);

    Store.updateStaff(staffId, data);
    Utils.Modal.close();
    Utils.Toast.success('Staff Updated', `Updated profile for ${data.name}`);
    Router.dispatch();
  }

  function toggleStaffStatus(staffId) {
    const s = Store.get.staff().find(m => m.id === staffId);
    if (!s) return;
    const nextStatus = s.status === 'active' ? 'break' : s.status === 'break' ? 'off' : 'active';
    Store.setStaffStatus(staffId, nextStatus);
    Utils.Sound?.playBeep?.();
    Utils.Toast.info('Status Updated', `${s.name} is now ${nextStatus.toUpperCase()}`);
    Router.dispatch();
  }

  function deleteStaff(staffId) {
    const s = Store.get.staff().find(m => m.id === staffId);
    if (!s) return;
    if (confirm(`Are you sure you want to remove ${s.name} (${s.id}) from the active roster?`)) {
      Store.deleteStaff(staffId);
      Utils.Toast.warning('Staff Removed', `${s.name} decommissioned from floor roster`);
      Router.dispatch();
    }
  }

  function openQuickAddPresets() {
    Utils.Modal.open('⚡ 1-Click Quick Staff Onboarding', `
      <div class="flex flex-col gap-3">
        <p class="text-xs text-muted mb-2">Instantly add pre-configured personnel to the active floor roster with one click:</p>
        
        <div class="p-3 rounded-xl card-glow-interactive cursor-pointer hover:scale-[1.01] transition-transform"
             style="background:rgba(255,255,255,0.03);border:1px solid rgba(6,182,212,0.3)"
             onclick="StaffModule.quickAddStaff('picker'); Utils.Modal.close();">
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold text-sm text-primary">⚡ Quick Add Zone A Picker</span>
            <span class="badge badge-primary">Zone A · Electronics</span>
          </div>
          <div class="text-xs text-muted">Name: Ramesh Sharma · Senior Picker · Morning Shift · 99.4% Accuracy</div>
        </div>

        <div class="p-3 rounded-xl card-glow-interactive cursor-pointer hover:scale-[1.01] transition-transform"
             style="background:rgba(255,255,255,0.03);border:1px solid rgba(16,185,129,0.3)"
             onclick="StaffModule.quickAddStaff('packer'); Utils.Modal.close();">
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold text-sm text-success">⚡ Quick Add Zone C Packer</span>
            <span class="badge badge-success">Zone C · Packaging</span>
          </div>
          <div class="text-xs text-muted">Name: Ananya Roy · Lead Packer · Evening Shift · 99.8% Accuracy</div>
        </div>

        <div class="p-3 rounded-xl card-glow-interactive cursor-pointer hover:scale-[1.01] transition-transform"
             style="background:rgba(255,255,255,0.03);border:1px solid rgba(168,85,247,0.3)"
             onclick="StaffModule.quickAddStaff('supervisor'); Utils.Modal.close();">
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold text-sm text-purple-400">⚡ Quick Add Shift Supervisor</span>
            <span class="badge badge-purple">All Zones</span>
          </div>
          <div class="text-xs text-muted">Name: Karthik Iyer · Shift Supervisor · Admin Access Clearance</div>
        </div>
      </div>`, { size: 'md' });
  }

  function quickAddStaff(type) {
    let data = {};
    if (type === 'picker') {
      data = { name: 'Ramesh Sharma', role: 'Senior Picker', zone: 'A', shift: 'Morning (06:00 - 14:00)', accessLevel: 'Floor Operator', status: 'active', accuracy: 99.4 };
    } else if (type === 'packer') {
      data = { name: 'Ananya Roy', role: 'Packer', zone: 'C', shift: 'Evening (14:00 - 22:00)', accessLevel: 'Floor Operator', status: 'active', accuracy: 99.8 };
    } else {
      data = { name: 'Karthik Iyer', role: 'Supervisor', zone: 'E', shift: 'Morning (06:00 - 14:00)', accessLevel: 'Lead Supervisor', status: 'active', accuracy: 99.9 };
    }

    const member = Store.addStaff(data);
    Utils.Sound?.playSuccess?.();
    Utils.Toast.success('Staff Onboarded', `Added ${member.name} (${member.id}) to active floor roster!`);
    Router.dispatch();
  }

  return {
    render, openAddStaffModal, submitAddStaff, openEditStaffModal,
    submitEditStaff, toggleStaffStatus, deleteStaff,
    openQuickAddPresets, quickAddStaff
  };
})();
