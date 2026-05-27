/* ============================================================
   LUNA – app.js  |  Menstrual Cycle Tracker Logic
   ============================================================ */

'use strict';

/* ── Storage Helpers ── */
const store = {
  get: (k, def = null) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

/* ── App State ── */
let state = {
  user: store.get('luna_user', null),       // { name, lastPeriod, cycleLen, periodLen }
  logs: store.get('luna_logs', []),          // [{ start, end, flow, note }]
  todayLog: store.get('luna_today', {}),     // { date, moods:[], symptoms:[] }
};

/* ── Date Helpers ── */
const today = () => new Date().toISOString().split('T')[0];
const addDays = (dateStr, n) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};
const diffDays = (a, b) => Math.round((new Date(a) - new Date(b)) / 86400000);
const fmt = (dateStr) => {
  if (!dateStr) return '–';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const fmtShort = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/* ── Cycle Calculation ── */
function cycleInfo() {
  if (!state.user) return null;
  const { lastPeriod, cycleLen, periodLen } = state.user;

  // Find most recent period start from logs or from user setup
  const allStarts = state.logs.map(l => l.start).concat([lastPeriod]).sort((a, b) => b.localeCompare(a));
  const lastStart = allStarts[0];

  const dayOfCycle = diffDays(today(), lastStart) + 1;
  const nextPeriod = addDays(lastStart, cycleLen);
  const daysUntil  = diffDays(nextPeriod, today());

  // Ovulation ~14 days before end of cycle
  const ovulationDay = cycleLen - 14;
  const fertileStart = ovulationDay - 5;
  const fertileEnd   = ovulationDay + 1;

  // Phase
  let phase, phaseIcon, phaseDesc, phaseTips;
  if (dayOfCycle >= 1 && dayOfCycle <= periodLen) {
    phase = 'Menstrual Phase 🌑';
    phaseIcon = '🌑';
    phaseDesc = 'Your period is here. Your body is shedding its uterine lining. It\'s okay to rest, be gentle with yourself, and prioritize comfort.';
    phaseTips = ['🛁 Warm baths', '🍫 Dark chocolate', '💤 Extra rest', '🍵 Herbal tea', '🧘 Gentle yoga'];
  } else if (dayOfCycle <= fertileStart) {
    phase = 'Follicular Phase 🌒';
    phaseIcon = '🌒';
    phaseDesc = 'Your body is building up energy as follicles mature. You may feel a surge of creativity, optimism, and social energy!';
    phaseTips = ['🏃 Try new workouts', '🎨 Creative projects', '🥗 Fresh, light foods', '💬 Social activities', '📚 Learn something new'];
  } else if (dayOfCycle <= ovulationDay + 1) {
    phase = 'Ovulation Phase 🌕';
    phaseIcon = '🌕';
    phaseDesc = 'Peak fertility! Estrogen and LH surge, you\'re at your most radiant and confident. Energy levels are at their highest.';
    phaseTips = ['💪 Intense workouts', '🌟 Important meetings', '💃 Socializing', '🥑 Healthy fats', '💕 Connect with loved ones'];
  } else {
    phase = 'Luteal Phase 🌖';
    phaseIcon = '🌖';
    phaseDesc = 'Progesterone rises as your body prepares. You may notice mood shifts or cravings. Focus on self-care and slower activities.';
    phaseTips = ['🧘 Meditation', '📖 Journaling', '🫖 Chamomile tea', '🛌 Prioritize sleep', '🍳 Protein-rich foods'];
  }

  return { dayOfCycle, nextPeriod, daysUntil, phase, phaseIcon, phaseDesc, phaseTips,
           ovulationDay, fertileStart, fertileEnd, lastStart, cycleLen, periodLen };
}

function avgCycleLength() {
  if (state.logs.length < 2) return state.user?.cycleLen || 28;
  const sorted = [...state.logs].sort((a,b) => a.start.localeCompare(b.start));
  let total = 0, count = 0;
  for (let i = 1; i < sorted.length; i++) {
    total += diffDays(sorted[i].start, sorted[i-1].start);
    count++;
  }
  return Math.round(total / count);
}

function avgPeriodLength() {
  const valid = state.logs.filter(l => l.end);
  if (!valid.length) return state.user?.periodLen || 5;
  return Math.round(valid.reduce((acc, l) => acc + diffDays(l.end, l.start) + 1, 0) / valid.length);
}

/* ── Navigation ── */
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  if (page === 'calendar') renderCalendar();
  if (page === 'insights') renderInsights();
}

document.querySelectorAll('.nav-link').forEach(link => {
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
  const name = state.user?.name ? `, ${state.user.name}` : ', Beautiful';
  if (h < 12) return `Good morning${name} 🌸`;
  if (h < 17) return `Good afternoon${name} 💕`;
  return `Good evening${name} 🌙`;
}

/* ── Setup Modal ── */
const setupModal = document.getElementById('setupModal');

function showSetup() { setupModal.classList.remove('hidden'); }
function hideSetup() { setupModal.classList.add('hidden'); }

document.getElementById('setupSaveBtn').addEventListener('click', () => {
  const name       = document.getElementById('setupName').value.trim() || 'Beautiful';
  const lastPeriod = document.getElementById('setupLastPeriod').value;
  const cycleLen   = parseInt(document.getElementById('setupCycleLen').value) || 28;
  const periodLen  = parseInt(document.getElementById('setupPeriodLen').value) || 5;

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
  // Pre-fill current values
  document.getElementById('editName').value       = state.user.name       || '';
  document.getElementById('editLastPeriod').value = state.user.lastPeriod || '';
  document.getElementById('editCycleLen').value   = state.user.cycleLen   || 28;
  document.getElementById('editPeriodLen').value  = state.user.periodLen  || 5;
  settingsModal.classList.remove('hidden');
}

function closeSettings() {
  settingsModal.classList.add('hidden');
}

// Open on avatar click
document.getElementById('navAvatar').addEventListener('click', openSettings);

// Save changes
document.getElementById('settingsSaveBtn').addEventListener('click', () => {
  const name       = document.getElementById('editName').value.trim() || 'Beautiful';
  const lastPeriod = document.getElementById('editLastPeriod').value;
  const cycleLen   = parseInt(document.getElementById('editCycleLen').value) || 28;
  const periodLen  = parseInt(document.getElementById('editPeriodLen').value) || 5;

  if (!lastPeriod) { showToast('Please enter your last period start date! 💕'); return; }

  state.user = { name, lastPeriod, cycleLen, periodLen };
  store.set('luna_user', state.user);
  closeSettings();
  initDashboard();
  showToast(`Settings saved! Welcome back, ${name} 🌙✨`);
});

// Cancel
document.getElementById('settingsCancelBtn').addEventListener('click', closeSettings);

// Close on backdrop click
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) closeSettings();
});

// Reset All Data
document.getElementById('resetDataBtn').addEventListener('click', () => {
  const confirmed = confirm('⚠️ This will delete ALL your data (logs, settings, moods). Are you sure?');
  if (!confirmed) return;
  localStorage.removeItem('luna_user');
  localStorage.removeItem('luna_logs');
  localStorage.removeItem('luna_today');
  localStorage.removeItem('luna_day_logs');
  state.user     = null;
  state.logs     = [];
  state.todayLog = {};
  closeSettings();
  renderLogHistory();
  showSetup();
  showToast('All data reset. Starting fresh! 🌱');
});

/* ── Dashboard Init ── */
function initDashboard() {
  if (!state.user) { showSetup(); return; }

  // Today's log reset
  if (state.todayLog?.date !== today()) {
    state.todayLog = { date: today(), moods: [], symptoms: [] };
    store.set('luna_today', state.todayLog);
  }

  document.getElementById('heroGreeting').textContent = greeting();

  const info = cycleInfo();
  if (!info) return;

  // Ring
  const pct = Math.min(info.dayOfCycle / info.cycleLen, 1);
  const circumference = 2 * Math.PI * 80;
  document.getElementById('ringProgress').style.strokeDashoffset = circumference * (1 - pct);
  document.getElementById('ringDay').textContent = info.dayOfCycle;

  // Hero sub
  if (info.daysUntil <= 0) {
    document.getElementById('heroSub').textContent = 'Your period may have started today 🌹';
  } else if (info.daysUntil === 1) {
    document.getElementById('heroSub').textContent = 'Your period is expected tomorrow 🌸';
  } else {
    document.getElementById('heroSub').textContent = `Day ${info.dayOfCycle} of your cycle — you're doing amazing 💕`;
  }

  // Stats
  document.getElementById('nextPeriodVal').textContent = info.daysUntil <= 0 ? 'Today' : `In ${info.daysUntil} days`;
  document.getElementById('phaseVal').textContent = info.phase.replace(/\s[^\s]+$/, '');
  document.getElementById('phaseIcon').textContent = info.phaseIcon;

  const fertileStartDate = addDays(info.lastStart, info.fertileStart);
  const fertileEndDate   = addDays(info.lastStart, info.fertileEnd);
  document.getElementById('fertileVal').textContent = `${fmtShort(fertileStartDate)} – ${fmtShort(fertileEndDate)}`;
  document.getElementById('cycleLenVal').textContent = `${avgCycleLength()} days`;

  // Phase card
  document.getElementById('phaseName').textContent = info.phase;
  document.getElementById('phaseDesc').textContent = info.phaseDesc;
  const tipsList = document.getElementById('phaseTips');
  tipsList.innerHTML = info.phaseTips.map(t => `<li>${t}</li>`).join('');

  // Restore today's log selections
  restoreTodaySelections();
}

/* ── Mood & Symptom Buttons ── */
document.querySelectorAll('.mood-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const mood = btn.dataset.mood;
    const moods = state.todayLog.moods;
    if (moods.includes(mood)) {
      state.todayLog.moods = moods.filter(m => m !== mood);
      btn.classList.remove('selected');
    } else {
      state.todayLog.moods.push(mood);
      btn.classList.add('selected');
    }
  });
});

document.querySelectorAll('.symptom-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const sym = btn.dataset.sym;
    const symptoms = state.todayLog.symptoms;
    if (symptoms.includes(sym)) {
      state.todayLog.symptoms = symptoms.filter(s => s !== sym);
      btn.classList.remove('selected');
    } else {
      state.todayLog.symptoms.push(sym);
      btn.classList.add('selected');
    }
  });
});

document.getElementById('saveTodayBtn').addEventListener('click', () => {
  store.set('luna_today', state.todayLog);
  showToast('Today\'s log saved! 💕✨');
});

function restoreTodaySelections() {
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.classList.toggle('selected', state.todayLog.moods?.includes(btn.dataset.mood));
  });
  document.querySelectorAll('.symptom-btn').forEach(btn => {
    btn.classList.toggle('selected', state.todayLog.symptoms?.includes(btn.dataset.sym));
  });
}

/* ── Log Period ── */
document.getElementById('logPeriodBtn').addEventListener('click', () => {
  const start = document.getElementById('startDateInput').value;
  const end   = document.getElementById('endDateInput').value;
  const flow  = document.getElementById('flowSelect').value;
  const note  = document.getElementById('noteInput').value.trim();

  if (!start) { showToast('Please enter your period start date! 💕'); return; }

  const entry = { id: Date.now(), start, end: end || null, flow, note };
  state.logs.unshift(entry);
  store.set('luna_logs', state.logs);

  // Update user's lastPeriod if this is more recent
  if (!state.user.lastPeriod || start > state.user.lastPeriod) {
    state.user.lastPeriod = start;
    store.set('luna_user', state.user);
  }

  // Clear form
  document.getElementById('startDateInput').value = '';
  document.getElementById('endDateInput').value   = '';
  document.getElementById('noteInput').value      = '';

  renderLogHistory();
  initDashboard();
  showToast('Period logged successfully! 🌸');
});

function renderLogHistory() {
  const list = document.getElementById('logList');
  if (!state.logs.length) {
    list.innerHTML = '<p class="empty-msg">No periods logged yet. Start by logging above! 💕</p>';
    return;
  }
  const flowEmoji = { light: '🩸', medium: '🩸🩸', heavy: '🩸🩸🩸' };
  list.innerHTML = state.logs.map(l => `
    <div class="log-item" id="log-${l.id}">
      <div class="log-item-icon">🌹</div>
      <div class="log-item-info">
        <div class="log-item-date">${fmt(l.start)} ${l.end ? `→ ${fmt(l.end)}` : '(ongoing)'}</div>
        <div class="log-item-meta">
          ${flowEmoji[l.flow] || '🩸'} ${l.flow?.charAt(0).toUpperCase() + l.flow?.slice(1)} flow
          ${l.end ? ` · ${diffDays(l.end, l.start) + 1} days` : ''}
          ${l.note ? ` · "${l.note}"` : ''}
        </div>
      </div>
      <button class="log-item-delete" onclick="deleteLog(${l.id})" title="Delete" aria-label="Delete log">🗑️</button>
    </div>
  `).join('');
}

window.deleteLog = (id) => {
  state.logs = state.logs.filter(l => l.id !== id);
  store.set('luna_logs', state.logs);
  renderLogHistory();
  initDashboard();
  showToast('Log removed.');
};

/* ── Calendar ── */
let calDate = new Date();

function renderCalendar() {
  const year  = calDate.getFullYear();
  const month = calDate.getMonth();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('calMonthTitle').textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build sets of colored dates
  const periodDays   = new Set();
  const fertileDays  = new Set();
  const ovulationDays = new Set();
  const predictedDays = new Set();

  if (state.user) {
    const info = cycleInfo();
    if (info) {
      // Mark actual logged periods
      state.logs.forEach(l => {
        const end = l.end || addDays(l.start, (state.user.periodLen - 1));
        let d = l.start;
        while (d <= end) { periodDays.add(d); d = addDays(d, 1); }
      });

      // Predicted future cycles (next 3)
      let predStart = info.nextPeriod;
      for (let c = 0; c < 3; c++) {
        let d = predStart;
        const predEnd = addDays(predStart, info.periodLen - 1);
        while (d <= predEnd) { predictedDays.add(d); d = addDays(d, 1); }
        predStart = addDays(predStart, info.cycleLen);
      }

      // Fertile & ovulation for current + next cycle
      [-info.cycleLen, 0, info.cycleLen].forEach(offset => {
        const baseStart = addDays(info.lastStart, offset);
        for (let i = info.fertileStart; i <= info.fertileEnd; i++) {
          fertileDays.add(addDays(baseStart, i));
        }
        ovulationDays.add(addDays(baseStart, info.cycleLen - 14));
      });
    }
  }

  const todayStr = today();
  let html = '';

  // Empty cells for offset
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-day empty"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    let cls = 'cal-day';
    if (dateStr === todayStr)      cls += ' today';
    if (ovulationDays.has(dateStr)) cls += ' ovulation';
    else if (fertileDays.has(dateStr)) cls += ' fertile';
    if (periodDays.has(dateStr))   cls += ' period';
    if (predictedDays.has(dateStr) && !periodDays.has(dateStr)) cls += ' predicted';

    html += `<div class="${cls}" title="${dateStr}">${d}</div>`;
  }

  document.getElementById('calDays').innerHTML = html;
}

document.getElementById('calPrev').addEventListener('click', () => {
  calDate.setMonth(calDate.getMonth() - 1);
  renderCalendar();
});
document.getElementById('calNext').addEventListener('click', () => {
  calDate.setMonth(calDate.getMonth() + 1);
  renderCalendar();
});

/* ── Insights ── */
function renderInsights() {
  const avgCyc = avgCycleLength();
  const avgPer = avgPeriodLength();
  const total  = state.logs.length;

  document.getElementById('avgCycleIns').textContent  = `${avgCyc} days`;
  document.getElementById('avgPeriodIns').textContent = `${avgPer} days`;
  document.getElementById('totalCyclesIns').textContent = total;

  // Regularity
  let reg = '–';
  if (state.logs.length >= 2) {
    const sorted = [...state.logs].sort((a,b) => a.start.localeCompare(b.start));
    const lengths = [];
    for (let i = 1; i < sorted.length; i++) lengths.push(diffDays(sorted[i].start, sorted[i-1].start));
    const variance = lengths.reduce((acc, l) => acc + Math.abs(l - avgCyc), 0) / lengths.length;
    if (variance <= 2)  reg = '🌟 Very Regular';
    else if (variance <= 5) reg = '✅ Regular';
    else if (variance <= 8) reg = '⚠️ Somewhat Irregular';
    else reg = '🔄 Irregular';
  }
  document.getElementById('regularityIns').textContent = reg;

  // Bar chart
  renderBarChart();

  // Symptom bubbles
  renderBubbles();
}

function renderBarChart() {
  const container = document.getElementById('barChart');
  if (state.logs.length < 2) {
    container.innerHTML = '<p class="empty-msg">Log at least 2 periods to see your cycle history 📈</p>';
    return;
  }
  const sorted = [...state.logs].sort((a,b) => a.start.localeCompare(b.start));
  const items = [];
  for (let i = 1; i < sorted.length; i++) {
    items.push({
      label: fmtShort(sorted[i].start),
      val: diffDays(sorted[i].start, sorted[i-1].start),
    });
  }
  const maxVal = Math.max(...items.map(x => x.val), 35);
  container.innerHTML = items.map(it => `
    <div class="bar-item">
      <div class="bar-fill" style="height:${(it.val/maxVal)*100}px" data-val="${it.val}d"></div>
      <div class="bar-label">${it.label}</div>
    </div>
  `).join('');
}

function renderBubbles() {
  // Collect all symptoms & moods from todayLog and any logged period notes
  const symCount = {};
  const moodCount = {};

  // Today
  (state.todayLog?.symptoms || []).forEach(s => symCount[s] = (symCount[s] || 0) + 1);
  (state.todayLog?.moods || []).forEach(m => moodCount[m] = (moodCount[m] || 0) + 1);

  // All saved daily logs (stored by date)
  const allDayLogs = store.get('luna_day_logs', {});
  Object.values(allDayLogs).forEach(dl => {
    (dl.symptoms || []).forEach(s => symCount[s] = (symCount[s] || 0) + 1);
    (dl.moods || []).forEach(m => moodCount[m] = (moodCount[m] || 0) + 1);
  });

  const symLabels = {
    cramps: '🔴 Cramps', headache: '🤕 Headache', bloating: '💨 Bloating',
    backpain: '🫀 Back Pain', spotting: '💧 Spotting', acne: '✨ Acne',
    tender: '🩷 Breast Tenderness', cravings: '🍫 Cravings',
  };

  const symEl = document.getElementById('symptomBubbles');
  const sorted = Object.entries(symCount).sort((a,b) => b[1]-a[1]);
  if (!sorted.length) {
    symEl.innerHTML = '<p class="empty-msg">Log some symptoms to see your patterns! 🌷</p>';
  } else {
    symEl.innerHTML = sorted.map(([s, c]) =>
      `<span class="bubble sym">${symLabels[s] || s} <strong>×${c}</strong></span>`
    ).join('');
  }

  const moodEl = document.getElementById('moodBubbles');
  const sortedM = Object.entries(moodCount).sort((a,b) => b[1]-a[1]);
  if (!sortedM.length) {
    moodEl.innerHTML = '<p class="empty-msg">Log some moods to see your patterns! 🌷</p>';
  } else {
    moodEl.innerHTML = sortedM.map(([m, c]) =>
      `<span class="bubble mood">${m} <strong>×${c}</strong></span>`
    ).join('');
  }
}

/* ── Save Today with persistence across days ── */
document.getElementById('saveTodayBtn').addEventListener('click', () => {
  store.set('luna_today', state.todayLog);

  // Also archive in luna_day_logs
  const allDayLogs = store.get('luna_day_logs', {});
  allDayLogs[today()] = state.todayLog;
  store.set('luna_day_logs', allDayLogs);

  showToast('Today\'s log saved! 💕✨');
}, { once: false });

/* ── Set default date inputs to today ── */
function initDateInputs() {
  const t = today();
  document.getElementById('startDateInput').value = t;
  document.getElementById('endDateInput').value   = t;
  document.getElementById('setupLastPeriod').value = t;
}

/* ════════════════════════════════════════════════
   🌹 PERIOD REMINDER NOTIFICATION SYSTEM
   ════════════════════════════════════════════════ */

const ROMANTIC_SENTENCES = [
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

function getRandomRomanticSentence() {
  return ROMANTIC_SENTENCES[Math.floor(Math.random() * ROMANTIC_SENTENCES.length)];
}

/* ── Service Worker Registration ── */
async function registerSW() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('service-worker.js');
    } catch (e) {
      console.warn('SW registration failed (file:// protocol needs a local server):', e);
    }
  }
}

/* ── Request Notification Permission ── */
async function requestNotifPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  return result;
}

/* ── Show Browser Push Notification ── */
async function sendBrowserNotification(title, body) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // Try via Service Worker first (works in background)
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      reg.showNotification(title, {
        body,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌙</text></svg>',
        tag: 'luna-period-reminder',
        renotify: true,
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 300],
      });
      return;
    }
  }
  // Fallback: direct Notification
  new Notification(title, { body, icon: '🌙' });
}

/* ── In-App Reminder Banner ── */
function showReminderBanner(msg, daysUntil) {
  const banner = document.getElementById('reminderBanner');
  if (!banner) return;

  const emojis = ['🌹', '💕', '🌸', '🌙', '💗', '🌺', '🩷', '💌', '🌷', '🫶'];
  document.getElementById('reminderEmoji').textContent = emojis[Math.floor(Math.random() * emojis.length)];
  document.getElementById('reminderTitle').textContent =
    daysUntil === 2 ? '💌 Period Reminder — 2 Days Away' : '🌹 Your Period is Almost Here';
  document.getElementById('reminderMsg').textContent = msg;

  banner.classList.remove('hidden');
  // Trigger animation after paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => banner.classList.add('show'));
  });
}

function hideReminderBanner() {
  const banner = document.getElementById('reminderBanner');
  banner.classList.remove('show');
  setTimeout(() => banner.classList.add('hidden'), 500);
}

document.getElementById('reminderClose').addEventListener('click', () => {
  hideReminderBanner();
  // Don't show again this session
  sessionStorage.setItem('luna_reminder_dismissed', today());
});

/* ── Notification Permission Prompt (shown inside dashboard) ── */
function showNotifPromptCard() {
  if (Notification.permission === 'granted') return;
  if (Notification.permission === 'denied') return;
  if (store.get('luna_notif_prompt_shown')) return;

  const heroSection = document.querySelector('#page-dashboard .stats-grid');
  if (!heroSection) return;

  const existing = document.getElementById('notifPromptCard');
  if (existing) return;

  const card = document.createElement('div');
  card.className = 'notif-prompt';
  card.id = 'notifPromptCard';
  card.innerHTML = `
    <div class="notif-prompt-text">
      <strong>🔔 Enable Period Reminders</strong>
      Get a romantic notification 2 days before your period, even when the tab is in background.
    </div>
    <button class="notif-allow-btn" id="notifAllowBtn">Allow 💕</button>
  `;

  heroSection.insertAdjacentElement('beforebegin', card);

  document.getElementById('notifAllowBtn').addEventListener('click', async () => {
    const result = await requestNotifPermission();
    card.remove();
    store.set('luna_notif_prompt_shown', true);
    if (result === 'granted') {
      showToast('Notifications enabled! 💕 You\'ll get a reminder 2 days before your period.');
      await registerSW();
    } else {
      showToast('Notifications blocked. You\'ll still see in-app reminders! 🌸');
    }
  });
}

/* ── Core Reminder Check (runs on every page load) ── */
async function checkAndFireReminder() {
  if (!state.user) return;

  const info = cycleInfo();
  if (!info) return;

  const daysUntil = info.daysUntil;

  // Only trigger when exactly 2 days away (or 1 day as backup)
  if (daysUntil !== 2 && daysUntil !== 1) return;

  // Avoid re-showing within the same day
  const lastShown = sessionStorage.getItem('luna_reminder_dismissed');
  if (lastShown === today()) return;

  const alreadyNotified = store.get('luna_reminder_sent_for');
  if (alreadyNotified === info.nextPeriod) return;

  // Pick a random romantic sentence
  const sentence = getRandomRomanticSentence();

  // Mark as notified for this cycle
  store.set('luna_reminder_sent_for', info.nextPeriod);

  // 1️⃣ Show in-app banner
  showReminderBanner(sentence, daysUntil);

  // 2️⃣ Send browser push notification
  const notifTitle = daysUntil === 2
    ? '🌹 Luna — Period in 2 Days, My Love'
    : '🌸 Luna — Your Period is Tomorrow';

  await sendBrowserNotification(notifTitle, sentence.replace(/[🌹💕🌸🌙💗🌺🩷💌🌷🫶💫🌕🌟]/g, '').trim());
}

/* ── Boot ── */
async function boot() {
  initDateInputs();
  renderLogHistory();
  await registerSW();

  if (!state.user) {
    showSetup();
  } else {
    hideSetup();
    initDashboard();
    showNotifPromptCard();
    // Small delay so dashboard renders first
    setTimeout(checkAndFireReminder, 800);
  }
}

boot();

