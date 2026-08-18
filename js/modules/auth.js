/* ============================================================
   WarehouseOS — modules/auth.js
   Authentication, Registration, and Role-Based Access Control (RBAC)
   ============================================================ */

const AuthModule = (() => {

  const AUTH_STORAGE_KEY = 'warehouseos_auth_session_v1';
  const USERS_STORAGE_KEY = 'warehouseos_registered_users_v1';

  // Seed default users
  const DEFAULT_USERS = [
    {
      id: 'USR-001',
      name: 'Veera Govind',
      email: 'admin@warehouse.os',
      password: 'admin',
      role: 'Admin',
      title: 'Operations Director',
      initials: 'VG',
      zone: 'All Zones',
      permissions: ['all', 'admin', 'staff_manage', 'inventory_edit', 'orders_manage', 'system_reset'],
      avatarColor: 'linear-gradient(135deg, #A855F7, #6366F1)'
    },
    {
      id: 'USR-002',
      name: 'Alex Rivera',
      email: 'alex@warehouse.os',
      password: 'staff',
      role: 'Staff',
      title: 'Senior Picker',
      initials: 'AR',
      zone: 'Zone A',
      permissions: ['picking', 'orders_view', 'inventory_view', 'ar'],
      avatarColor: 'linear-gradient(135deg, #06B6D4, #3B82F6)'
    },
    {
      id: 'USR-003',
      name: 'Dana Patel',
      email: 'dana@warehouse.os',
      password: 'staff',
      role: 'Supervisor',
      title: 'Lead Packer & Dispatch Lead',
      initials: 'DP',
      zone: 'Zone D',
      permissions: ['picking', 'dispatch', 'orders_manage', 'inventory_view', 'alerts_manage'],
      avatarColor: 'linear-gradient(135deg, #10B981, #06B6D4)'
    }
  ];

  let users = [];
  let currentUser = null;

  function init() {
    // Load registered users
    try {
      const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
      if (savedUsers) {
        users = JSON.parse(savedUsers);
      } else {
        users = [...DEFAULT_USERS];
        saveUsers();
      }
    } catch (e) {
      users = [...DEFAULT_USERS];
    }

    // Load active session or default to Admin (Veera Govind)
    try {
      const savedSession = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedSession) {
        currentUser = JSON.parse(savedSession);
      } else {
        currentUser = users[0]; // Veera Govind Admin
        saveSession();
      }
    } catch (e) {
      currentUser = users[0];
    }

    updateUI();
  }

  function saveUsers() {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {}
  }

  function saveSession() {
    try {
      if (currentUser) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (e) {}
  }

  function updateUI() {
    if (!currentUser) return;

    // Update top bar avatar & name
    const topAvatar = document.querySelector('.user-avatar');
    if (topAvatar) {
      topAvatar.textContent = currentUser.initials;
      topAvatar.title = `${currentUser.name} — ${currentUser.title} (${currentUser.role === 'Admin' ? '👑 Admin Access' : currentUser.role})`;
      topAvatar.style.background = currentUser.avatarColor;
    }

    // Update sidebar footer profile
    const sidebarAvatar = document.querySelector('.user-avatar-sm');
    const sidebarName = document.querySelector('.user-name');
    const sidebarRole = document.querySelector('.user-role');
    const adminBadge = document.querySelector('.sidebar-footer .badge-purple');

    if (sidebarAvatar) {
      sidebarAvatar.textContent = currentUser.initials;
      sidebarAvatar.style.background = currentUser.avatarColor;
    }
    if (sidebarName) sidebarName.textContent = currentUser.name;
    if (sidebarRole) sidebarRole.textContent = currentUser.title || currentUser.role;
    if (adminBadge) {
      adminBadge.textContent = currentUser.role.toUpperCase();
      adminBadge.className = `badge ${currentUser.role === 'Admin' ? 'badge-purple' : 'badge-neutral'}`;
    }
  }

  function getCurrentUser() {
    return currentUser || users[0];
  }

  function isAdmin() {
    return currentUser && currentUser.role === 'Admin';
  }

  function login(email, password) {
    const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);
    if (!user) {
      return { success: false, message: 'Invalid email or password. Try admin@warehouse.os / admin' };
    }
    currentUser = user;
    saveSession();
    updateUI();
    Utils.Sound?.playSuccess?.();
    Utils.Toast.success('Signed In', `Welcome back, ${user.name} (${user.role} Access)`);
    Router.dispatch();
    return { success: true, user };
  }

  function register(data) {
    const existing = users.find(u => u.email.toLowerCase() === data.email.trim().toLowerCase());
    if (existing) {
      return { success: false, message: 'An account with this email already exists' };
    }

    const id = 'USR-' + String(users.length + 1).padStart(3, '0');
    const initials = data.name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'OP';
    const role = data.role || 'Staff';

    const newUser = {
      id,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password || 'password123',
      role: role,
      title: data.title || (role === 'Admin' ? 'System Administrator' : 'Warehouse Operator'),
      initials,
      zone: data.zone || 'Zone A',
      permissions: role === 'Admin' ? ['all', 'admin', 'staff_manage', 'inventory_edit', 'orders_manage'] : ['picking', 'orders_view', 'inventory_view'],
      avatarColor: role === 'Admin' ? 'linear-gradient(135deg, #A855F7, #6366F1)' : 'linear-gradient(135deg, #06B6D4, #10B981)',
      registeredAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers();

    // Also sync to active Staff Store roster
    Store.addStaff({
      name: newUser.name,
      role: newUser.title,
      zone: newUser.zone.replace('Zone ', ''),
      status: 'active',
      accessLevel: newUser.role
    });

    currentUser = newUser;
    saveSession();
    updateUI();

    Utils.Sound?.playSuccess?.();
    Utils.Toast.success('Account Created', `Registered & logged in as ${newUser.name} (${newUser.role})`);
    Router.dispatch();
    return { success: true, user: newUser };
  }

  function logout() {
    currentUser = null;
    saveSession();
    updateUI();
    Utils.Toast.info('Signed Out', 'You have been signed out of WarehouseOS');
    openAuthModal('login');
  }

  // ─── AUTH MODAL (LOGIN & REGISTRATION TABS) ────────────────
  function openAuthModal(initialTab = 'login') {
    Utils.Modal.open('🔐 WarehouseOS Portal: Login & Registration', `
      <div class="auth-modal-wrapper">
        <!-- Tab Switcher -->
        <div class="flex items-center justify-center mb-4 p-1 rounded-xl" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1)">
          <button id="auth-tab-login" class="btn btn-sm flex-1 ${initialTab==='login'?'btn-primary font-bold':'btn-ghost'}" onclick="AuthModule.switchTab('login')">
            🔑 Sign In (Login)
          </button>
          <button id="auth-tab-register" class="btn btn-sm flex-1 ${initialTab==='register'?'btn-primary font-bold':'btn-ghost'}" onclick="AuthModule.switchTab('register')">
            ➕ Create Account (Register)
          </button>
        </div>

        <!-- 1-Click Quick Demo Login Presets Banner -->
        <div class="p-2.5 rounded-lg mb-4" style="background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.25)">
          <div class="text-xs text-primary font-bold mb-1.5 flex items-center gap-1.5">
            <span>⚡</span>
            <span>1-Click Instant Demo Login Presets</span>
          </div>
          <div class="flex items-center gap-1.5 flex-wrap">
            <button type="button" class="btn btn-secondary btn-xs font-bold" onclick="AuthModule.quickLogin('admin@warehouse.os','admin')">
              👑 Admin (Veera Govind)
            </button>
            <button type="button" class="btn btn-secondary btn-xs font-bold" onclick="AuthModule.quickLogin('alex@warehouse.os','staff')">
              👷 Picker (Alex Rivera)
            </button>
            <button type="button" class="btn btn-secondary btn-xs font-bold" onclick="AuthModule.quickLogin('dana@warehouse.os','staff')">
              📦 Supervisor (Dana Patel)
            </button>
          </div>
        </div>

        <!-- LOGIN FORM CONTAINER -->
        <div id="auth-login-view" class="${initialTab==='login'?'':'hidden'}">
          <form id="auth-login-form" onsubmit="event.preventDefault(); AuthModule.submitLogin();">
            <div class="form-group mb-3">
              <label class="form-label">Email Address <span class="required">*</span></label>
              <input id="login-email" type="email" class="form-control" placeholder="admin@warehouse.os" value="admin@warehouse.os" required />
            </div>
            <div class="form-group mb-4">
              <label class="form-label">Password <span class="required">*</span></label>
              <input id="login-password" type="password" class="form-control" placeholder="Enter password (default: admin)" value="admin" required />
            </div>
            <button type="submit" class="btn btn-primary w-full font-bold py-2">
              🔑 Sign In with Access Credentials
            </button>
          </form>
        </div>

        <!-- REGISTRATION FORM CONTAINER -->
        <div id="auth-register-view" class="${initialTab==='register'?'':'hidden'}">
          <form id="auth-register-form" onsubmit="event.preventDefault(); AuthModule.submitRegister();">
            <div class="form-grid form-grid-2 mb-3" style="gap:12px">
              <div class="form-group">
                <label class="form-label">Full Name <span class="required">*</span></label>
                <input id="reg-name" type="text" class="form-control" placeholder="e.g. Ramesh Sharma" required />
              </div>
              <div class="form-group">
                <label class="form-label">Role Access Level</label>
                <select id="reg-role" class="form-control">
                  <option value="Admin">👑 Administrator (Full Control)</option>
                  <option value="Supervisor">🛡️ Supervisor (Shift Lead)</option>
                  <option value="Staff" selected>👷 Floor Operator (Picker/Packer)</option>
                </select>
              </div>
            </div>

            <div class="form-grid form-grid-2 mb-3" style="gap:12px">
              <div class="form-group">
                <label class="form-label">Work Email <span class="required">*</span></label>
                <input id="reg-email" type="email" class="form-control" placeholder="name@warehouse.os" required />
              </div>
              <div class="form-group">
                <label class="form-label">Password <span class="required">*</span></label>
                <input id="reg-password" type="password" class="form-control" placeholder="Create password" required />
              </div>
            </div>

            <div class="form-grid form-grid-2 mb-4" style="gap:12px">
              <div class="form-group">
                <label class="form-label">Job Title / Designation</label>
                <input id="reg-title" type="text" class="form-control" placeholder="e.g. Senior Inventory Specialist" />
              </div>
              <div class="form-group">
                <label class="form-label">Primary Zone</label>
                <select id="reg-zone" class="form-control">
                  <option value="Zone A">Zone A — Electronics</option>
                  <option value="Zone B">Zone B — Hardware</option>
                  <option value="Zone C">Zone C — Packaging</option>
                  <option value="Zone D">Zone D — Safety</option>
                  <option value="Zone E">Zone E — High-Value</option>
                  <option value="Zone F">Zone F — Machinery</option>
                </select>
              </div>
            </div>

            <button type="submit" class="btn btn-primary w-full font-bold py-2">
              ➕ Register & Access Warehouse Platform
            </button>
          </form>
        </div>
      </div>
    `, { size: 'md' });
  }

  function switchTab(tab) {
    const loginView = document.getElementById('auth-login-view');
    const regView = document.getElementById('auth-register-view');
    const tabLogin = document.getElementById('auth-tab-login');
    const tabReg = document.getElementById('auth-tab-register');

    if (tab === 'login') {
      loginView?.classList.remove('hidden');
      regView?.classList.add('hidden');
      tabLogin?.classList.add('btn-primary', 'font-bold');
      tabLogin?.classList.remove('btn-ghost');
      tabReg?.classList.remove('btn-primary', 'font-bold');
      tabReg?.classList.add('btn-ghost');
    } else {
      loginView?.classList.add('hidden');
      regView?.classList.remove('hidden');
      tabReg?.classList.add('btn-primary', 'font-bold');
      tabReg?.classList.remove('btn-ghost');
      tabLogin?.classList.remove('btn-primary', 'font-bold');
      tabLogin?.classList.add('btn-ghost');
    }
  }

  function submitLogin() {
    const email = document.getElementById('login-email')?.value;
    const pass = document.getElementById('login-password')?.value;
    const res = login(email, pass);
    if (res.success) {
      Utils.Modal.close();
    } else {
      Utils.Toast.error('Login Failed', res.message);
    }
  }

  function submitRegister() {
    const name = document.getElementById('reg-name')?.value;
    const email = document.getElementById('reg-email')?.value;
    const password = document.getElementById('reg-password')?.value;
    const role = document.getElementById('reg-role')?.value;
    const title = document.getElementById('reg-title')?.value;
    const zone = document.getElementById('reg-zone')?.value;

    const res = register({ name, email, password, role, title, zone });
    if (res.success) {
      Utils.Modal.close();
    } else {
      Utils.Toast.error('Registration Error', res.message);
    }
  }

  // ─── FULL-PAGE DEDICATED LOGIN INTERFACE ───────────────────
  function renderLoginPage(container) {
    const user = getCurrentUser();
    container.innerHTML = `
      <div class="auth-page-container" style="max-width:1080px;margin:20px auto;padding:10px;">
        
        <!-- Breadcrumb / Header pill -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-2">
            <span class="badge badge-primary font-mono font-bold" style="font-size:10.5px">🔐 SECURE AUTHENTICATION GATEWAY</span>
            <span class="text-xs text-muted">Enterprise Multi-Tenant Access</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="badge ${user.role==='Admin'?'badge-purple':'badge-success'}" style="font-size:10px">
              Active: ${user.name} (${user.role})
            </span>
          </div>
        </div>

        <!-- 2-Column Split Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px;">
          
          <!-- LEFT HERO & TELEMETRY PANEL -->
          <div class="card p-6 flex flex-col justify-between" style="background:linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,41,59,0.85));border:1px solid rgba(6,182,212,0.3);border-radius:var(--radius-2xl);box-shadow:0 20px 50px rgba(0,0,0,0.5);">
            <div>
              <!-- Brand Header -->
              <div class="flex items-center gap-3 mb-4">
                <div class="logo-mark" style="width:42px;height:42px;font-size:20px;border-radius:12px;">⚡</div>
                <div>
                  <h2 class="font-bold text-xl" style="letter-spacing:-0.02em;background:linear-gradient(135deg, #38BDF8, #818CF8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">WarehouseOS</h2>
                  <div class="text-xs text-muted font-mono">Spatial Intelligence Platform v2.4</div>
                </div>
              </div>

              <p class="text-sm text-secondary mb-6 leading-relaxed">
                Autonomous real-time warehouse orchestration, 3D digital-twin spatial tracking, Markov demand forecasting, and role-based staff operations.
              </p>

              <!-- Security & Architecture Highlights -->
              <div class="flex flex-col gap-3 mb-6">
                <div class="p-3 rounded-xl flex items-center gap-3" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);">
                  <span class="text-xl">🛡️</span>
                  <div>
                    <div class="font-bold text-xs text-primary">Executive Admin Protection</div>
                    <div class="text-xs text-muted">Root-level clearance for inventory mutations, staff onboarding & AI reallocations.</div>
                  </div>
                </div>

                <div class="p-3 rounded-xl flex items-center gap-3" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);">
                  <span class="text-xl">⚡</span>
                  <div>
                    <div class="font-bold text-xs text-success">CDC Real-Time Stream Ingestion</div>
                    <div class="text-xs text-muted">PostgreSQL replication streaming 42+ mutations/sec with zero locking.</div>
                  </div>
                </div>

                <div class="p-3 rounded-xl flex items-center gap-3" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);">
                  <span class="text-xl">👷</span>
                  <div>
                    <div class="font-bold text-xs text-purple-400">Multi-Role Floor Operations</div>
                    <div class="text-xs text-muted">Dedicated workflows for Pickers, Packers, Supervisors, and AGV controllers.</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer Quote / Status -->
            <div class="pt-4 flex items-center justify-between text-xs text-muted font-mono" style="border-top:1px solid rgba(255,255,255,0.08);">
              <span>● Status: 99.8% Online</span>
              <span>TLS 256-Bit</span>
            </div>
          </div>

          <!-- RIGHT AUTH INTERFACE (LOGIN / REGISTER) -->
          <div class="card p-6" style="background:rgba(15,23,42,0.92);backdrop-filter:blur(20px);border:1px solid rgba(168,85,247,0.3);border-radius:var(--radius-2xl);box-shadow:0 20px 50px rgba(0,0,0,0.6);">
            
            <!-- Tab Switcher -->
            <div class="flex items-center p-1 rounded-xl mb-5" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);">
              <button id="page-tab-login" class="btn btn-sm flex-1 btn-primary font-bold" onclick="AuthModule.switchPageTab('login')">
                🔑 Sign In
              </button>
              <button id="page-tab-register" class="btn btn-sm flex-1 btn-ghost" onclick="AuthModule.switchPageTab('register')">
                ➕ Create Account
              </button>
            </div>

            <!-- 1-Click Quick Demo Login Presets -->
            <div class="p-3 rounded-xl mb-5" style="background:linear-gradient(135deg, rgba(6,182,212,0.08), rgba(168,85,247,0.08));border:1px solid rgba(6,182,212,0.25);">
              <div class="text-xs font-bold text-primary mb-2 flex items-center gap-1.5">
                <span>⚡</span>
                <span>1-Click Instant Demo Login Presets:</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button type="button" class="btn btn-secondary btn-xs font-bold w-full truncate" onclick="AuthModule.quickLogin('admin@warehouse.os','admin')">
                  👑 Veera (Admin)
                </button>
                <button type="button" class="btn btn-secondary btn-xs font-bold w-full truncate" onclick="AuthModule.quickLogin('alex@warehouse.os','staff')">
                  👷 Alex (Picker)
                </button>
                <button type="button" class="btn btn-secondary btn-xs font-bold w-full truncate" onclick="AuthModule.quickLogin('dana@warehouse.os','staff')">
                  📦 Dana (Packer)
                </button>
              </div>
            </div>

            <!-- SIGN IN FORM VIEW -->
            <div id="page-login-view">
              <form id="page-login-form" onsubmit="event.preventDefault(); AuthModule.submitPageLogin();">
                <div class="form-group mb-3">
                  <label class="form-label text-xs font-bold text-secondary">Work Email Address <span class="required">*</span></label>
                  <input id="page-login-email" type="email" class="form-control" placeholder="admin@warehouse.os" value="admin@warehouse.os" required />
                </div>

                <div class="form-group mb-4">
                  <div class="flex items-center justify-between mb-1">
                    <label class="form-label text-xs font-bold text-secondary mb-0">Password <span class="required">*</span></label>
                    <span class="text-xs text-muted font-mono" style="font-size:10.5px">Default: admin</span>
                  </div>
                  <input id="page-login-password" type="password" class="form-control" placeholder="Enter your password" value="admin" required />
                </div>

                <div class="flex items-center justify-between mb-5 text-xs text-muted">
                  <label class="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked style="accent-color:#06B6D4" />
                    <span>Keep me signed in</span>
                  </label>
                  <a href="#/login" class="text-primary hover:underline" onclick="Utils.Toast.info('Demo Credentials','Use admin@warehouse.os / admin for Admin or alex@warehouse.os / staff for Picker')">Forgot password?</a>
                </div>

                <button type="submit" class="btn btn-primary w-full font-bold py-2.5" style="font-size:13px;letter-spacing:0.02em;">
                  🔑 Authenticate & Enter Platform
                </button>
              </form>
            </div>

            <!-- REGISTRATION FORM VIEW -->
            <div id="page-register-view" class="hidden">
              <form id="page-register-form" onsubmit="event.preventDefault(); AuthModule.submitPageRegister();">
                <div class="form-grid form-grid-2 mb-3" style="gap:12px;">
                  <div class="form-group">
                    <label class="form-label text-xs font-bold">Full Name <span class="required">*</span></label>
                    <input id="page-reg-name" type="text" class="form-control" placeholder="e.g. Rahul Sharma" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label text-xs font-bold">Role Access Level</label>
                    <select id="page-reg-role" class="form-control">
                      <option value="Admin">👑 Administrator (Full Control)</option>
                      <option value="Supervisor">🛡️ Supervisor (Shift Lead)</option>
                      <option value="Staff" selected>👷 Floor Operator (Picker/Packer)</option>
                    </select>
                  </div>
                </div>

                <div class="form-grid form-grid-2 mb-3" style="gap:12px;">
                  <div class="form-group">
                    <label class="form-label text-xs font-bold">Work Email <span class="required">*</span></label>
                    <input id="page-reg-email" type="email" class="form-control" placeholder="name@warehouse.os" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label text-xs font-bold">Password <span class="required">*</span></label>
                    <input id="page-reg-password" type="password" class="form-control" placeholder="Create secure password" required />
                  </div>
                </div>

                <div class="form-grid form-grid-2 mb-4" style="gap:12px;">
                  <div class="form-group">
                    <label class="form-label text-xs font-bold">Job Title</label>
                    <input id="page-reg-title" type="text" class="form-control" placeholder="e.g. Lead Logistics Specialist" />
                  </div>
                  <div class="form-group">
                    <label class="form-label text-xs font-bold">Assigned Zone</label>
                    <select id="page-reg-zone" class="form-control">
                      <option value="Zone A">Zone A — Electronics</option>
                      <option value="Zone B">Zone B — Hardware</option>
                      <option value="Zone C">Zone C — Packaging</option>
                      <option value="Zone D">Zone D — Safety</option>
                      <option value="Zone E">Zone E — High-Value</option>
                      <option value="Zone F">Zone F — Machinery</option>
                    </select>
                  </div>
                </div>

                <button type="submit" class="btn btn-primary w-full font-bold py-2.5" style="font-size:13px;">
                  ➕ Create Account & Auto-Login
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>
    `;
  }

  function switchPageTab(tab) {
    const loginView = document.getElementById('page-login-view');
    const regView = document.getElementById('page-register-view');
    const tabLogin = document.getElementById('page-tab-login');
    const tabReg = document.getElementById('page-tab-register');

    if (tab === 'login') {
      loginView?.classList.remove('hidden');
      regView?.classList.add('hidden');
      tabLogin?.classList.add('btn-primary', 'font-bold');
      tabLogin?.classList.remove('btn-ghost');
      tabReg?.classList.remove('btn-primary', 'font-bold');
      tabReg?.classList.add('btn-ghost');
    } else {
      loginView?.classList.add('hidden');
      regView?.classList.remove('hidden');
      tabReg?.classList.add('btn-primary', 'font-bold');
      tabReg?.classList.remove('btn-ghost');
      tabLogin?.classList.remove('btn-primary', 'font-bold');
      tabLogin?.classList.add('btn-ghost');
    }
  }

  function submitPageLogin() {
    const email = document.getElementById('page-login-email')?.value;
    const pass = document.getElementById('page-login-password')?.value;
    const res = login(email, pass);
    if (res.success) {
      Router.go('/dashboard');
    } else {
      Utils.Toast.error('Login Failed', res.message);
    }
  }

  function submitPageRegister() {
    const name = document.getElementById('page-reg-name')?.value;
    const email = document.getElementById('page-reg-email')?.value;
    const password = document.getElementById('page-reg-password')?.value;
    const role = document.getElementById('page-reg-role')?.value;
    const title = document.getElementById('page-reg-title')?.value;
    const zone = document.getElementById('page-reg-zone')?.value;

    const res = register({ name, email, password, role, title, zone });
    if (res.success) {
      Router.go('/dashboard');
    } else {
      Utils.Toast.error('Registration Error', res.message);
    }
  }

  return {
    init, getCurrentUser, isAdmin, login, register, logout,
    openAuthModal, switchTab, submitLogin, submitRegister, quickLogin,
    renderLoginPage, switchPageTab, submitPageLogin, submitPageRegister
  };
})();
