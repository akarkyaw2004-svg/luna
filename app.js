/* ============================================================
   LUNA – app.js  |  Tab-based + Notifications + Settings
   ============================================================ */
'use strict';

/* ── Storage ── */
const store = {
  get: (k, d = null) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

/* ── State ── */
let state = {
  user:     store.get('luna_user', null),
  logs:     store.get('luna_logs', []),
  todayLog: store.get('luna_today', {}),
  syncUrl:  store.get('luna_sync_url', null),
};

/* ── Date helpers ── */
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const addDays = (d, n) => { const dt = new Date(d + 'T00:00:00'); dt.setDate(dt.getDate() + n); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`; };
const diffDays = (a, b) => Math.round((new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')) / 86400000);
const fmt = d => { if (!d) return '–'; return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
const fmtShort = d => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/* ── Cycle Calculation ── */
function cycleInfo() {
  if (!state.user) return null;
  const { lastPeriod, cycleLen, periodLen } = state.user;
  const allStarts = state.logs.map(l => l.start).concat([lastPeriod]).sort((a, b) => b.localeCompare(a));
  const lastStart = allStarts[0];
  const dayOfCycle = diffDays(today(), lastStart) + 1;
  const nextPeriod = addDays(lastStart, cycleLen);
  const daysUntil = diffDays(nextPeriod, today());
  const ovulationDay = cycleLen - 14;
  const fertileStart = ovulationDay - 5;
  const fertileEnd = ovulationDay + 1;

  let phase, phaseIcon, phaseDesc, phaseTips;
  if (dayOfCycle >= 1 && dayOfCycle <= periodLen) {
    phase = 'Menstrual Phase 🌑'; phaseIcon = '🌑';
    phaseDesc = 'Your period is here. Your body is shedding its uterine lining. It\'s okay to rest, be gentle with yourself, and prioritize comfort.';
    phaseTips = ['🛁 Warm baths', '🍫 Dark chocolate', '💤 Extra rest', '🍵 Herbal tea', '🧘 Gentle yoga'];
  } else if (dayOfCycle <= fertileStart) {
    phase = 'Follicular Phase 🌒'; phaseIcon = '🌒';
    phaseDesc = 'Your body is building up energy as follicles mature. You may feel a surge of creativity, optimism, and social energy!';
    phaseTips = ['🏃 Try new workouts', '🎨 Creative projects', '🥗 Fresh, light foods', '💬 Social activities', '📚 Learn something new'];
  } else if (dayOfCycle <= ovulationDay + 1) {
    phase = 'Ovulation Phase 🌕'; phaseIcon = '🌕';
    phaseDesc = 'Peak fertility! Estrogen and LH surge — you\'re at your most radiant and confident. Energy levels are at their highest.';
    phaseTips = ['💪 Intense workouts', '🌟 Important meetings', '💃 Socializing', '🥑 Healthy fats', '💕 Connect with loved ones'];
  } else {
    phase = 'Luteal Phase 🌖'; phaseIcon = '🌖';
    phaseDesc = 'Progesterone rises as your body prepares. You may notice mood shifts or cravings. Focus on self-care and slower activities.';
    phaseTips = ['🧘 Meditation', '📖 Journaling', '🫖 Chamomile tea', '🛌 Prioritize sleep', '🍳 Protein-rich foods'];
  }
  return {
    dayOfCycle, nextPeriod, daysUntil, phase, phaseIcon, phaseDesc, phaseTips,
    ovulationDay, fertileStart, fertileEnd, lastStart, cycleLen, periodLen
  };
}

function avgCycleLength() {
  if (state.logs.length < 2) return state.user?.cycleLen || 28;
  const s = [...state.logs].sort((a, b) => a.start.localeCompare(b.start));
  let t = 0;
  for (let i = 1; i < s.length; i++) t += diffDays(s[i].start, s[i - 1].start);
  return Math.round(t / (s.length - 1));
}

function avgPeriodLength() {
  const v = state.logs.filter(l => l.end);
  if (!v.length) return state.user?.periodLen || 5;
  return Math.round(v.reduce((a, l) => a + diffDays(l.end, l.start) + 1, 0) / v.length);
}

/* ── Navigation ── */
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link, .bn-item').forEach(l => l.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelectorAll(`[data-page="${page}"]`).forEach(el => el.classList.add('active'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (page === 'calendar') renderCalendar();
  if (page === 'insights') renderInsights();
}

document.querySelectorAll('.nav-link, .bn-item').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    navigate(link.dataset.page);
  });
});

/* ── Toast ── */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

/* ── Greeting ── */
function greeting() {
  const h = new Date().getHours();
  const name = state.user?.name ? `, ${state.user.name}` : '';
  if (h < 12) return `Good morning${name} 🌸`;
  if (h < 17) return `Good afternoon${name} 💕`;
  return `Good evening${name} 🌙`;
}

/* ── Dashboard ── */
function initDashboard() {
  if (!state.user) { showSetup(); return; }
  if (state.todayLog?.date !== today()) {
    state.todayLog = { date: today(), moods: [], symptoms: [] };
    store.set('luna_today', state.todayLog);
  }
  document.getElementById('heroGreeting').textContent = greeting();
  const info = cycleInfo();
  if (!info) return;

  const pct = Math.min(info.dayOfCycle / info.cycleLen, 1);
  document.getElementById('ringProgress').style.strokeDashoffset = 502 * (1 - pct);
  document.getElementById('ringDay').textContent = info.dayOfCycle;

  document.getElementById('heroSub').textContent = info.daysUntil <= 0
    ? 'Your period may have started today 🌹'
    : info.daysUntil === 1
      ? 'Your period is expected tomorrow 🌸'
      : `Day ${info.dayOfCycle} of your cycle — you're doing amazing 💕`;

  document.getElementById('nextPeriodVal').textContent = info.daysUntil <= 0 ? 'Today' : `In ${info.daysUntil} days`;
  document.getElementById('phaseVal').textContent = info.phase.replace(/\s\S+$/, '');
  document.getElementById('phaseIcon').textContent = info.phaseIcon;
  const fs = addDays(info.lastStart, info.fertileStart);
  const fe = addDays(info.lastStart, info.fertileEnd);
  document.getElementById('fertileVal').textContent = `${fmtShort(fs)} – ${fmtShort(fe)}`;
  document.getElementById('cycleLenVal').textContent = `${avgCycleLength()} days`;

  document.getElementById('phaseName').textContent = info.phase;
  document.getElementById('phaseDesc').textContent = info.phaseDesc;
  document.getElementById('phaseTips').innerHTML = info.phaseTips.map(t => `<li>${t}</li>`).join('');

  restoreTodaySelections();
}

/* ── Mood & Symptom toggles ── */
document.querySelectorAll('.mood-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const m = btn.dataset.mood, arr = state.todayLog.moods || [];
    if (arr.includes(m)) { state.todayLog.moods = arr.filter(x => x !== m); btn.classList.remove('selected'); }
    else { arr.push(m); state.todayLog.moods = arr; btn.classList.add('selected'); }
  });
});

document.querySelectorAll('.symptom-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const s = btn.dataset.sym, arr = state.todayLog.symptoms || [];
    if (arr.includes(s)) { state.todayLog.symptoms = arr.filter(x => x !== s); btn.classList.remove('selected'); }
    else { arr.push(s); state.todayLog.symptoms = arr; btn.classList.add('selected'); }
  });
});

document.getElementById('saveTodayBtn').addEventListener('click', () => {
  store.set('luna_today', state.todayLog);
  const all = store.get('luna_day_logs', {});
  all[today()] = state.todayLog;
  store.set('luna_day_logs', all);
  showToast('Today\'s log saved! 💕✨');
  pushToCloud();
});

function restoreTodaySelections() {
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.toggle('selected', state.todayLog.moods?.includes(b.dataset.mood)));
  document.querySelectorAll('.symptom-btn').forEach(b => b.classList.toggle('selected', state.todayLog.symptoms?.includes(b.dataset.sym)));
}

/* ── Calendar ── */
let calDate = new Date();

function renderCalendar() {
  const yr = calDate.getFullYear(), mo = calDate.getMonth();
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('calMonthTitle').textContent = `${MONTHS[mo]} ${yr}`;
  const firstDay = new Date(yr, mo, 1).getDay();
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const periodDays = new Set(), fertileDays = new Set(), ovulDays = new Set(), predDays = new Set();

  if (state.user) {
    const info = cycleInfo();
    if (info) {
      state.logs.forEach(l => {
        const end = l.end || addDays(l.start, info.periodLen - 1);
        let d = l.start;
        while (d <= end) { periodDays.add(d); d = addDays(d, 1); }
      });
      let predStart = info.nextPeriod;
      for (let c = 0; c < 4; c++) {
        let d = predStart, pe = addDays(predStart, info.periodLen - 1);
        while (d <= pe) { predDays.add(d); d = addDays(d, 1); }
        predStart = addDays(predStart, info.cycleLen);
      }
      [-info.cycleLen, 0, info.cycleLen].forEach(off => {
        const base = addDays(info.lastStart, off);
        for (let i = info.fertileStart; i <= info.fertileEnd; i++) fertileDays.add(addDays(base, i));
        ovulDays.add(addDays(base, info.cycleLen - 14));
      });
    }
  }

  const td = today();
  let html = '';
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-day empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    let cls = 'cal-day';
    if (ds === td) cls += ' today';
    if (ovulDays.has(ds)) cls += ' ovulation';
    else if (fertileDays.has(ds)) cls += ' fertile';
    if (periodDays.has(ds)) cls += ' period';
    if (predDays.has(ds) && !periodDays.has(ds)) cls += ' predicted';
    html += `<div class="${cls}">${d}</div>`;
  }
  document.getElementById('calDays').innerHTML = html;
}

document.getElementById('calPrev').addEventListener('click', () => { calDate.setMonth(calDate.getMonth() - 1); renderCalendar(); });
document.getElementById('calNext').addEventListener('click', () => { calDate.setMonth(calDate.getMonth() + 1); renderCalendar(); });

/* ── Log Period ── */
document.getElementById('logPeriodBtn').addEventListener('click', () => {
  const start = document.getElementById('startDateInput').value;
  const end = document.getElementById('endDateInput').value;
  const flow = document.getElementById('flowSelect').value;
  const note = document.getElementById('noteInput').value.trim();
  if (!start) { showToast('Please enter your period start date! 💕'); return; }

  const entry = { id: Date.now(), start, end: end || null, flow, note };
  state.logs.unshift(entry);
  store.set('luna_logs', state.logs);
  if (!state.user.lastPeriod || start > state.user.lastPeriod) {
    state.user.lastPeriod = start;
    store.set('luna_user', state.user);
  }
  document.getElementById('startDateInput').value = '';
  document.getElementById('endDateInput').value = '';
  document.getElementById('noteInput').value = '';
  renderLogHistory();
  initDashboard();
  showToast('Period logged successfully! 🌸');
  pushToCloud();
});

function renderLogHistory() {
  const list = document.getElementById('logList');
  if (!state.logs.length) { list.innerHTML = '<p class="empty-msg">No periods logged yet. Start by logging above! 💕</p>'; return; }
  const fe = { light: '🩸', medium: '🩸🩸', heavy: '🩸🩸🩸' };
  list.innerHTML = state.logs.map(l => `
    <div class="log-item">
      <div class="log-item-icon">🌹</div>
      <div class="log-item-info">
        <div class="log-item-date">${fmt(l.start)} ${l.end ? `→ ${fmt(l.end)}` : '(ongoing)'}</div>
        <div class="log-item-meta">${fe[l.flow] || '🩸'} ${l.flow?.charAt(0).toUpperCase() + l.flow?.slice(1)} flow${l.end ? ` · ${diffDays(l.end, l.start) + 1} days` : ''}${l.note ? ` · "${l.note}"` : ''}
        </div>
      </div>
      <button class="log-item-delete" onclick="deleteLog(${l.id})" aria-label="Delete">🗑️</button>
    </div>
  `).join('');
}

window.deleteLog = id => {
  state.logs = state.logs.filter(l => l.id !== id);
  store.set('luna_logs', state.logs);
  
  // 💡 Add deleted ID tracking for sync
  const deletedIds = store.get('luna_deleted_logs', []);
  if (!deletedIds.includes(id)) deletedIds.push(id);
  store.set('luna_deleted_logs', deletedIds);

  renderLogHistory();
  initDashboard();
  showToast('Log removed.');
  pushToCloud();
};

/* ── Insights ── */
function renderInsights() {
  const avgCyc = avgCycleLength(), avgPer = avgPeriodLength();
  document.getElementById('avgCycleIns').textContent = `${avgCyc} days`;
  document.getElementById('avgPeriodIns').textContent = `${avgPer} days`;
  document.getElementById('totalCyclesIns').textContent = state.logs.length;

  let reg = '–';
  if (state.logs.length >= 2) {
    const s = [...state.logs].sort((a, b) => a.start.localeCompare(b.start));
    const lens = []; for (let i = 1; i < s.length; i++) lens.push(diffDays(s[i].start, s[i - 1].start));
    const v = lens.reduce((a, l) => a + Math.abs(l - avgCyc), 0) / lens.length;
    reg = v <= 2 ? '🌟 Very Regular' : v <= 5 ? '✅ Regular' : v <= 8 ? '⚠️ Somewhat Irregular' : '🔄 Irregular';
  }
  document.getElementById('regularityIns').textContent = reg;

  const bc = document.getElementById('barChart');
  const sl = [...state.logs].sort((a, b) => a.start.localeCompare(b.start));
  if (sl.length < 2) { bc.innerHTML = '<p class="empty-msg">Log at least 2 periods to see your cycle history 📈</p>'; }
  else {
    const items = []; for (let i = 1; i < sl.length; i++) items.push({ l: fmtShort(sl[i].start), v: diffDays(sl[i].start, sl[i - 1].start) });
    const mx = Math.max(...items.map(x => x.v), 35);
    bc.innerHTML = items.map(it => `<div class="bar-item"><div class="bar-fill" style="height:${(it.v / mx) * 100}px" data-val="${it.v}d"></div><div class="bar-label">${it.l}</div></div>`).join('');
  }

  const sc = {}, mc = {};
  const symLabels = { cramps: '🔴 Cramps', headache: '🤕 Headache', bloating: '💨 Bloating', backpain: '🫀 Back Pain', spotting: '💧 Spotting', acne: '✨ Acne', tender: '🩷 Breast Tenderness', cravings: '🍫 Cravings' };
  const all = store.get('luna_day_logs', {});
  Object.values(all).forEach(dl => {
    (dl.symptoms || []).forEach(s => sc[s] = (sc[s] || 0) + 1);
    (dl.moods || []).forEach(m => mc[m] = (mc[m] || 0) + 1);
  });
  (state.todayLog?.symptoms || []).forEach(s => sc[s] = (sc[s] || 0) + 1);
  (state.todayLog?.moods || []).forEach(m => mc[m] = (mc[m] || 0) + 1);

  const se = document.getElementById('symptomBubbles'), sorted = Object.entries(sc).sort((a, b) => b[1] - a[1]);
  se.innerHTML = sorted.length ? sorted.map(([s, c]) => `<span class="bubble sym">${symLabels[s] || s} <strong>×${c}</strong></span>`).join('') : '<p class="empty-msg">Log some symptoms to see your patterns! 🌷</p>';
  const me = document.getElementById('moodBubbles'), sortedM = Object.entries(mc).sort((a, b) => b[1] - a[1]);
  me.innerHTML = sortedM.length ? sortedM.map(([m, c]) => `<span class="bubble mood">${m} <strong>×${c}</strong></span>`).join('') : '<p class="empty-msg">Log some moods to see your patterns! 🌷</p>';
}

/* ── Setup Modal ── */
const setupModal = document.getElementById('setupModal');
function showSetup() { setupModal.classList.remove('hidden'); }
function hideSetup() { setupModal.classList.add('hidden'); }

document.getElementById('setupSaveBtn').addEventListener('click', () => {
  const name = document.getElementById('setupName').value.trim() || 'Beautiful';
  const lastPeriod = document.getElementById('setupLastPeriod').value;
  const cycleLen = parseInt(document.getElementById('setupCycleLen').value) || 28;
  const periodLen = parseInt(document.getElementById('setupPeriodLen').value) || 5;
  if (!lastPeriod) { showToast('Please enter your last period start date! 💕'); return; }
  state.user = { name, lastPeriod, cycleLen, periodLen };
  store.set('luna_user', state.user);
  hideSetup();
  initDashboard();
  showToast(`Welcome to Luna, ${name}! 🌙✨`);
});

/* ── Settings Modal ── */
const settingsModal = document.getElementById('settingsModal');
function openSettings() {
  if (!state.user) return;
  document.getElementById('editName').value = state.user.name || '';
  document.getElementById('editLastPeriod').value = state.user.lastPeriod || '';
  document.getElementById('editCycleLen').value = state.user.cycleLen || 28;
  document.getElementById('editPeriodLen').value = state.user.periodLen || 5;
  document.getElementById('editSyncUrl').value = state.syncUrl || '';
  settingsModal.classList.remove('hidden');
}
function closeSettings() { settingsModal.classList.add('hidden'); }

document.getElementById('navAvatar').addEventListener('click', openSettings);
document.getElementById('settingsCancelBtn').addEventListener('click', closeSettings);
settingsModal.addEventListener('click', e => { if (e.target === settingsModal) closeSettings(); });

document.getElementById('settingsSaveBtn').addEventListener('click', async () => {
  const name = document.getElementById('editName').value.trim() || 'Beautiful';
  const lastPeriod = document.getElementById('editLastPeriod').value;
  const cycleLen = parseInt(document.getElementById('editCycleLen').value) || 28;
  const periodLen = parseInt(document.getElementById('editPeriodLen').value) || 5;
  const syncUrl = document.getElementById('editSyncUrl').value.trim();
  if (!lastPeriod) { showToast('Please enter your last period start date! 💕'); return; }
  
  // ✅ Save to state + localStorage immediately
  state.user = { name, lastPeriod, cycleLen, periodLen };
  store.set('luna_user', state.user);
  
  const oldSyncUrl = state.syncUrl;
  state.syncUrl = syncUrl || null;
  if (state.syncUrl) {
    store.set('luna_sync_url', state.syncUrl);
  } else {
    localStorage.removeItem('luna_sync_url');
  }
  
  closeSettings();
  // ✅ FIX: Always call initDashboard() AFTER all changes so dates/stats update immediately
  initDashboard();
  renderLogHistory();
  showToast(`Settings saved! Hey ${name} 🌙✨`);
  
  if (state.syncUrl && state.syncUrl !== oldSyncUrl) {
    // New sync URL — try to pull cloud data first
    updateSyncStatus('Connecting...');
    const success = await fetchCloudData();
    if (success) {
      state.user = store.get('luna_user', state.user);
      state.logs = store.get('luna_logs', state.logs);
      state.todayLog = store.get('luna_today', state.todayLog);
      initDashboard();
      renderLogHistory();
      showToast('Connected to Cloud Sync & data updated! ☁️✨');
    } else {
      pushToCloud();
    }
  } else if (!state.syncUrl) {
    updateSyncStatus('');
  } else {
    pushToCloud();
  }
});

document.getElementById('resetDataBtn').addEventListener('click', () => {
  if (!confirm('Delete ALL data? This cannot be undone.')) return;
  ['luna_user', 'luna_logs', 'luna_today', 'luna_day_logs', 'luna_reminder_sent_for', 'luna_notif_prompt_shown', 'luna_sync_url'].forEach(k => localStorage.removeItem(k));
  state.user = null; state.logs = []; state.todayLog = {}; state.syncUrl = null;
  updateSyncStatus('');
  closeSettings(); renderLogHistory(); showSetup();
  showToast('Reset complete 🌱');
});

/* ════════════════════════════════════
   🌹 NOTIFICATION SYSTEM
════════════════════════════════════ */
const ROMANTIC = [
  "Your body is preparing for its monthly rhythm 🌹 Rest a little more, drink warm tea, and let me take care of you…",
  "In 2 days, your period is arriving, my love 💕 Please be extra gentle with yourself — you deserve all the comfort in the world.",
  "Just a soft reminder that your period is coming soon 🌸 Stock up on your favorite chocolates and let yourself rest.",
  "Your cycle is about to begin, sweetheart 🌙 Your strength amazes me every month. I'm here for every cramp and every mood.",
  "Hey beautiful 💗 Your period is just 2 days away. Warm baths, cozy blankets, and me by your side — that's the plan.",
  "A little reminder from the moon 🌕 Your body is doing something incredible. Take it easy, my darling.",
  "Two more days, love 🫶 Your body is a wonder. Let yourself be taken care of — you've earned it.",
  "Your rhythm is so beautifully predictable 🌺 In 2 days, your period begins. I'll make sure you have everything you need.",
  "Gentle reminder 💌 Your period is approaching. Time to slow down, breathe deep, and let yourself be loved.",
  "The moon knows your cycle by heart 🌙✨ Your period is 2 days away, my dearest. Be soft with yourself.",
  "My love, your period is coming in 2 days 🌷 Let's get cozy, order your favorite food, and cuddle all day if needed.",
  "You are so in tune with your body 💫 A reminder that your period is arriving soon — treat yourself royally.",
  "Darling, 2 days until your period 🌹 Your body is incredible and so are you. Let's make these days extra comfortable.",
  "A whisper from Luna 🌙 Your period is approaching, beautiful. Be kind to yourself — you are so loved.",
  "Your body is preparing for renewal 🌸 2 days to go, my love. Rest, hydrate, and let me spoil you.",
  "Hey you 💕 Just a reminder that your period is 2 days away. You handle this every month with such grace.",
  "The stars have noted it 🌟 Your period arrives in 2 days. Warm hugs and hot water bottles are on their way.",
  "Your cycle is like the moon — beautiful and powerful 🌕 In 2 days, your period begins. I'm here for you always.",
  "Precious reminder 💗 Your period is coming in 2 days. You are magnificent, even on the hard days.",
  "Two days, my love 🩷 Your body is wise and wonderful. Let me take care of you as your period approaches.",
  "A love note from your Luna app 💌 Your period is 2 days away. Today is a good day for self-care and extra rest.",
  "Your monthly cycle is nature's poetry 🌺 2 more days, sweetheart. Treat your body like the treasure it is.",
  "Hey gorgeous 🌸 Your period is arriving in 2 days. Stock up on comfort — you deserve the softest days.",
  "The universe is in sync with you 🌙 Your period comes in 2 days. Give yourself grace and extra love.",
  "My darling 💕 In 2 days your period will begin. Remember: rest is productive. You are so deeply loved.",
  "A tender reminder 🌷 Your period is 2 days away. Drink more water, eat what you crave, and be gentle with your heart.",
  "You are cyclical, powerful, and magical 🌕 Your period arrives in 2 days. Honor yourself completely.",
  "Sweet reminder 🫶 Your period is almost here. In 2 days — cozy socks, warm tea, and all the love in the world.",
  "Your body speaks and Luna listens 🌙 Period in 2 days, love. Let today be filled with softness and care.",
  "A rose petal note from Luna 🌹 Your period is 2 days away. You are beautiful in every phase of your cycle."
];

const randRomantic = () => ROMANTIC[Math.floor(Math.random() * ROMANTIC.length)];

async function registerSW() {
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('service-worker.js'); } catch (e) { /* needs https */ }
  }
}

async function requestNotifPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  return await Notification.requestPermission();
}

async function sendBrowserNotif(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) { reg.showNotification(title, { body, tag: 'luna-period', renotify: true, requireInteraction: true, vibrate: [300, 100, 300] }); return; }
  }
  new Notification(title, { body });
}

function showReminderBanner(msg, days) {
  const banner = document.getElementById('reminderBanner');
  if (!banner) return;
  const emojis = ['🌹', '💕', '🌸', '🌙', '💗', '🌺', '🩷', '💌', '🌷', '🫶'];
  document.getElementById('reminderEmoji').textContent = emojis[Math.floor(Math.random() * emojis.length)];
  document.getElementById('reminderTitle').textContent = days === 2 ? '💌 Period Reminder — 2 Days Away' : '🌹 Your Period is Almost Here';
  document.getElementById('reminderMsg').textContent = msg;
  banner.classList.remove('hidden');
  requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('show')));
}

document.getElementById('reminderClose').addEventListener('click', () => {
  const b = document.getElementById('reminderBanner');
  b.classList.remove('show');
  setTimeout(() => b.classList.add('hidden'), 500);
  sessionStorage.setItem('luna_reminder_dismissed', today());
});

function showNotifPromptCard() {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'default') return;
  if (store.get('luna_notif_prompt_shown')) return;
  const grid = document.querySelector('.stats-grid');
  if (!grid || document.getElementById('notifPromptCard')) return;
  const card = document.createElement('div');
  card.className = 'notif-prompt'; card.id = 'notifPromptCard';
  card.innerHTML = `<div class="notif-prompt-text"><strong>🔔 Enable Period Reminders</strong>Get a romantic notification 2 days before your period.</div><button class="notif-allow-btn" id="notifAllowBtn">Allow 💕</button>`;
  grid.insertAdjacentElement('beforebegin', card);
  document.getElementById('notifAllowBtn').addEventListener('click', async () => {
    const r = await requestNotifPermission();
    card.remove(); store.set('luna_notif_prompt_shown', true);
    showToast(r === 'granted' ? 'Reminders enabled! 💕' : 'You\'ll still see in-app reminders 🌸');
    if (r === 'granted') await registerSW();
  });
}

async function checkReminder() {
  if (!state.user) return;
  const info = cycleInfo(); if (!info) return;
  if (info.daysUntil !== 2 && info.daysUntil !== 1) return;
  if (sessionStorage.getItem('luna_reminder_dismissed') === today()) return;
  if (store.get('luna_reminder_sent_for') === info.nextPeriod) return;
  const sentence = randRomantic();
  store.set('luna_reminder_sent_for', info.nextPeriod);
  showReminderBanner(sentence, info.daysUntil);
  const title = info.daysUntil === 2 ? '🌹 Luna — Period in 2 Days, My Love' : '🌸 Luna — Your Period is Tomorrow';
  await sendBrowserNotif(title, sentence.replace(/[🌹💕🌸🌙💗🌺🩷💌🌷🫶💫🌕🌟]/gu, '').trim());
}

/* ════════════════════════════════════
   ☁️ CLOUD SYNC SYSTEM
════════════════════════════════════ */
function updateSyncStatus(statusText) {
  const el = document.getElementById('cloudStatus');
  if (!el) return;
  if (!state.syncUrl) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'inline-flex';
  el.textContent = statusText;
}

async function fetchCloudData() {
  if (!state.syncUrl) return false;
  updateSyncStatus('Fetching... ☁️');
  try {
    const response = await fetch(state.syncUrl);
    if (response.ok) {
      const text = await response.text();
      if (!text) { updateSyncStatus('Sync Empty ☁️'); return false; }
      const cloudState = JSON.parse(text);
      if (cloudState && (cloudState.user || cloudState.logs)) {
        
        // 1. Handle deleted IDs
        const cloudDeletedIds = cloudState.deletedIds || [];
        const localDeletedIds = store.get('luna_deleted_logs', []);
        const allDeletedIds = [...new Set([...localDeletedIds, ...cloudDeletedIds])];
        store.set('luna_deleted_logs', allDeletedIds);

        // 2. Merge logs safely (Cloud + Local, minus deleted)
        const localLogs = store.get('luna_logs', []);
        const cloudLogs = cloudState.logs || [];
        const mergedLogsMap = new Map();
        cloudLogs.forEach(l => mergedLogsMap.set(l.id, l));
        localLogs.forEach(l => mergedLogsMap.set(l.id, l));
        allDeletedIds.forEach(id => mergedLogsMap.delete(id)); // Remove deleted
        state.logs = Array.from(mergedLogsMap.values()).sort((a,b) => b.id - a.id);

        // 3. Merge User Data (Local wins if conflict)
        state.user = cloudState.user || state.user;
        
        // 4. Merge dayLogs (Combine objects, local overwrites cloud if same date)
        const localDayLogs = store.get('luna_day_logs', {});
        const cloudDayLogs = cloudState.dayLogs || {};
        store.set('luna_day_logs', { ...cloudDayLogs, ...localDayLogs });

        // 5. Merge todayLog
        const localTodayLog = store.get('luna_today', {});
        const cloudTodayLog = cloudState.todayLog || {};
        if (localTodayLog.date === today() && cloudTodayLog.date === today()) {
           state.todayLog = {
               date: today(),
               moods: [...new Set([...(localTodayLog.moods||[]), ...(cloudTodayLog.moods||[])])],
               symptoms: [...new Set([...(localTodayLog.symptoms||[]), ...(cloudTodayLog.symptoms||[])])]
           };
        } else if (localTodayLog.date === today()) {
           state.todayLog = localTodayLog;
        } else if (cloudTodayLog.date === today()) {
           state.todayLog = cloudTodayLog;
        }

        // Save everything to Local Storage
        store.set('luna_user', state.user);
        store.set('luna_logs', state.logs);
        store.set('luna_today', state.todayLog);
        
        updateSyncStatus('Cloud Synced ☁️');
        return true;
      }
    }
    updateSyncStatus('Sync Empty ☁️');
  } catch (e) {
    updateSyncStatus('Sync Offline 🔌');
    console.error('Fetch cloud data error:', e);
  }
  return false;
}

async function pushToCloud() {
  if (!state.syncUrl) return;
  updateSyncStatus('Syncing... ☁️');
  try {
    // 💡 Push local data directly — do NOT pre-fetch (that would overwrite local changes)
    const payload = {
      user: state.user,
      logs: state.logs,
      todayLog: state.todayLog,
      dayLogs: store.get('luna_day_logs', {}),
      deletedIds: store.get('luna_deleted_logs', [])
    };
    const response = await fetch(state.syncUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'text/plain' }
    });
    if (response.ok) {
      updateSyncStatus('Cloud Synced ☁️');
    } else {
      updateSyncStatus('Sync Failed ⚠️');
    }
  } catch (e) {
    updateSyncStatus('Sync Offline 🔌');
    console.error('Push to cloud error:', e);
  }
}

/* ── Sync Guide Modal Event Listeners ── */
const syncGuideModal = document.getElementById('syncGuideModal');
document.getElementById('syncGuideBtn').addEventListener('click', e => {
  e.preventDefault();
  syncGuideModal.classList.remove('hidden');
});
document.getElementById('syncGuideCloseBtn').addEventListener('click', () => {
  syncGuideModal.classList.add('hidden');
});
syncGuideModal.addEventListener('click', e => {
  if (e.target === syncGuideModal) syncGuideModal.classList.add('hidden');
});

/* ── Splash Screen ── */
function hideSplash() {
  const splash = document.getElementById('splashScreen');
  if (!splash) return;
  splash.classList.add('hide');
  setTimeout(() => splash.classList.add('gone'), 650);
}

/* ── Boot ── */
async function boot() {
  // Start splash timer (minimum 2.2s so user can see it)
  const splashTimer = new Promise(r => setTimeout(r, 2200));

  document.getElementById('startDateInput').value = today();
  document.getElementById('endDateInput').value = today();
  document.getElementById('setupLastPeriod').value = today();
  await registerSW();

  // ✅ FIX: Fetch cloud data FIRST, then decide whether to show setup or dashboard
  if (state.syncUrl) {
    updateSyncStatus('Syncing...');
    await fetchCloudData();
  }

  // Re-read from localStorage after cloud fetch (state may have been updated)
  state.user = store.get('luna_user', null);
  state.logs = store.get('luna_logs', []);
  state.todayLog = store.get('luna_today', {});

  renderLogHistory();

  if (!state.user) {
    showSetup();
  } else {
    hideSetup();
    initDashboard();
    showNotifPromptCard();
    setTimeout(checkReminder, 800);
  }

  // Wait for minimum splash time, then hide
  await splashTimer;
  hideSplash();
}

boot();

// 💡 Auto-Sync when the user opens the app or switches back to the tab
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.syncUrl) {
    fetchCloudData().then(updated => {
      if (updated) {
        if (state.user) initDashboard();
        renderLogHistory();
        if (document.getElementById('page-calendar')?.classList.contains('active')) renderCalendar();
        if (document.getElementById('page-insights')?.classList.contains('active')) renderInsights();
      }
    });
  }
});
