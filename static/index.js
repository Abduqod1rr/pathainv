/* ================================================================
   Pathai — index.js
   Full app logic: state, routing, UI render
   Modified to use Django backend for AI
=============================================================== */

// ================================================================
//  i18n
// ================================================================
const I18N = {
  en: {
    'app.name': 'Pathai',
    'settings': 'Settings',
    'dark.mode': 'Dark Mode',
    'language': 'Language',
    'goals.title': 'Goals',
    'add.goal': 'Add Goal',
    'add.goal.sub': 'Plan your journey',
    'new.goal': 'New Goal',
    'goal.placeholder': 'What do you want to achieve?',
    'create.goal': 'Create Goal',
    'generating': 'Generating with AI…',
    'delete.goal': 'Delete Goal',
    'delete.confirm': 'Are you sure? This goal and all its quests will be permanently deleted.',
    'notes': 'Notes',
    'notes.placeholder': 'Write your notes here…',
    'notes.hint': 'Ctrl+Enter to save',
    'save': 'Save',
    'cancel': 'Cancel',
    'delete': 'Delete',
    'archive': 'Archive',
    'profile': 'Profile',
    'select.goal': 'Pick a goal',
    'select.goal.sub': 'Your quest roadmap will appear here',
    'no.goals': 'No goals yet',
    'no.goals.sub': 'Create your first goal to begin the journey',
    'no.archive': 'No completed goals yet',
    'no.archive.sub': 'Finish all tiers of a goal to archive it',
    'personal.info': 'Personal Info',
    'first.name': 'First Name',
    'last.name': 'Last Name',
    'bio': 'About You',
    'interests': 'Interests',
    'bio.ph': 'A short description about yourself…',
    'interests.ph': 'e.g. programming, chess, design, music…',
    'save.profile': 'Save Profile',
    'tier.locked': 'Complete the current tier first',
    'tier.unlocked': 'Tier {n} unlocked! 🎉',
    'goal.archived': 'Goal completed and archived! 🏆',
    'profile.saved': 'Profile saved ✓',
    'completed': 'Completed',
    'error': 'Something went wrong',
  },
  uz: {
    'app.name': 'Pathai',
    'settings': 'Sozlamalar',
    'dark.mode': 'Tungi rejim',
    'language': 'Til',
    'goals.title': 'Maqsadlar',
    'add.goal': "Maqsad qo'sh",
    'add.goal.sub': "Yo'lingni rejalashtir",
    'new.goal': 'Yangi maqsad',
    'goal.placeholder': 'Nimaga erishmoqchisiz?',
    'create.goal': 'Maqsad yaratish',
    'generating': 'AI bilan generatsiya…',
    'delete.goal': "Maqsadni o'chirish",
    'delete.confirm': "Ishonchingiz komilmi? Maqsad va barcha questlar butunlay o'chiriladi.",
    'notes': 'Eslatmalar',
    'notes.placeholder': 'Bu yerga eslatmalaringizni yozing…',
    'notes.hint': "Saqlash uchun Ctrl+Enter",
    'save': 'Saqlash',
    'cancel': 'Bekor qilish',
    'delete': "O'chirish",
    'archive': 'Arxiv',
    'profile': 'Profil',
    'select.goal': 'Maqsad tanlang',
    'select.goal.sub': "Quest xaritasi shu yerda ko'rinadi",
    'no.goals': 'Hali maqsad yo\'q',
    'no.goals.sub': 'Birinchi maqsadingizni yarating',
    'no.archive': 'Tugallangan maqsadlar yo\'q',
    'no.archive.sub': "Maqsadning barcha tierlarini tugatib arxivga o'ting",
    'personal.info': "Shaxsiy ma'lumotlar",
    'first.name': 'Ism',
    'last.name': 'Familiya',
    'bio': 'Siz haqingizda',
    'interests': 'Qiziqishlar',
    'bio.ph': "O'zingiz haqingizda qisqacha…",
    'interests.ph': 'Mas: dasturlash, shaxmat, dizayn…',
    'save.profile': 'Profilni saqlash',
    'tier.locked': 'Avval joriy tierni tugatib oling',
    'tier.unlocked': '{n}-tier ochildi! 🎉',
    'goal.archived': 'Maqsad tugallandi va arxivga o\'tdi! 🏆',
    'profile.saved': 'Profil saqlandi ✓',
    'completed': 'Tugallandi',
    'error': 'Xatolik yuz berdi',
  }
};

function t(key, vars = {}) {
  let str = I18N[state.settings.language]?.[key] || I18N.en[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(`{${k}}`, v);
  }
  return str;
}

// ================================================================
//  State
// ================================================================
let state = {
  userId: null,
  goals: [],
  profile: { name: '', surname: '', bio: '', interests: '' },
  settings: { language: 'en', theme: 'dark' }
};

// Runtime (not persisted)
let currentPage  = 'home';
let currentGoalId = null;
let currentTierIdx = 0;
let editingQuestRef = null;
let deletingGoalId  = null;
let isRegisterMode = false;
let isAuthenticated = false;

// ================================================================
//  Persistence
// ================================================================
function saveState() {
  localStorage.setItem('pathai_v2', JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem('pathai_v2');
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    state = deepMerge(state, saved);
  } catch(_) {}
}

async function loadGoalsFromServer() {
  try {
    const response = await fetch('/api/goals/');
    if (response.ok) {
      const data = await response.json();
      if (data.goals && data.goals.length > 0) {
        state.goals = data.goals.map(g => ({
          id: g.id,
          title: g.title,
          createdAt: new Date(g.created_at).getTime(),
          status: 'active',
          currentTier: 0,
          tiers: g.tiers
        }));
      }
    }
  } catch (err) {
    console.error('Failed to load goals from server');
  }
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      out[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

// ================================================================
//  Boot
// ================================================================
window.onload = async () => {
  loadState();
  
  // Check if user is logged in on server
  if (state.userId) {
    await checkAuth();
  }
  
  if (!isAuthenticated) {
    showAuthModal();
    return;
  }
  
  // Load goals from server
  await loadGoalsFromServer();
  
  applyTheme();
  initDrawer();
  initResizer();
  initRipple();
  initEsc();
  syncDrawerUI();
  navigate('home');
};

// ================================================================
//  Theme
// ================================================================
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.settings.theme);
  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.checked = state.settings.theme === 'dark';
}

function toggleTheme() {
  state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  saveState();
}

// ================================================================
//  Language
// ================================================================
function setLanguage(lang) {
  state.settings.language = lang;
  saveState();
  syncDrawerUI();
  navigate(currentPage);
  closeDrawer();
}

function syncDrawerUI() {
  ['en', 'uz'].forEach(l => {
    const chk = document.getElementById('check-' + l);
    if (chk) chk.style.display = l === state.settings.language ? 'inline' : 'none';
    const opt = document.getElementById('lang-' + l);
    if (opt) opt.classList.toggle('active', l === state.settings.language);
  });

  setEl('txt-settings',  t('settings'));
  setEl('txt-dark-mode', t('dark.mode'));
  setEl('txt-language',  t('language'));

  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.checked = state.settings.theme === 'dark';
}

function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ================================================================
//  Drawer
// ================================================================
function initDrawer() {
  document.getElementById('menuBtn').addEventListener('click', openDrawer);
  document.getElementById('overlay').addEventListener('click', closeDrawer);
}

function openDrawer() {
  document.getElementById('sideDrawer').classList.add('active');
  document.getElementById('overlay').classList.add('active');
}
function closeDrawer() {
  document.getElementById('sideDrawer').classList.remove('active');
  document.getElementById('overlay').classList.remove('active');
}

// ================================================================
//  Resizer
// ================================================================
function initResizer() {
  const resizer = document.getElementById('resizer');
  const sb = document.getElementById('sidebar-content');
  let dragging = false;

  resizer.addEventListener('mousedown', e => {
    dragging = true;
    resizer.classList.add('dragging');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    e.preventDefault();
  });

  function onMove(e) {
    if (!dragging) return;
    const newW = e.clientX - 71;
    if (newW > 180 && newW < 620) sb.style.width = newW + 'px';
  }
  function onUp() {
    dragging = false;
    resizer.classList.remove('dragging');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
}

// ================================================================
//  ESC
// ================================================================
function initEsc() {
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (isVisible('createGoalModal')) { closeCreateGoal(); return; }
    if (isVisible('notesModal'))      { closeNotesModal(); return; }
    if (isVisible('deleteModal'))     { closeDeleteModal(); return; }
    if (document.getElementById('sideDrawer').classList.contains('active')) { closeDrawer(); return; }
    if (currentGoalId !== null) {
      currentGoalId = null;
      renderSidebar();
      renderMain();
    }
  });
}

function isVisible(id) {
  return !document.getElementById(id)?.classList.contains('hidden');
}

// ================================================================
//  Ripple
// ================================================================
function initRipple() {
  document.addEventListener('mousedown', e => {
    const el = e.target.closest('.goal-item, .nav-item, .ripple');
    if (!el) return;
    const ripple = document.createElement('span');
    ripple.className = 'ripple-circle';
    const r = el.getBoundingClientRect();
    const sz = Math.min(r.width, r.height, 70);
    Object.assign(ripple.style, {
      width: sz + 'px', height: sz + 'px',
      left: (e.clientX - r.left - sz/2) + 'px',
      top:  (e.clientY - r.top  - sz/2) + 'px',
    });
    el.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
}

// ================================================================
//  Toast
// ================================================================
let _toastTimer;
function showToast(msg) {
  let el = document.getElementById('global-toast');
  if (!el) {
    el = Object.assign(document.createElement('div'), { id: 'global-toast', className: 'toast' });
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// ================================================================
//  Auth
// ================================================================
function showAuthModal() {
  document.getElementById('authOverlay').classList.remove('hidden');
  document.getElementById('authModal').classList.remove('hidden');
  document.getElementById('auth-username').value = '';
  document.getElementById('auth-password').value = '';
  document.getElementById('auth-bio').value = '';
  document.getElementById('auth-interests').value = '';
  updateAuthUI();
}

function closeAuthModal() {
  document.getElementById('authOverlay').classList.add('hidden');
  document.getElementById('authModal').classList.add('hidden');
}

function toggleAuthMode() {
  isRegisterMode = !isRegisterMode;
  updateAuthUI();
}

function updateAuthUI() {
  document.getElementById('auth-title').textContent = isRegisterMode ? 'Create Account' : 'Login';
  document.getElementById('auth-btn-text').textContent = isRegisterMode ? 'Register' : 'Login';
  document.getElementById('auth-toggle-text').textContent = isRegisterMode ? 'Already have an account?' : "Don't have an account?";
  document.getElementById('auth-toggle-action').textContent = isRegisterMode ? 'Login' : 'Register';
  document.getElementById('auth-bio').style.display = isRegisterMode ? 'block' : 'none';
  document.getElementById('auth-interests').style.display = isRegisterMode ? 'block' : 'none';
}

async function handleAuth() {
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;
  const bio = document.getElementById('auth-bio').value.trim();
  const interests = document.getElementById('auth-interests').value.trim();
  
  if (!username || !password) {
    showToast('Please fill in all required fields');
    return;
  }
  
  const endpoint = isRegisterMode ? '/api/register/' : '/api/login/';
  const body = { username, password };
  if (isRegisterMode) {
    body.bio = bio;
    body.interests = interests;
  }
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      state.userId = data.user.id;
      state.profile.name = data.user.username;
      state.profile.bio = data.user.bio || '';
      state.profile.interests = data.user.interests || '';
      isAuthenticated = true;
      saveState();
      closeAuthModal();
      showToast(isRegisterMode ? 'Account created!' : 'Welcome back!');
      navigate('home');
    } else {
      showToast(data.error || 'Authentication failed');
    }
  } catch (err) {
    showToast('Connection error');
  }
}

async function checkAuth() {
  try {
    const response = await fetch('/api/user/');
    if (response.ok) {
      const user = await response.json();
      state.userId = user.id;
      state.profile.name = user.username;
      state.profile.bio = user.bio || '';
      state.profile.interests = user.interests || '';
      isAuthenticated = true;
      saveState();
    } else {
      isAuthenticated = false;
    }
  } catch (err) {
    isAuthenticated = false;
  }
}

function logout() {
  fetch('/api/logout/', { method: 'POST' }).then(() => {
    state.userId = null;
    state.goals = [];
    isAuthenticated = false;
    localStorage.removeItem('pathai_v2');
    window.location.href = '/login/';
  });
}

function exportData() {
  const data = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    goals: state.goals,
    profile: state.profile,
    settings: state.settings
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pathai-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Data exported successfully');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      
      if (!data.goals || !Array.isArray(data.goals)) {
        showToast('Invalid backup file');
        return;
      }
      
      if (!confirm('This will replace all your current goals. Continue?')) {
        return;
      }
      
      state.goals = data.goals;
      if (data.profile) state.profile = data.profile;
      if (data.settings) state.settings = data.settings;
      saveState();
      renderMain();
      showToast('Data imported successfully');
    } catch (err) {
      showToast('Error reading file');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ================================================================
//  Navigate
// ================================================================
function navigate(pageId) {
  currentPage = pageId;
  currentGoalId = null;

  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });

  renderSidebar();
  renderMain();
}

// ================================================================
//  Helpers
// ================================================================
function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function goalColor(title) {
  const COLORS = ['#4A90E2','#E2844A','#4AE2A8','#E24A7B','#A84AE2','#E2C34A','#4AE2D4','#7B5CF6','#50C8E2','#E26060'];
  let h = 0;
  for (let i = 0; i < title.length; i++) h = title.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

function activeGoals()   { return state.goals.filter(g => g.status !== 'archived'); }
function archivedGoals() { return state.goals.filter(g => g.status === 'archived'); }

function getGoal(id) { return state.goals.find(g => g.id === id) || null; }

function totalProgress(goal) {
  const total = goal.tiers.reduce((a, t) => a + t.quests.length, 0);
  const done  = goal.tiers.reduce((a, t) => a + t.quests.filter(q => q.completed).length, 0);
  return total > 0 ? Math.round(done / total * 100) : 0;
}

function tierProgress(tier) {
  return {
    done: tier.quests.filter(q => q.completed).length,
    total: tier.quests.length
  };
}

function isTierDone(tier) { return tier.quests.length > 0 && tier.quests.every(q => q.completed); }

// ================================================================
//  Sidebar Render
// ================================================================
function renderSidebar() {
  const sb = document.getElementById('sidebar-content');

  if (currentPage === 'home') {
    const goals = activeGoals();
    const items = goals.map(g => {
      const pct = totalProgress(g);
      const init = (g.title[0] || '?').toUpperCase() + (g.title[1] || '').toUpperCase();
      const active = currentGoalId === g.id ? 'active-goal' : '';
      return `
        <div class="goal-item ${active}" onclick="openGoal('${g.id}')">
          <div class="goal-avatar" style="background:${goalColor(g.title)}">${esc(init)}</div>
          <div class="goal-info">
            <div class="goal-name">${esc(g.title)}</div>
            <div class="goal-sub">Tier ${(g.currentTier||0)+1} / 10</div>
            <div class="mini-prog-wrap"><div class="mini-prog-fill" style="width:${pct}%"></div></div>
          </div>
        </div>`;
    }).join('');

    sb.innerHTML = `
      <div class="sb-header"><span class="sb-brand">${t('app.name')}</span></div>
      <div class="goal-item" onclick="openCreateGoal()">
        <div class="goal-avatar add-av"><i class="fas fa-plus"></i></div>
        <div class="goal-info">
          <div class="goal-name" style="color:var(--accent-blue)">${t('add.goal')}</div>
          <div class="goal-sub">${t('add.goal.sub')}</div>
        </div>
      </div>
      ${items || `<div class="sb-empty">${t('no.goals.sub')}</div>`}`;

  } else if (currentPage === 'archive') {
    const goals = archivedGoals();
    const items = goals.map(g => {
      const active = currentGoalId === g.id ? 'active-goal' : '';
      return `
        <div class="goal-item ${active}" onclick="openGoal('${g.id}')">
          <div class="goal-avatar archive-av"><i class="fas fa-trophy"></i></div>
          <div class="goal-info">
            <div class="goal-name">${esc(g.title)}</div>
            <div class="goal-sub" style="color:var(--success)">✓ ${t('completed')}</div>
          </div>
        </div>`;
    }).join('');

    sb.innerHTML = `
      <div class="sb-header"><span class="sb-brand">${t('archive')}</span></div>
      ${items || `<div class="sb-empty">${t('no.archive.sub')}</div>`}`;

  } else if (currentPage === 'profile') {
    const p = state.profile;
    const initials = (p.name?.[0]||'?').toUpperCase() + (p.surname?.[0]||'').toUpperCase();
    sb.innerHTML = `
      <div class="sb-header"><span class="sb-brand">${t('profile')}</span></div>
      <div style="padding:24px 18px; text-align:center;">
        <div class="goal-avatar" style="margin:0 auto 12px; width:64px; height:64px; font-size:22px; background:var(--accent)">${esc(initials)}</div>
        <div style="font-weight:600; font-size:16px; margin-bottom:4px">${esc(p.name)} ${esc(p.surname)}</div>
        <div style="font-size:13px; color:var(--text-3); line-height:1.5">${esc(p.interests || '')}</div>
      </div>`;
  }
}

// ================================================================
//  Main Content Render
// ================================================================
function renderMain() {
  const main = document.getElementById('main-content');

  if (currentGoalId) {
    renderGoalDetail(main);
    return;
  }

  if (currentPage === 'home') {
    main.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fas fa-map-marked-alt"></i></div>
        <h3>${t('select.goal')}</h3>
        <p>${t('select.goal.sub')}</p>
      </div>`;

  } else if (currentPage === 'archive') {
    const goals = archivedGoals();
    if (!goals.length) {
      main.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fas fa-archive"></i></div>
          <h3>${t('no.archive')}</h3>
          <p>${t('no.archive.sub')}</p>
        </div>`;
    } else {
      const cards = goals.map(g => `
        <div class="archive-card">
          <div class="archive-card-info">
            <h3>${esc(g.title)}</h3>
            <p>${new Date(g.archivedAt || g.createdAt).toLocaleDateString()}</p>
          </div>
          <div class="archive-actions">
            <div class="badge-done"><i class="fas fa-check"></i> ${t('completed')}</div>
            <button class="arch-del-btn" onclick="openDeleteModal('${g.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </div>`).join('');
      main.innerHTML = `<div class="archive-page"><h2 class="page-title">${t('archive')}</h2>${cards}</div>`;
    }

  } else if (currentPage === 'profile') {
    const p = state.profile;
    main.innerHTML = `
      <div class="profile-page">
        <h2 class="page-title">${t('profile')}</h2>
        <div class="profile-avatar-area">
          <div class="profile-avatar-big" id="pf-av">${esc((p.name?.[0]||'?').toUpperCase()+(p.surname?.[0]||'').toUpperCase())}</div>
          <div class="profile-name-display">${esc(p.name||'')} ${esc(p.surname||'')}</div>
          <div class="profile-sub-display">${esc(p.interests||'')}</div>
        </div>
        <div class="section-label">${t('personal.info')}</div>
        <div class="field-group">
          <div class="field-row">
            <div class="field">
              <label>${t('first.name')}</label>
              <input class="f-input" id="pf-name" value="${esc(p.name||'')}" placeholder="${t('first.name')}" oninput="liveUpdateProfile()">
            </div>
            <div class="field">
              <label>${t('last.name')}</label>
              <input class="f-input" id="pf-surname" value="${esc(p.surname||'')}" placeholder="${t('last.name')}" oninput="liveUpdateProfile()">
            </div>
          </div>
          <div class="field">
            <label>${t('bio')}</label>
            <textarea class="f-textarea" id="pf-bio" placeholder="${t('bio.ph')}">${esc(p.bio||'')}</textarea>
          </div>
          <div class="field">
            <label>${t('interests')}</label>
            <textarea class="f-textarea" id="pf-interests" placeholder="${t('interests.ph')}">${esc(p.interests||'')}</textarea>
          </div>
        </div>
        <button class="save-profile-btn" onclick="saveProfile()">
          <i class="fas fa-check"></i> ${t('save.profile')}
        </button>
      </div>`;
  }
}

// ================================================================
//  Goal Detail
// ================================================================
function openGoal(goalId) {
  currentGoalId = goalId;
  const goal = getGoal(goalId);
  if (!goal) return;
  currentTierIdx = goal.currentTier || 0;
  renderSidebar();
  renderMain();
}

function renderGoalDetail(main) {
  const goal = getGoal(currentGoalId);
  if (!goal) return;

  const pct = totalProgress(goal);
  const tier = goal.tiers[currentTierIdx];
  if (!tier) return;

  const { done: tDone, total: tTotal } = tierProgress(tier);

  const questsHTML = tier.quests.map((q, qi) => `
    <div class="quest-card ${q.completed ? 'done-card' : ''}">
      <div class="quest-row">
        <div class="quest-left">
          <div class="quest-check ${q.completed ? 'done' : ''}"
               onclick="toggleQuest('${goal.id}', ${currentTierIdx}, ${qi})"></div>
          <span class="quest-name ${q.completed ? 'struck' : ''}">${esc(q.title)}</span>
        </div>
        <div class="note-btn ${q.notes ? 'has-note' : ''}"
             onclick="openNotesModal('${goal.id}', ${currentTierIdx}, ${qi})"
             title="${t('notes')}">
          <i class="fas fa-sticky-note"></i>
        </div>
      </div>
      ${q.notes ? `<div class="quest-note-display">${esc(q.notes)}</div>` : ''}
    </div>`).join('');

  const tiersHTML = goal.tiers.map((tr, i) => {
    const done = isTierDone(tr);
    const isActive  = i === goal.currentTier;
    const isPast    = i < goal.currentTier;
    const isLocked  = i > goal.currentTier;
    const isSelected = i === currentTierIdx;

    let cls  = 't-locked';
    let icon = `<i class="fas fa-lock" style="font-size:11px"></i>`;
    if (done || isPast) { cls = 't-done';   icon = i + 1; }
    else if (isActive)  { cls = 't-active'; icon = i + 1; }

    const clickable = done || isPast || isActive;
    const onclick = clickable
      ? `selectTier(${i})`
      : `showToast('${t('tier.locked')}')`;

    return `<div class="tier-node ${cls} ${isSelected ? 't-selected' : ''}"
                 onclick="${onclick}" title="Tier ${i+1}">${icon}</div>`;
  }).join('');

  main.innerHTML = `
    <div class="goal-detail">
      <div class="goal-detail-header">
        <div class="gdh-left">
          <h2>${esc(goal.title)}</h2>
          <div class="progress-row">
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width:${pct}%"></div>
            </div>
            <span class="progress-pct">${pct}%</span>
          </div>
        </div>
        <button class="del-goal-btn" onclick="openDeleteModal('${goal.id}')">
          <i class="fas fa-trash-alt"></i> ${t('delete.goal')}
        </button>
      </div>
      <div class="goal-body">
        <div class="quest-area">
          <div class="tier-heading">
            <span class="tier-heading-title">${esc(tier.title || 'Tier ' + (currentTierIdx+1))}</span>
            <span class="tier-badge">${tDone} / ${tTotal}</span>
          </div>
          ${questsHTML}
        </div>
        <div class="tiers-sidebar">${tiersHTML}</div>
      </div>
    </div>`;
}

function selectTier(idx) {
  currentTierIdx = idx;
  renderMain();
}

// ================================================================
//  Toggle Quest
// ================================================================
function toggleQuest(goalId, tierIdx, questIdx) {
  const goal = getGoal(goalId);
  if (!goal) return;

  const quest = goal.tiers[tierIdx].quests[questIdx];
  quest.completed = !quest.completed;

  checkTierCompletion(goal, tierIdx);
  saveState();
  renderMain();
  renderSidebar();
}

function checkTierCompletion(goal, tierIdx) {
  const tier = goal.tiers[tierIdx];
  if (!isTierDone(tier)) return;

  const nextIdx = tierIdx + 1;

  if (nextIdx < goal.tiers.length) {
    if ((goal.currentTier || 0) <= tierIdx) {
      goal.currentTier = nextIdx;
      showToast(t('tier.unlocked', { n: nextIdx + 1 }));
      setTimeout(() => {
        if (currentGoalId === goal.id) {
          currentTierIdx = nextIdx;
          renderMain();
        }
      }, 700);
    }
  } else {
    const allDone = goal.tiers.every(tr => isTierDone(tr));
    if (allDone) {
      goal.status = 'archived';
      goal.archivedAt = Date.now();
      showToast(t('goal.archived'));
      setTimeout(() => {
        currentGoalId = null;
        currentPage = 'archive';
        navigate('archive');
      }, 1400);
    }
  }
}

// ================================================================
//  Notes
// ================================================================
function openNotesModal(goalId, tierIdx, questIdx) {
  editingQuestRef = { goalId, tierIdx, questIdx };
  const goal = getGoal(goalId);
  const quest = goal?.tiers[tierIdx]?.quests[questIdx];

  const ta = document.getElementById('notesInput');
  if (ta) ta.value = quest?.notes || '';

  setEl('txt-notes-title', t('notes'));
  setEl('txt-notes-hint', t('notes.hint'));
  setEl('txt-save', t('save'));
  if (ta) ta.placeholder = t('notes.placeholder');

  show('notesOverlay');
  show('notesModal');
  setTimeout(() => ta?.focus(), 80);
}

function closeNotesModal() {
  hide('notesOverlay');
  hide('notesModal');
  editingQuestRef = null;
}

function saveNote() {
  if (!editingQuestRef) return;
  const { goalId, tierIdx, questIdx } = editingQuestRef;
  const goal = getGoal(goalId);
  if (goal) {
    goal.tiers[tierIdx].quests[questIdx].notes =
      (document.getElementById('notesInput')?.value || '').trim();
    saveState();
  }
  closeNotesModal();
  renderMain();
}

// ================================================================
//  Delete
// ================================================================
function openDeleteModal(goalId) {
  deletingGoalId = goalId;
  setEl('txt-delete-heading', t('delete.goal'));
  setEl('txt-delete-confirm', t('delete.confirm'));
  setEl('txt-cancel', t('cancel'));
  setEl('txt-delete', t('delete'));
  show('deleteOverlay');
  show('deleteModal');
}

function closeDeleteModal() {
  deletingGoalId = null;
  hide('deleteOverlay');
  hide('deleteModal');
}

async function confirmDelete() {
  if (!deletingGoalId) return;
  
  try {
    await fetch(`/api/goals/${deletingGoalId}/delete/`, { method: 'DELETE' });
  } catch (err) {
    console.error('Failed to delete from server');
  }
  
  state.goals = state.goals.filter(g => g.id !== deletingGoalId);
  if (currentGoalId === deletingGoalId) currentGoalId = null;
  deletingGoalId = null;
  closeDeleteModal();
  renderSidebar();
  renderMain();
}

// ================================================================
//  Create Goal
// ================================================================
function openCreateGoal() {
  const input = document.getElementById('goalTitleInput');
  if (input) input.value = '';

  setEl('txt-new-goal', t('new.goal'));
  setEl('txt-create', t('create.goal'));
  const inp = document.getElementById('goalTitleInput');
  if (inp) inp.placeholder = t('goal.placeholder');

  show('createGoalOverlay');
  show('createGoalModal');
  setTimeout(() => inp?.focus(), 80);
}

function closeCreateGoal() {
  hide('createGoalOverlay');
  hide('createGoalModal');
}

async function createGoal() {
  const title = (document.getElementById('goalTitleInput')?.value || '').trim();
  if (!title) {
    document.getElementById('goalTitleInput')?.focus();
    return;
  }

  const btn = document.getElementById('createGoalBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner" style="width:18px;height:18px;border-width:2px;margin-right:8px"></div> ${t('generating')}`;
  }

  try {
    const tiers = await callAI(title);
    
    const response = await fetch('/api/goals/create/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, tiers })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save goal');
    }
    
    const data = await response.json();
    const goal = {
      id: data.goal.id,
      title: data.goal.title,
      createdAt: new Date(data.goal.created_at).getTime(),
      status: 'active',
      currentTier: 0,
      tiers: data.goal.tiers
    };
    
    state.goals.push(goal);

    closeCreateGoal();
    currentGoalId = goal.id;
    currentTierIdx = 0;
    renderSidebar();
    renderMain();

  } catch (err) {
    showToast(t('error') + ': ' + (err.message || 'Failed'));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-wand-magic-sparkles" style="margin-right:7px"></i><span id="txt-create">${t('create.goal')}</span>`;
    }
  }
}

// ================================================================
//  AI API - Django Backend
// ================================================================
async function callAI(goalTitle) {
  const p = state.profile;

  const profileContext = {
    name: p.name || '',
    surname: p.surname || '',
    bio: p.bio || '',
    interests: p.interests || ''
  };

  try {
    const response = await fetch('/api/generate-roadmap/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: goalTitle,
        profile: profileContext
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.tiers || !Array.isArray(data.tiers)) {
      throw new Error('Invalid response from server');
    }

    return parseAIResponse(data.tiers);

  } catch (err) {
    console.error('AI Error:', err);
    throw err;
  }
}

function parseAIResponse(tiers) {
  return Array.from({ length: 10 }, (_, i) => {
    const src = tiers[i] || {};
    const rawQ = Array.isArray(src.quests) ? src.quests : [];

    const quests = Array.from({ length: 10 }, (_, j) => {
      const q = rawQ[j];
      const title =
        typeof q === 'string'        ? q :
        typeof q?.title === 'string' ? q.title :
        `Task ${j + 1}`;
      return { title, completed: false, notes: '' };
    });

    return {
      title: typeof src.title === 'string' ? src.title : `Tier ${i + 1}`,
      quests,
    };
  });
}

// ================================================================
//  Profile
// ================================================================
function liveUpdateProfile() {
  const name    = document.getElementById('pf-name')?.value || '';
  const surname = document.getElementById('pf-surname')?.value || '';
  const av = document.getElementById('pf-av');
  if (av) av.textContent = (name[0]||'?').toUpperCase() + (surname[0]||'').toUpperCase();
}

function saveProfile() {
  state.profile = {
    name:      (document.getElementById('pf-name')?.value || '').trim(),
    surname:   (document.getElementById('pf-surname')?.value || '').trim(),
    bio:       (document.getElementById('pf-bio')?.value || '').trim(),
    interests: (document.getElementById('pf-interests')?.value || '').trim(),
  };
  saveState();
  showToast(t('profile.saved'));
  renderSidebar();
}

// ================================================================
//  Show / Hide helpers
// ================================================================
function show(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hide(id) { document.getElementById(id)?.classList.add('hidden'); }