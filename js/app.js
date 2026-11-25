/* =========================================================
   화면과 동작 (설계서 5장의 9개 화면)
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const S = { profile: null, routine: null, next: {}, strength: [], cardio: [], weights: [], workout: null, rest: null, charts: {}, editMode: false, form: {} };

// ---------- 작은 도우미 ----------
const pad2 = n => String(n).padStart(2, '0');
const ymd = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const mmss = sec => { sec = Math.max(0, Math.round(sec)); return `${Math.floor(sec / 60)}:${pad2(sec % 60)}`; };
const num = v => (v === '' || v == null || isNaN(+v)) ? null : +v;
const fmt = n => (Math.round(n * 10) / 10).toString();
const kc = n => Math.round(n).toLocaleString();
const korDate = s => { const d = new Date(s); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${'일월화수목금토'[d.getDay()]})`; };
function mondayStart() { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); }
const rules = () => Logic.rules(S.profile);
const goal = () => Logic.goalCheck(S.profile, rules());

function wLabel(ex, w) {
  if (!Logic.isWeighted(ex)) return '맨손';
  if (ex.assist) return `보조 ${fmt(w)}kg`;
  if (w === 0) return '맨손';
  return `${fmt(w)}kg`;
}
function setLabel(ex, s, unit) { return `${Logic.isWeighted(ex) ? wLabel(ex, s.w) + ' × ' : ''}${s.r}${unit}`; }

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400);
}
// +/− 조절 (inputAct를 주면 가운데 숫자를 눌러 직접 입력 가능: 14.6 같은 소수점도)
function stepper(act, val, unit, attrs = '', inputAct = null) {
  const mid = inputAct
    ? `<div class="val"><input class="val-input" type="number" inputmode="decimal" step="any" value="${val}" data-input="${inputAct}" ${attrs} aria-label="직접 입력"><span class="unit"> ${unit}</span></div>`
    : `<div class="val">${val}<span class="unit"> ${unit}</span></div>`;
  return `<div class="stepper"><button data-act="${act}" data-d="-1" ${attrs} aria-label="줄이기">−</button>
    ${mid}
    <button data-act="${act}" data-d="1" ${attrs} aria-label="늘리기">+</button></div>`;
}
// 평가 버튼: '적정 · RPE 7~8' + 설명
const ratingBtn = (act, k, cur, desc) => `<button class="${cur === k ? 'on' : ''}" data-act="${act}" data-val="${k}"><span class="r-main">${RATINGS[k]} <span class="r-rpe">${RATING_RPE[k]}</span></span><span class="r-desc">${desc[k]}</span></button>`;
const ctlRow = (label, html) => `<div class="ctl-row"><span class="label">${label}</span>${html}</div>`;
// 화면 모드 전환 버튼 (처음 설정 화면에서도 사용)
function themeToggle() {
  const light = document.documentElement.dataset.theme === 'light';
  return `<button class="btn small" data-act="toggleTheme" aria-label="화면 모드 바꾸기">${light ? '🌙 다크 모드' : '☀️ 밝은 화면'}</button>`;
}
function actionBar(html) { return `<div class="action-bar"><div class="inner">${html}</div></div>`; }
function vibrate(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* 지원 안 함 */ } }
let audioCtx = null;
function unlockAudio() { try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); } catch (e) { /* 소리 없음 */ } }
function beep(times = 2) {
  if (!audioCtx) return;
  for (let i = 0; i < times; i++) {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
    const t0 = audioCtx.currentTime + i * 0.35;
    g.gain.setValueAtTime(0.25, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);
    o.start(t0); o.stop(t0 + 0.26);
  }
}

// 크고 반복되는 알림음 (약 sec초 동안)
function loudBeep(sec = 3) {
  if (!audioCtx) return;
  const n = Math.round(sec * 3);
  for (let i = 0; i < n; i++) {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'square'; o.frequency.value = i % 2 ? 1175 : 880; o.connect(g); g.connect(audioCtx.destination);
    const t0 = audioCtx.currentTime + i * 0.33;
    g.gain.setValueAtTime(0.45, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);
    o.start(t0); o.stop(t0 + 0.23);
  }
}
const RING = [500, 150, 500, 150, 500, 150, 900]; // 약 3초 진동
// 휴대폰 알림 표시줄 (다른 앱을 보고 있을 때)
function notify(title, body) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !navigator.serviceWorker) return;
    navigator.serviceWorker.ready.then(reg => reg.showNotification(title, { body, tag: 'workout', renotify: true, requireInteraction: true, vibrate: RING, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' }));
  } catch (e) { /* 알림 불가 */ }
}
function askNotify() { try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch (e) { /* 무시 */ } }
// 놓치지 않는 알림: 진동 3초 + 큰 소리 3초 + 깜빡이는 팝업
//  5초 간격으로 모두 3번 울리고, 3번째가 끝나면 팝업을 저절로 닫고 다음 세트 화면으로 돌아감
function strongAlert(title, msg) {
  stopAlert();
  const el = $('#alert-pop');
  el.innerHTML = `<h2>${title}</h2><p>${msg}</p><button class="btn big" data-act="alertOk">확인</button><p class="small" style="opacity:.8">3번 울린 뒤 저절로 닫혀요</p>`;
  el.classList.add('active');
  const ring = () => { vibrate(RING); loudBeep(3); };
  ring();
  let count = 1;
  S.alertTimer = setInterval(() => {
    count++;
    if (count <= 3) ring();
    else stopAlert(); // 3번째 울림(약 3초)이 끝난 뒤 닫기
  }, 5000);
  if (document.hidden) notify(title, msg);
}
function stopAlert(keepPopup) {
  if (S.alertTimer) { clearInterval(S.alertTimer); S.alertTimer = null; }
  vibrate(0);
  if (!keepPopup) $('#alert-pop').classList.remove('active');
}
// 상태표시줄(알림 창)에 휴식 남은 시간 표시 — 소리·진동 없이 5초마다 갱신
function restNotify() {
  try {
    if (!S.rest || !('Notification' in window) || Notification.permission !== 'granted' || !navigator.serviceWorker) return;
    const left = Math.max(0, (S.rest.end - Date.now()) / 1000);
    const it = S.workout && S.workout.items && curItem();
    const n = it ? it.sets.findIndex(s => !s.done) + 1 : 0;
    S.rest.noted = Date.now();
    navigator.serviceWorker.ready.then(reg => reg.showNotification(`휴식 중 · ${mmss(left)} 남음`, {
      body: it && n ? `다음: ${EX[it.exId].name} ${n}세트 (${setLabel(EX[it.exId], it.sets[n - 1], it.presc.unit)})` : '다음 세트 준비',
      tag: 'rest-timer', renotify: false, silent: true, requireInteraction: true, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
    }));
  } catch (e) { /* 알림 불가 */ }
}
function clearRestNotify() {
  try { if (navigator.serviceWorker) navigator.serviceWorker.ready.then(reg => reg.getNotifications({ tag: 'rest-timer' }).then(list => list.forEach(x => x.close()))); } catch (e) { /* 무시 */ }
}
// 운동하는 동안 화면이 꺼지지 않게
async function keepAwake(on) {
  try {
    if (on && !S.wake && 'wakeLock' in navigator && !document.hidden) { S.wake = await navigator.wakeLock.request('screen'); S.wake.addEventListener('release', () => { S.wake = null; }); }
    if (!on && S.wake) { await S.wake.release(); S.wake = null; }
  } catch (e) { /* 지원 안 함 */ }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.workout) keepAwake(true); });

// ---------- 저장 ----------
async function loadAll() {
  S.profile = await DB.get('profile', 'me');
  S.routine = (await DB.get('routine', 'me')) || null;
  S.next = Object.fromEntries((await DB.all('next')).map(n => [n.key, n]));
  S.strength = await DB.all('strength');
  S.cardio = await DB.all('cardio');
  S.weights = (await DB.all('weight')).sort((a, b) => a.date.localeCompare(b.date));
  S.body = (await DB.all('body')).sort((a, b) => a.date.localeCompare(b.date));
}
function saveDraft() { try { if (S.workout) localStorage.setItem('workout-draft', JSON.stringify(S.workout)); else localStorage.removeItem('workout-draft'); } catch (e) { /* 저장 불가 */ } }
function loadDraft() { try { const d = localStorage.getItem('workout-draft'); return d ? JSON.parse(d) : null; } catch (e) { return null; } }

function applyTheme() {
  let saved = null; try { saved = localStorage.getItem('theme'); } catch (e) { /* 없음 */ }
  const theme = (S.profile && S.profile.theme) || saved || 'dark';
  document.documentElement.dataset.theme = theme;
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  document.querySelector('meta[name=theme-color]').setAttribute('content', bg || '#0d0f13');
}

// ---------- 루틴·칼로리 도우미 ----------
const currentCycle = () => Logic.cycle(S.profile.freq, S.profile.level);
const nextDayKey = () => { const c = currentCycle(); return c[S.routine.pointer % c.length]; };
const subs = () => S.routine.subs || {};
const adds = () => S.routine.adds || {};   // 코스에 직접 추가한 운동
const curWk = (offset = 0) => rules().rotateVariants ? Logic.weekIndex() + offset : null;   // 기구 변형용 주 번호
const sinceMonday = r => new Date(r.date).getTime() >= mondayStart();
function sessionsThisWeek() { const ids = new Set(); [...S.strength, ...S.cardio].filter(sinceMonday).forEach(r => ids.add(r.sessionId)); return ids.size; }
const intervalsThisWeek = () => S.cardio.filter(r => sinceMonday(r) && r.intensity === 'high').length;
const weekNet = () => [...S.strength, ...S.cardio].filter(sinceMonday).reduce((a, r) => a + (r.net || 0), 0);

// 유산소 설정: 지난번 추천값이 있으면 그것, 없으면 기본값
function cardioSettings(exId, intensity) {
  const saved = S.next[`cardio:${exId}:${intensity}`];
  return saved ? Object.assign({}, saved.set) : Logic.cardioDefaults(EX[exId], intensity);
}
function planToday() {
  return Logic.sessionPlan({ profile: S.profile, dayKey: nextDayKey(), subs: subs(), adds: adds(), wk: curWk(), next: S.next, intervalsThisWeek: intervalsThisWeek(), cardioSettings });
}

// 같은 부위 48시간 휴식 확인
function restNotice(dayKey) {
  const area = Logic.DAYS[dayKey].area;
  let last = null;
  S.strength.forEach(r => {
    const d = Logic.DAYS[r.dayKey];
    if (d && d.area.some(a => area.includes(a))) { const t = new Date(r.date).getTime(); if (!last || t > last.t) last = { t, dayKey: r.dayKey }; }
  });
  if (!last) return '';
  const h = (Date.now() - last.t) / 3600000;
  if (h >= 48) return '';
  return `<div class="notice warn">마지막 ${Logic.DAYS[last.dayKey].name} 운동 후 약 ${Math.floor(h)}시간 지났어요. 같은 부위는 48시간 쉬는 것을 권장해요.</div>`;
}

// 칼로리 배분 막대
function kcalBar(parts, target) {
  const total = Math.max(target || 0, parts.reduce((a, p) => a + p.v, 0), 1);
  return `<div class="bar">${parts.map(p => `<span class="${p.cls}" style="width:${(p.v / total * 100).toFixed(1)}%"></span>`).join('')}</div>
    <div class="legend">${parts.map(p => `<span><i class="${p.cls}" style="background:var(${p.color})"></i>${p.name} ${kc(p.v)}</span>`).join('')}</div>`;
}

// =========================================================
// 화면 이동
// =========================================================
const TAB_SCREENS = ['home', 'routine', 'records', 'settings'];
function go(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('#scr-' + name).classList.add('active');
  const tabs = TAB_SCREENS.includes(name);
  $('#tabbar').classList.toggle('hidden', !tabs);
  $('#app').classList.toggle('no-tabs', !tabs);
  document.querySelectorAll('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  S.screen = name;
  keepAwake(!!S.workout && ['workout', 'eval', 'cardio'].includes(name));
  RENDER[name]();
  window.scrollTo(0, 0);
}
function rerender() { const y = window.scrollY; RENDER[S.screen](); window.scrollTo(0, y); }
const RENDER = {};

// =========================================================
// 1. 첫 설정 (설정 화면의 '정보 수정'에서도 사용)
// =========================================================
RENDER.setup = () => {
  const p = S.profile || {};
  const edit = S.editMode && !!S.profile;
  S.form = { sex: p.sex || null, freq: p.freq || 4, level: p.level || null };
  const f = (id, label, unit, val, hint = '', step = '1') => `
    <div class="field"><label for="f-${id}">${label} <span class="muted">(${unit})</span></label>
    <input id="f-${id}" type="number" inputmode="decimal" step="${step}" value="${val ?? ''}" placeholder="예: ${hint}"></div>`;
  const choice = (group, opts, cur) => `<div class="choice" data-group="${group}">${opts.map(([v, t]) =>
    `<button type="button" data-act="choose" data-group="${group}" data-val="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div>`;

  $('#scr-setup').innerHTML = `
    <div class="row between"><span class="eyebrow">${edit ? '설정' : '반가워요'}</span>${themeToggle()}</div>
    <h1>${edit ? '내 정보 수정' : '처음 설정'}</h1>
    ${edit ? '' : '<p class="muted small">추천 계산에 쓰이는 정보 9가지를 입력해 주세요. 나중에 설정에서 바꿀 수 있어요.</p>'}
    <div class="notice info">이 앱의 추천은 일반적인 운동 기준이며 의료 조언이 아닙니다. 질환이나 부상이 있으면 전문가와 상담하십시오.</div>
    <div class="card">
      <div class="card-title">몸 정보</div>
      <div class="grid2">${f('height', '키', 'cm', p.height, '175')}${f('age', '나이', '세', p.age, '40')}</div>
      <div class="field"><label>성별</label>${choice('sex', [['male', '남'], ['female', '여']], S.form.sex)}</div>
      <div class="grid2">${f('weight', '현재 체중', 'kg', p.weight, '80', '0.1')}${f('target', '목표 체중', 'kg', p.target, '72', '0.1')}</div>
      ${f('weeks', '목표 기간', '주', p.weeks, '12')}
    </div>
    <div id="goal-box"></div>
    <div class="card">
      <div class="card-title">운동 습관</div>
      <div class="field"><label>주 운동 횟수</label>${choice('freq', [[2, '2회'], [3, '3회'], [4, '4회'], [5, '5회'], [6, '6회']], S.form.freq)}</div>
      <div class="field"><label>운동 수준</label>${choice('level', [['beginner', '초보'], ['intermediate', '중급'], ['advanced', '상급']], S.form.level)}
        <div class="hint">초보: 규칙적인 근력 운동 6개월 미만<br>중급: 6개월~2년 · 상급: 2년 이상</div></div>
      ${f('minutes', '1회 운동 가능 시간', '분', p.minutes ?? 60, '60')}
    </div>
    <div id="setup-err"></div>
    ${edit ? actionBar('<button class="btn" data-act="cancelSetup">취소</button><button class="btn primary big" data-act="saveSetup">저장</button>')
      : `<button class="btn ghost" data-act="importBackup">백업 파일에서 불러오기</button>${actionBar('<button class="btn primary big" data-act="saveSetup">시작하기</button>')}`}`;
  updateGoalBox();
};

function readSetup() {
  const g = id => num($('#f-' + id).value);
  return { height: g('height'), age: g('age'), weight: g('weight'), target: g('target'), weeks: g('weeks'), minutes: g('minutes'), sex: S.form.sex, freq: +S.form.freq, level: S.form.level };
}
function validateSetup(v) {
  const errs = [];
  const range = (k, lo, hi, name) => { if (v[k] == null || v[k] < lo || v[k] > hi) errs.push(`${name}: ${lo}~${hi} 사이로 입력해 주세요.`); };
  range('height', 120, 230, '키'); range('age', 14, 90, '나이'); range('weight', 30, 250, '현재 체중'); range('target', 30, 250, '목표 체중');
  range('weeks', 1, 104, '기간'); range('minutes', 20, 180, '운동 가능 시간');
  if (!v.sex) errs.push('성별을 골라 주세요.');
  if (!v.level) errs.push('운동 수준을 골라 주세요.');
  return errs;
}
// 목표 점검 + 하루 칼로리 배분 상자 (첫 설정·설정 화면 공용)
function goalCard(v, g, R) {
  const dirName = { loss: '감량', gain: '증량', keep: '유지' }[g.direction];
  const rows = g.direction === 'loss' ? `
      <span>평소 하루 소모 (운동 제외)</span><span>${kc(g.base)} kcal</span>
      <span>하루에 줄일 열량</span><span>−${kc(g.dailyDelta)} kcal</span>
      <span>└ 운동으로 (${R.exerciseSharePct}%)</span><span>약 ${kc(g.exerciseDaily)} kcal</span>
      <span>└ 식단으로</span><span>약 ${kc(g.dietDeficit)} kcal</span>
      <span>1회 운동 목표 (순소모)</span><span>약 ${kc(g.sessionTarget)} kcal</span>
      <span class="total">하루 섭취 참고</span><span class="total">약 ${kc(g.intake)} kcal</span>` : `
      <span>평소 하루 소모 (운동 제외)</span><span>${kc(g.base)} kcal</span>
      <span>운동으로 더 쓰는 열량 (하루 평균)</span><span>약 ${kc(g.exerciseDaily)} kcal</span>
      ${g.direction === 'gain' ? `<span>하루에 더 먹을 열량</span><span>+${kc(g.dailyDelta)} kcal</span>` : ''}
      <span class="total">하루 섭취 참고</span><span class="total">약 ${kc(g.intake)} kcal</span>`;
  return `<div class="card">
    <div class="card-title">목표 점검 <span class="tag ${g.warn ? 'warn' : 'success'}">${dirName}</span></div>
    <p class="small" style="margin-top:0">${g.direction === 'keep' ? '체중을 유지하는 목표예요.' : `주당 약 <b>${g.weekly}kg ${dirName}</b> (체중의 ${g.pct}%)`}</p>
    ${g.warn ? `<div class="notice warn"><b>기간을 늘리는 것을 권장합니다.</b><br>${dirName} 권장 한도는 주당 체중의 ${g.direction === 'loss' ? R.lossWarnPct : R.gainWarnPct}%예요.</div>` : ''}
    <div class="kv" style="margin-top:var(--sp-3)">${rows}</div>
    ${g.lowIntake ? '<div class="notice warn">섭취 칼로리가 기초대사량보다 낮아요. 기간을 늘리는 것을 권장합니다.</div>' : ''}
    <p class="xs muted" style="margin-bottom:0">기초대사량 약 ${kc(g.bmr)}kcal(${g.bmrMeasured ? '인바디 측정값' : '미플린-세인트 조어 공식'}) × 평소 활동 ${R.lifeFactor}배. 운동 몫·활동 계수는 설정 → 추천 기준 수치에서 바꿀 수 있어요.</p>
  </div>`;
}
function updateGoalBox() {
  const box = $('#goal-box'); if (!box) return;
  const v = readSetup();
  if ([v.height, v.age, v.weight, v.target, v.weeks].some(x => x == null || x <= 0) || !v.sex) { box.innerHTML = ''; return; }
  const R = Logic.rules(S.profile);
  box.innerHTML = goalCard(v, Logic.goalCheck(Object.assign({ minutes: 60 }, v, { minutes: v.minutes || 60 }), R), R);
}
document.addEventListener('input', e => { if (e.target.closest('#scr-setup')) updateGoalBox(); });

async function saveSetup() {
  const v = readSetup();
  const errs = validateSetup(v);
  if (errs.length) { $('#setup-err').innerHTML = `<div class="notice danger">${errs.join('<br>')}</div>`; $('#setup-err').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  const isNew = !S.profile;
  const prev = S.profile || {};
  S.profile = Object.assign({}, prev, v, { key: 'me', rules: prev.rules || {}, theme: document.documentElement.dataset.theme || prev.theme || 'dark', createdAt: prev.createdAt || new Date().toISOString() });
  await DB.put('profile', S.profile);
  if (isNew || !S.weights.length) await DB.put('weight', { date: ymd(), kg: v.weight });
  const sig = currentCycle().join(',');
  const r = S.routine || { key: 'me', subs: {}, pointer: 0 };
  if (r.sig !== sig) { r.pointer = 0; r.sig = sig; }
  S.routine = r;
  await DB.put('routine', r);
  await loadAll();
  S.editMode = false;
  toast(isNew ? '설정을 저장했어요' : '정보를 수정했어요');
  go(isNew ? 'home' : 'settings');
}

// =========================================================
// 2. 홈
// =========================================================
RENDER.home = () => {
  const p = S.profile;
  const t = planToday();
  const d = Logic.DAYS[t.day = t.dayKey];
  const done = sessionsThisWeek();
  const draft = S.workout;
  const lastW = S.weights.length ? S.weights[S.weights.length - 1].kg : p.weight;
  const g = t.goal;
  const c = t.cardio;
  const sb = subs();
  const isSub = id => Object.values(sb).includes(id);
  const isAdd = id => (adds()[t.dayKey] || []).includes(id);
  const weekTarget = g.sessionTarget ? g.sessionTarget * p.freq : null;
  const wn = weekNet();

  $('#scr-home').innerHTML = `
    <div class="eyebrow">${korDate(new Date())}</div>
    <h1>오늘의 운동</h1>
    ${draft ? `<div class="card"><div class="card-title">진행 중인 운동이 있어요</div>
      <p class="small muted" style="margin-top:0">${Logic.DAYS[draft.dayKey].name} · ${korDate(draft.start)}</p>
      <div class="btn-row"><button class="btn" data-act="discardDraft">취소</button><button class="btn primary" data-act="resume">이어하기</button></div></div>` : ''}
    <div class="card hero">
      <div class="row between"><span class="tag primary">다음 차례</span><span class="small muted">예상 약 ${t.totalMin}분</span></div>
      <div class="num" style="margin:var(--sp-3) 0 2px">${d.name}</div>
      <div class="small muted">${d.parts}</div>
      <ul class="list numbered small" style="margin-top:var(--sp-4)">${t.items.map(it => `<li><div class="item"><span>${EX[it.id].name} ${isSub(it.id) ? '<span class="tag">대체</span>' : ''}${isAdd(it.id) ? '<span class="tag primary">추가</span>' : ''}</span><span class="side">${it.sets}세트</span></div></li>`).join('')}</ul>
      ${t.trims.length ? `<div class="notice warn slim">시간에 맞춰 줄였어요: ${t.trims.join(', ')}</div>` : ''}
      <div class="notice slim">준비운동 ${t.warmMin}분 → 근력 약 ${t.strengthMin}분 → ${c.skip ? '유산소는 시간이 부족해 다음 날로' : `유산소 ${Logic.CARDIO_INT[c.intensity].name} ${c.minutes}분 (${EX[c.exId].name})`}</div>
      ${restNotice(t.day)}
      ${draft ? '' : '<button class="btn primary big" data-act="startWorkout" style="margin-top:var(--sp-3)">운동 시작</button>'}
    </div>
    <div class="card">
      <div class="card-title">오늘 소모 계획 <span class="side">순소모 기준</span></div>
      ${kcalBar([{ name: '준비', v: t.warmNet, cls: 'b1', color: '--figure-far' }, { name: '근력', v: t.strengthNet, cls: 'b2', color: '--primary' }, { name: '유산소', v: c.net, cls: 'b3', color: '--success' }], t.targetNet)}
      <div class="kv" style="margin-top:var(--sp-3)">
        ${t.targetNet ? `<span>1회 목표</span><span>약 ${kc(t.targetNet)} kcal</span>` : ''}
        <span>계획</span><span>약 ${kc(t.planNet)} kcal</span>
      </div>
      ${t.shortfall > 0 ? `<div class="notice warn slim">시간 안에 약 ${kc(t.shortfall)}kcal가 부족해요. 운동 시간을 늘리거나 식단에서 조금 더 줄이면 돼요.</div>` : ''}
      ${g.direction === 'loss' ? `<p class="xs muted" style="margin-bottom:0">하루 섭취 참고 약 ${kc(g.intake)}kcal · 줄일 열량 중 ${rules().exerciseSharePct}%를 운동이 맡아요.</p>` : ''}
    </div>
    <div class="card">
      <div class="card-title">이번 주 <span class="side">${done} / ${p.freq}회</span></div>
      ${weekStrip()}
      ${weekTarget ? `<div class="kv" style="margin-top:var(--sp-3)"><span>운동 순소모</span><span>${kc(wn)} / ${kc(weekTarget)} kcal</span></div>` : ''}
    </div>
    <div class="card">
      <div class="card-title">체중 <span class="side">${fmt(lastW)}kg → 목표 ${fmt(p.target)}kg</span></div>
      ${bodySummaryLine()}
      <div class="chart-box mini"><canvas id="chart-mini"></canvas></div>
      <button class="btn small" data-act="tab" data-to="records" style="margin-top:var(--sp-3)">체중 기록하기</button>
    </div>`;
  drawWeightChart('chart-mini', true);
};

// =========================================================
// 3. 주간 루틴
// =========================================================
RENDER.routine = () => {
  const p = S.profile, R = rules();
  const cyc = currentCycle();
  const done = sessionsThisWeek();
  const len = cyc.length;
  const start = (((S.routine.pointer - done) % len) + len) % len;
  const week = Logic.weekPlan(p.freq, p.level, start);
  const sb = subs();
  const origOf = id => Object.keys(sb).find(k => sb[k] === id);
  const dayCard = (key, i) => {
    const d = Logic.DAYS[key];
    const ids = Logic.dayExercises(key, p.level, sb, adds(), curWk());
    const baseIds = Logic.dayExercises(key, p.level, sb, adds());
    const nextIds = Logic.dayExercises(key, p.level, sb, adds(), curWk(1));
    const added = adds()[key] || [];
    const status = i < done ? '<span class="tag success">완료</span>' : (i === done ? '<span class="tag primary">다음</span>' : '');
    return `<details class="card" ${i === done || S.form.rtOpen === key ? 'open' : ''}>
      <summary><span class="row" style="gap:var(--sp-2)"><span class="muted">${i + 1}</span> ${d.name} ${status}</span></summary>
      <p class="small muted" style="margin-top:0">${d.parts}</p>
      <ul class="list">${ids.map(id => {
        const ex = EX[id], pr = Logic.prescription(ex, p.level, R), o = origOf(id), idx = ids.indexOf(id);
        const nx = nextIds[idx] && nextIds[idx] !== id ? EX[nextIds[idx]].name : null;
        return `<li><div class="item"><span class="title">${ex.name} ${added.includes(id) ? '<span class="tag primary">추가</span>' : ''}</span><span class="side">${pr.sets}세트<br>${pr.lo}~${pr.hi}${pr.unit}</span>
          <span class="sub">휴식 ${pr.rest}초 · ${EQUIP_NAME[ex.equip]}${nx ? ` · <span style="color:var(--primary)">다음 주: ${nx}</span>` : ''}</span>
          <div class="extra">${nextTargetRow(id, key, pr)}</div>
          ${added.includes(id) ? `<div class="extra"><button class="btn small" data-act="addRemove" data-day="${key}" data-id="${id}">코스에서 빼기</button></div>` : ''}
          ${o ? `<div class="extra"><div class="small" style="color:var(--warning)">대체한 운동 · 원래: ${EX[o].name}</div>
            <button class="btn small" style="margin-top:var(--sp-2)" data-act="revert" data-orig="${o}">원래 운동으로 되돌리기</button></div>` : ''}</div></li>`;
      }).join('')}</ul>
      ${addPicker(key, ids)}</details>`;
  };
  $('#scr-routine').innerHTML = `
    <div class="eyebrow">주 ${p.freq}회 · ${LEVELS[p.level]}</div>
    <h1>주간 루틴</h1>
    <div class="card">
      <div class="card-title">분할 순서 <span class="side">이번 주 ${done}회 완료</span></div>
      <div class="row wrap" style="gap:6px">${week.map((k, i) => `<span class="tag ${i < done ? 'success' : i === done ? 'primary' : ''}">${Logic.DAYS[k].name.split(' ')[0]}</span>${i < week.length - 1 ? '<span class="muted xs">→</span>' : ''}`).join('')}</div>
      <p class="small" style="margin-bottom:0">${Logic.splitNote(p.freq, p.level)}</p>
      ${rules().rotateVariants ? '<p class="small" style="margin-bottom:0">🔄 레그 컬(누워서↔앉아서), 레그프레스(앉아서↔45도), 스쿼트(봉 자유↔스미스머신), 벤치프레스(바벨↔덤벨)처럼 <b>기구·방법을 주마다 번갈아</b> 추천해요. 무게 기록과 다음 목표는 운동마다 따로 관리돼요. (설정 → 추천 기준 수치에서 끌 수 있어요)</p>' : ''}
      <p class="xs muted" style="margin-bottom:0">요일을 고정하지 않고 '다음 차례'로 돌아가요. 하루 빠져도 순서가 꼬이지 않아요.${done >= p.freq ? ' 이번 주 목표를 채웠어요!' : ''}</p>
    </div>
    ${week.map(dayCard).join('')}`;
};

// 루틴 화면: 운동별 다음 목표 (보기·고치기)
function nextTargetRow(id, dayKey, pr) {
  const ex = EX[id], n = S.next[id], weighted = Logic.isWeighted(ex);
  const e = S.form.rtEdit && S.form.rtEdit.id === id ? S.form.rtEdit : null;
  if (e) return `<div class="card tight" style="margin:var(--sp-2) 0 0">
      <div class="small bold">다음 목표 고치기</div>
      ${weighted ? ctlRow(ex.assist ? '보조 무게' : '무게', stepper('rtW', fmt(e.w), 'kg', '', 'inRtW')) : ''}
      ${ctlRow(pr.unit === '초' ? '시간' : '횟수', stepper('rtR', e.r, pr.unit, `data-step="${pr.repStep}"`, 'inRtR'))}
      <div class="btn-row" style="margin-top:var(--sp-2)"><button class="btn small" data-act="rtCancel">취소</button><button class="btn small primary" data-act="rtSave">저장</button></div></div>`;
  const txt = n ? `${weighted ? wLabel(ex, n.weight) + ' × ' : ''}${n.reps}${pr.unit}` : '처음 · 기준 중량 찾기';
  return `<div class="row between small"><span><span class="muted">다음 목표</span> <b>${txt}</b> ${n && n.manual ? '<span class="tag primary">직접 정함</span>' : ''}</span>
    <button class="btn small" data-act="rtEdit" data-id="${id}" data-day="${dayKey}">수정</button></div>`;
}

// =========================================================
// 인바디(체성분) 기록
// =========================================================
const BODY_HINT = {
  weight: '체중(Weight)', fatPct: '체지방률(PBF)', smm: '골격근량(SMM)', tbw: '체수분(TBW)', ecw: '세포외수분비(ECW/TBW) 예: 0.380',
  visceral: '내장지방레벨', waist: '허리둘레 — 결과지에 없으면 줄자로 배꼽 높이', whr: '복부지방률(WHR) 예: 0.88', bmr: '기초대사량(BMR)',
};
const latestBody = () => S.body && S.body.length ? S.body[S.body.length - 1] : null;
function prevBody(r) { const i = S.body.indexOf(r); return i > 0 ? S.body[i - 1] : null; }
function bodySummaryLine() {
  const r = latestBody(); if (!r) return '';
  const a = Logic.bodyAssess(r, S.profile, prevBody(r));
  const bad = a.items.filter(x => x.level === 'bad' || x.level === 'caution');
  return `<p class="small" style="margin:-4px 0 var(--sp-2)"><span class="muted">최근 인바디 ${r.date.slice(5).replace('-', '/')}:</span>
    ${bad.length ? bad.slice(0, 3).map(x => `<span class="lv-${x.level}"><span class="lv-dot ${x.level}"></span>${x.name.split(' ')[0]} ${x.status}</span>`).join(' · ') : '<span class="lv-good"><span class="lv-dot good"></span>모두 정상</span>'}</p>`;
}
function bodyCard() {
  const r = latestBody();
  const today = ymd();
  const form = S.form.bodyOpen ? `<div class="card tight" style="background:var(--surface-2);margin-top:var(--sp-3)">
      <div class="field"><label for="b-date">측정 날짜</label><input type="date" id="b-date" value="${today}" max="${today}"></div>
      <div class="grid2">${Object.entries(Logic.BODY_FIELDS).map(([k, [name, unit]]) => `
        <div class="field"><label for="b-${k}">${name} ${unit ? `<span class="muted">(${unit})</span>` : ''}</label>
        <input id="b-${k}" type="number" inputmode="decimal" step="any" placeholder="${k === 'weight' && S.weights.length ? fmt(S.weights[S.weights.length - 1].kg) : ''}">
        <div class="hint">${BODY_HINT[k]}</div></div>`).join('')}</div>
      <p class="xs muted">아는 항목만 넣어도 돼요. 같은 조건(아침 공복, 화장실 다녀온 뒤)에서 재야 비교가 정확해요.</p>
      <div class="btn-row"><button class="btn" data-act="bodyOpen">취소</button><button class="btn primary" data-act="bodySave">저장</button></div></div>` : '';
  if (!r) return `<div class="card"><div class="card-title">인바디 기록</div>
    <p class="small muted" style="margin-top:0">인바디 결과지를 입력하면 BMI·체지방·복부비만·수분 상태를 색깔로 알려 드려요.</p>
    ${S.form.bodyOpen ? '' : '<button class="btn primary" data-act="bodyOpen">＋ 인바디 입력</button>'}${form}</div>`;
  const a = Logic.bodyAssess(r, S.profile, prevBody(r));
  const metrics = ['weight', 'fatPct', 'smm', 'visceral', 'waist', 'bmi'].filter(k => k === 'bmi' ? S.body.some(b => b.weight) : S.body.some(b => b[k] != null));
  if (!S.form.bodyMetric || !metrics.includes(S.form.bodyMetric)) S.form.bodyMetric = metrics.includes('fatPct') ? 'fatPct' : metrics[0];
  const mName = k => ({ weight: '체중', fatPct: '체지방률', smm: '근육량', visceral: '내장지방', waist: '허리', bmi: 'BMI' })[k];
  return `<div class="card">
    <div class="card-title">인바디 결과 <span class="side">${korDate(r.date)}</span></div>
    ${a.items.map(x => `<div class="assess"><span class="name"><span class="lv-dot ${x.level}"></span>${x.name}</span>
      <span class="val">${x.value}${x.unit ? ' ' + x.unit : ''} <span class="small lv-${x.level}">${x.status}</span></span>
      <span class="std">${x.std}</span></div>`).join('')}
    <div class="notice info" style="margin-bottom:0"><b>이렇게 해 보세요</b><ul style="margin:var(--sp-1) 0 0">${a.advice.map(t => `<li>${t}</li>`).join('')}
      <li>하루 물 권장량 약 <b>${a.water[0]}~${a.water[1]}L</b> (체중 1kg당 30~35ml), 운동한 날은 더 마시세요.</li></ul></div>
    ${metrics.length ? `<div class="choice wrap3" style="margin-top:var(--sp-4)">${metrics.map(k => `<button class="${S.form.bodyMetric === k ? 'on' : ''}" data-act="bodyMetric" data-val="${k}">${mName(k)}</button>`).join('')}</div>
      <div class="chart-box" style="margin-top:var(--sp-3)"><canvas id="chart-body"></canvas></div>` : ''}
    ${S.form.bodyOpen ? '' : '<button class="btn primary" data-act="bodyOpen" style="margin-top:var(--sp-3)">＋ 새 인바디 입력</button>'}${form}
    <details style="margin-top:var(--sp-3)"><summary class="small">인바디 기록 목록 (${S.body.length})</summary><ul class="list small">${[...S.body].reverse().map(b => `<li><div class="item"><span>${b.date}</span>
      <span class="side">${b.weight != null ? fmt(b.weight) + 'kg' : ''} ${b.fatPct != null ? '· ' + b.fatPct + '%' : ''} <button class="btn small" data-act="bodyDel" data-date="${b.date}">삭제</button></span></div></li>`).join('')}</ul></details>
    <p class="xs muted" style="margin-bottom:0">기준: BMI·허리둘레 대한비만학회(2022) · 체지방률·내장지방·세포외수분비 InBody 결과지 해석 · 복부지방률 WHO. 참고용이며 진단이 아니에요.</p>
  </div>`;
}
async function saveBody() {
  const date = $('#b-date').value || ymd();
  const rec = { date };
  for (const k of Object.keys(Logic.BODY_FIELDS)) { const v = num($('#b-' + k).value); if (v != null && v > 0) rec[k] = v; }
  if (Object.keys(rec).length < 2) { toast('한 가지 이상 입력해 주세요'); return; }
  await DB.put('body', rec);
  if (rec.weight) await DB.put('weight', { date, kg: Math.round(rec.weight * 10) / 10 });
  await loadAll();
  const last = S.weights[S.weights.length - 1];
  if (last && last.kg !== S.profile.weight) S.profile.weight = last.kg;
  await syncBmr();
  S.form.bodyOpen = false;
  toast('인바디 기록을 저장했어요');
  rerender();
}
// 가장 최근에 잰 기초대사량을 칼로리 계산에 사용
async function syncBmr() {
  const withBmr = S.body.filter(b => b.bmr);
  const v = withBmr.length ? withBmr[withBmr.length - 1].bmr : null;
  if (v) S.profile.bmrMeasured = v; else delete S.profile.bmrMeasured;
  await DB.put('profile', S.profile);
}
function drawBodyChart() {
  const cv = document.getElementById('chart-body');
  if (!cv || !window.Chart) return;
  if (S.charts.body) { S.charts.body.destroy(); delete S.charts.body; }
  const k = S.form.bodyMetric;
  const rows = S.body.map(b => ({ d: b.date, v: k === 'bmi' ? (b.weight ? Math.round(b.weight / Math.pow(S.profile.height / 100, 2) * 10) / 10 : null) : b[k] })).filter(x => x.v != null);
  const text = cssVar('--text-muted'), line = cssVar('--line'), primary = cssVar('--primary');
  S.charts.body = new Chart(cv, {
    type: 'line',
    data: { labels: rows.map(x => x.d.slice(5).replace('-', '/')), datasets: [{ label: k === 'bmi' ? 'BMI' : Logic.BODY_FIELDS[k][0], data: rows.map(x => x.v), borderColor: primary, backgroundColor: primary, tension: 0.3, pointRadius: 4, borderWidth: 3 }] },
    options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } },
      scales: { x: { ticks: { color: text, maxTicksLimit: 6 }, grid: { color: line } }, y: { ticks: { color: text, maxTicksLimit: 6 }, grid: { color: line } } } },
  });
}

// 코스에 운동 추가: 그날 부위에 맞는 운동을 먼저 보여 줌
function addPicker(dayKey, ids) {
  if (S.form.addFor !== dayKey) return `<button class="btn" data-act="addOpen" data-day="${dayKey}" style="margin-top:var(--sp-3)">＋ 운동 추가</button>`;
  const groups = new Set(Logic.DAYS[dayKey].list.map(id => EX[id].group));
  const cands = EXERCISES.filter(e => !e.cardio && !ids.includes(e.id));
  const fit = cands.filter(e => groups.has(e.group)), other = cands.filter(e => !groups.has(e.group));
  const btn = e => `<button class="btn" style="margin-top:var(--sp-2);justify-content:space-between" data-act="addPick" data-day="${dayKey}" data-id="${e.id}"><span>${e.name}</span><span class="small muted">${e.part} · ${EQUIP_NAME[e.equip]}</span></button>`;
  const n = (adds()[dayKey] || []).length;
  return `<div class="card tight" style="background:var(--surface-2);margin-top:var(--sp-3)">
    <div class="card-title">운동 추가 <button class="btn small" data-act="addClose">닫기</button></div>
    ${n >= 2 ? '<div class="notice warn slim">이미 2개를 추가했어요. 더 넣으면 운동 시간이 길어지고, 시간이 모자라면 유산소가 줄어들 수 있어요.</div>' : '<p class="small muted" style="margin-top:0">한두 개 추가를 권해요. 추가한 운동은 다음부터 이 날마다 함께 나와요.</p>'}
    <div class="small bold">이 날 부위에 맞는 운동</div>${fit.map(btn).join('') || '<p class="small muted">없어요</p>'}
    <details style="margin-top:var(--sp-3)"><summary class="small">다른 부위 운동 (${other.length})</summary>${other.map(btn).join('')}</details>
  </div>`;
}
async function saveAdds(fn) {
  const a = Object.assign({}, adds()); fn(a);
  S.routine.adds = a; await DB.put('routine', S.routine);
}

// =========================================================
// 성장 그래프 (운동별 무게 변화 · 부위별 주간 세트 · 주간 시간·칼로리)
// =========================================================
// =========================================================
// 달력: 운동한 날 표시 (상체 파랑 · 하체 초록 · 전신 보라 · ⚖ 체중/인바디)
// =========================================================
const dayKeyOf = iso => ymd(new Date(iso));
// 날짜별 운동 묶음 { 'YYYY-MM-DD': [{ sessionId, dayKey }] }
function sessionsByDate() {
  const map = {};
  const seen = new Set();
  [...S.strength, ...S.cardio].forEach(r => {
    if (seen.has(r.sessionId)) return; seen.add(r.sessionId);
    (map[dayKeyOf(r.date)] = map[dayKeyOf(r.date)] || []).push({ sessionId: r.sessionId, dayKey: r.dayKey });
  });
  return map;
}
function areaClass(dayKey) {
  const d = Logic.DAYS[dayKey]; if (!d) return 'c-full';
  const up = d.area.includes('upper'), lo = d.area.includes('lower');
  return up && lo ? 'c-full' : up ? 'c-upper' : 'c-lower';
}
// 주 목표 연속 달성 주 수 (이번 주가 아직 안 채워졌으면 지난주부터 셈)
function streakWeeks() {
  const per = {};
  const seen = new Set();
  [...S.strength, ...S.cardio].forEach(r => { if (seen.has(r.sessionId)) return; seen.add(r.sessionId); const w = weekStartOf(new Date(r.date).getTime()); per[w] = (per[w] || 0) + 1; });
  const goal = S.profile.freq;
  let w = weekStartOf(Date.now());
  if ((per[w] || 0) < goal) w -= 7 * 86400000;
  let n = 0;
  while ((per[w] || 0) >= goal) { n++; w -= 7 * 86400000; }
  return n;
}
function calendarCard(sessionList, rowHtml) {
  const now = new Date();
  const cur = S.form.calMonth || `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  S.form.calMonth = cur;
  const [Y, M] = cur.split('-').map(Number);
  const first = new Date(Y, M - 1, 1), days = new Date(Y, M, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // 월요일 시작
  const byDate = sessionsByDate();
  const weighed = new Set([...S.weights.map(w => w.date), ...(S.body || []).map(b => b.date)]);
  const today = ymd();
  // 이번 달 요약
  const monthSessions = sessionList.filter(x => dayKeyOf(x.date).startsWith(cur));
  const mMin = monthSessions.reduce((a, x) => a + (x.min || 0), 0), mKcal = monthSessions.reduce((a, x) => a + x.kcal, 0);
  const daysTrained = new Set(monthSessions.map(x => dayKeyOf(x.date))).size;
  const streak = streakWeeks();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push('<span class="d empty"></span>');
  for (let d = 1; d <= days; d++) {
    const key = `${cur}-${pad2(d)}`;
    const ss = byDate[key] || [];
    const dow = (lead + d - 1) % 7, hol = Logic.HOLIDAYS[key];
    const cls = ['d', hol || dow === 6 ? 'sun' : dow === 5 ? 'sat' : '', key === today ? 'today' : '', key === S.form.calDay ? 'sel' : '', ss.length ? 'has' : '', key > today ? 'future' : ''].join(' ');
    cells.push(`<button class="${cls}" data-act="calDay" data-val="${key}" aria-label="${M}월 ${d}일${hol ? ' ' + hol : ''}${ss.length ? ' 운동함' : ''}"${hol ? ` title="${hol}"` : ''}>
      <span class="n">${d}</span><span class="marks">${ss.slice(0, 3).map(x => `<i class="dot ${areaClass(x.dayKey)}"></i>`).join('')}${weighed.has(key) ? '<i class="scale">⚖</i>' : ''}</span></button>`);
  }
  // 고른 날 기록
  let detail = '';
  const sel = S.form.calDay;
  if (sel && sel.startsWith(cur)) {
    const daySess = sessionList.filter(x => dayKeyOf(x.date) === sel);
    const w = S.weights.find(x => x.date === sel), b = (S.body || []).find(x => x.date === sel);
    const dd = new Date(sel + 'T00:00:00');
    detail = `<div class="cal-detail">
      <div class="card-title" style="margin-bottom:var(--sp-2)">${korDate(dd)}${Logic.HOLIDAYS[sel] ? ` <span class="hol-name">${Logic.HOLIDAYS[sel]}</span>` : ''} <button class="btn small" data-act="calDay" data-val="">닫기</button></div>
      ${w || b ? `<p class="small" style="margin-top:0">⚖ ${w ? `체중 <b>${fmt(w.kg)}kg</b>` : ''}${b && b.fatPct != null ? ` · 체지방률 <b>${b.fatPct}%</b>` : ''}${b && b.smm != null ? ` · 골격근량 <b>${b.smm}kg</b>` : ''}</p>` : ''}
      ${daySess.length ? daySess.map(x => `<div class="card tight" style="background:var(--surface);margin-bottom:var(--sp-2)">
          <div class="row between small"><b>${Logic.DAYS[x.dayKey] ? Logic.DAYS[x.dayKey].name : '운동'}</b><span class="muted">${x.min}분 · 약 ${kc(x.kcal)}kcal</span></div>
          <ul class="list small" style="margin-top:var(--sp-2)">${x.rows.map(r => `<li>${recordRow(r, rowHtml)}</li>`).join('')}</ul></div>`).join('')
        : `<p class="small muted" style="margin:0">${sel > today ? '아직 오지 않은 날이에요.' : '이 날은 운동 기록이 없어요.'}</p>`}
    </div>`;
  }
  return `<div class="card">
    <div class="card-title"><button class="btn small" data-act="calMove" data-d="-1" aria-label="지난달">◀</button>
      <span>${Y}년 ${M}월</span><button class="btn small" data-act="calMove" data-d="1" aria-label="다음 달">▶</button></div>
    <div class="grid3" style="margin-bottom:var(--sp-3)">
      <div class="stat"><div class="label">운동한 날</div><div class="value">${daysTrained}<small>일</small></div></div>
      <div class="stat"><div class="label">운동 시간</div><div class="value">${Math.floor(mMin / 60) ? Math.floor(mMin / 60) + '<small>시간 </small>' : ''}${mMin % 60}<small>분</small></div></div>
      <div class="stat"><div class="label">총 소모</div><div class="value">${kc(mKcal)}<small>kcal</small></div></div>
    </div>
    ${streak > 0 ? `<div class="notice info slim" style="margin-top:0">🔥 <b>${streak}주 연속</b> 주 ${S.profile.freq}회 목표를 달성했어요!</div>` : ''}
    <div class="cal-head">${'월화수목금토일'.split('').map((x, i) => `<span class="${i === 6 ? 'sun' : i === 5 ? 'sat' : ''}">${x}</span>`).join('')}</div>
    <div class="cal">${cells.join('')}</div>
    <div class="legend" style="margin-top:var(--sp-2)"><span><i class="dot c-upper"></i>상체</span><span><i class="dot c-lower"></i>하체</span><span><i class="dot c-full"></i>전신</span><span>⚖ 체중·인바디</span></div>
    ${detail}
  </div>`;
}
// 홈: 이번 주 월~일 칸
function weekStrip() {
  const start = weekStartOf(Date.now()), byDate = sessionsByDate(), today = ymd();
  return `<div class="week-strip">${'월화수목금토일'.split('').map((name, i) => {
    const key = ymd(new Date(start + i * 86400000)), ss = byDate[key] || [];
    const dc = Logic.HOLIDAYS[key] || i === 6 ? 'sun' : i === 5 ? 'sat' : '';
    return `<div class="wd ${dc} ${key === today ? 'today' : ''} ${ss.length ? 'has' : ''}"><span class="nm">${name}</span>
      <span class="ck">${ss.length ? `<i class="dot ${areaClass(ss[0].dayKey)}"></i>` : ''}</span></div>`;
  }).join('')}</div>`;
}

const weekStartOf = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
function growthCard() {
  if (!S.strength.length && !S.cardio.length) return `<div class="card"><div class="card-title">성장 그래프</div><div class="empty small">운동을 기록하면 무게 변화와 부위별 운동량이 여기 그래프로 나와요.</div></div>`;
  const tab = S.form.gTab || 'ex';
  const tabs = [['ex', '운동별 무게'], ['region', '부위별 세트'], ['week', '주간 기록']];
  let body = '';
  if (tab === 'ex') {
    const exIds = [...new Set(S.strength.map(r => r.exId))].filter(id => EX[id]);
    if (!S.form.gEx || !exIds.includes(S.form.gEx)) S.form.gEx = exIds[0];
    body = `<select id="g-ex" style="margin-top:var(--sp-3)">${exIds.map(id => `<option value="${id}" ${id === S.form.gEx ? 'selected' : ''}>${EX[id].name}</option>`).join('')}</select>
      <div class="chart-box" style="margin-top:var(--sp-3)"><canvas id="chart-growth"></canvas></div>
      <p class="xs muted" style="margin-bottom:0">막대: 그날 총 운동량(무게×횟수, 맨손은 총 횟수) · 선: 그날 가장 무거운 무게</p>`;
  } else if (tab === 'region') {
    const wk = S.form.gWeek || 0; // 0 이번 주, 1 지난주
    const start = weekStartOf(Date.now()) - wk * 7 * 86400000, end = start + 7 * 86400000;
    const recs = S.strength.filter(r => { const t = new Date(r.date).getTime(); return t >= start && t < end; });
    const v = Logic.setsByRegion(recs.map(r => ({ exId: r.exId, sets: r.sets.length })));
    const plan = Logic.weekVolume(S.profile.freq, S.profile.level, rules(), subs(), adds());
    body = `<div class="choice" style="margin-top:var(--sp-3)"><button class="${wk === 0 ? 'on' : ''}" data-act="gWeek" data-val="0">이번 주</button><button class="${wk === 1 ? 'on' : ''}" data-act="gWeek" data-val="1">지난주</button></div>
      ${Object.entries(v).map(([name, n]) => {
        const lv = n >= 10 && n <= 20 ? 'good' : n > 20 ? 'caution' : n > 0 ? 'caution' : 'none';
        return `<div style="margin-top:var(--sp-3)"><div class="row between small"><span class="bold">${name}</span><span><b class="lv-${lv}">${n}세트</b> <span class="muted">/ 계획 ${plan[name]}</span></span></div>
          <div class="bar"><span style="width:${Math.min(100, n / 20 * 100)}%;background:var(--${lv === 'good' ? 'good' : lv === 'caution' ? 'caution' : 'line'})"></span></div></div>`;
      }).join('')}
      <p class="xs muted" style="margin-bottom:0">근육이 크려면 부위마다 주 10~20세트가 권장돼요(초보는 그보다 적어도 충분히 늘어요). 운동의 '주로 쓰는 근육' 기준으로 셌어요.</p>`;
  } else {
    body = `<div class="chart-box" style="margin-top:var(--sp-3)"><canvas id="chart-week"></canvas></div>
      <p class="xs muted" style="margin-bottom:0">최근 8주 · 막대: 운동 시간(분) · 선: 순소모 칼로리</p>`;
  }
  return `<div class="card"><div class="card-title">성장 그래프</div>
    <div class="choice wrap3">${tabs.map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-act="gTab" data-val="${k}">${n}</button>`).join('')}</div>${body}</div>`;
}
function drawGrowth() {
  if (!window.Chart) return;
  const text = cssVar('--text-muted'), line = cssVar('--line'), primary = cssVar('--primary'), success = cssVar('--success');
  ['growth', 'week'].forEach(k => { if (S.charts[k]) { S.charts[k].destroy(); delete S.charts[k]; } });
  const axes = (y2) => Object.assign({ x: { ticks: { color: text, maxTicksLimit: 6 }, grid: { color: line } }, y: { ticks: { color: text }, grid: { color: line }, position: 'left' } },
    y2 ? { y2: { ticks: { color: text }, grid: { display: false }, position: 'right' } } : {});
  const cv = document.getElementById('chart-growth');
  if (cv && S.form.gEx) {
    const ex = EX[S.form.gEx], weighted = Logic.isWeighted(ex);
    const rows = S.strength.filter(r => r.exId === S.form.gEx).sort((a, b) => a.date.localeCompare(b.date));
    S.charts.growth = new Chart(cv, { data: { labels: rows.map(r => r.date.slice(5, 10).replace('-', '/')), datasets: [
      { type: 'bar', label: weighted ? '총 운동량(kg)' : '총 횟수', data: rows.map(r => r.sets.reduce((a, x) => a + (weighted ? x.w * x.r : x.r), 0)), backgroundColor: success + '88', yAxisID: 'y' },
      ...(weighted ? [{ type: 'line', label: '최고 무게(kg)', data: rows.map(r => Math.max(...r.sets.map(x => x.w))), borderColor: primary, backgroundColor: primary, tension: 0.3, pointRadius: 4, borderWidth: 3, yAxisID: 'y2' }] : []),
    ] }, options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { labels: { color: text, boxWidth: 12 } } }, scales: axes(weighted) } });
  }
  const cw = document.getElementById('chart-week');
  if (cw) {
    const now = weekStartOf(Date.now()), weeks = Array.from({ length: 8 }, (_, i) => now - (7 - i) * 7 * 86400000);
    const all = [...S.strength, ...S.cardio];
    const agg = weeks.map(w => {
      const rs = all.filter(r => { const t = new Date(r.date).getTime(); return t >= w && t < w + 7 * 86400000; });
      const sess = {}; rs.forEach(r => { sess[r.sessionId] = r.sessionMin || 0; });
      return { min: Object.values(sess).reduce((a, b) => a + b, 0), net: rs.reduce((a, r) => a + (r.net || 0), 0) };
    });
    S.charts.week = new Chart(cw, { data: { labels: weeks.map(w => { const d = new Date(w); return `${d.getMonth() + 1}/${d.getDate()}~`; }), datasets: [
      { type: 'bar', label: '운동 시간(분)', data: agg.map(a => a.min), backgroundColor: primary + '99', yAxisID: 'y' },
      { type: 'line', label: '순소모(kcal)', data: agg.map(a => Math.round(a.net)), borderColor: success, backgroundColor: success, tension: 0.3, pointRadius: 3, borderWidth: 3, yAxisID: 'y2' },
    ] }, options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { labels: { color: text, boxWidth: 12 } } }, scales: axes(true) } });
  }
}
document.addEventListener('change', e => { if (e.target.id === 'g-ex') { S.form.gEx = e.target.value; rerender(); } });

// =========================================================
// 지난 운동 기록 고치기·지우기
// =========================================================
function recordRow(r, rowHtml) {
  const ex = EX[r.exId];
  const store = r.warmup || (ex && ex.cardio) ? 'cardio' : 'strength';
  const e = S.form.recEdit && S.form.recEdit.id === r.id && S.form.recEdit.store === store ? S.form.recEdit : null;
  if (e && store === 'strength') {
    const weighted = Logic.isWeighted(ex);
    return `<div class="small bold">${ex.name} 고치기</div>
      ${e.sets.map((x, i) => `<div class="ctl-row"><span class="label">${i + 1}세트</span><span class="row" style="gap:6px">
        ${weighted ? `<input type="number" inputmode="decimal" step="any" value="${x.w}" data-rec="w" data-i="${i}" style="width:80px;min-height:40px;font-size:var(--fs-md);text-align:center"><span class="small muted">kg ×</span>` : ''}
        <input type="number" inputmode="numeric" value="${x.r}" data-rec="r" data-i="${i}" style="width:64px;min-height:40px;font-size:var(--fs-md);text-align:center"><span class="small muted">${r.unit || '회'}</span>
        <button class="btn small" data-act="recSetDel" data-i="${i}" aria-label="세트 지우기">✕</button></span></div>`).join('')}
      <div class="btn-row" style="margin-top:var(--sp-2)"><button class="btn small" data-act="recSetAdd">＋ 세트</button><button class="btn small" data-act="recCancel">취소</button><button class="btn small primary" data-act="recSave">저장</button></div>`;
  }
  if (e && store === 'cardio') {
    return `<div class="small bold">${r.warmup ? '준비운동' : ex.name} 시간 고치기</div>
      <div class="ctl-row"><span class="label">시간</span><span class="row" style="gap:6px"><input type="number" inputmode="numeric" value="${e.minutes}" data-rec="min" style="width:72px;min-height:40px;text-align:center"><span class="small muted">분</span></span></div>
      <div class="btn-row"><button class="btn small" data-act="recCancel">취소</button><button class="btn small primary" data-act="recSave">저장</button></div>`;
  }
  return `${rowHtml(r)}<div class="row" style="gap:6px;margin-top:6px;justify-content:flex-end">
    <button class="btn small" data-act="recEdit" data-id="${r.id}" data-store="${store}">고치기</button>
    <button class="btn small" data-act="recDel" data-id="${r.id}" data-store="${store}">지우기</button></div>`;
}

async function revertSub(orig) {
  const sb = subs();
  const cur = sb[orig];
  delete sb[orig];
  S.routine.subs = sb;
  await DB.put('routine', S.routine);
  toast(`${EX[cur].name} → ${EX[orig].name}(으)로 되돌렸어요`);
  rerender();
}

// =========================================================
// 4. 운동 진행 (+ 5. 휴식 타이머)
// =========================================================
function makeItem(exId, setsCount) {
  const ex = EX[exId], R = rules();
  const presc = Logic.prescription(ex, S.profile.level, R);
  const rec = S.next[exId];
  const calib = !rec;
  const w = calib ? ex.start : rec.weight;
  const r = calib ? presc.lo : rec.reps;
  const n = setsCount || presc.sets;
  return { exId, presc, calib, sets: Array.from({ length: n }, () => ({ w, r, done: false })), rating: null, startedAt: null, endedAt: null, applyDrop: false, found: null };
}
function startWorkout() {
  unlockAudio(); askNotify();
  const t = planToday();
  S.workout = { id: Date.now(), start: Date.now(), dayKey: t.dayKey, phase: 'warmup', warm: { start: null, minutes: 0 }, items: t.items.map(it => makeItem(it.id, it.sets)), idx: 0, cardio: null, showAlt: false, targetNet: t.targetNet };
  saveDraft();
  go('workout');
}
const curItem = () => S.workout.items[S.workout.idx];

RENDER.workout = () => {
  const w = S.workout;
  if (!w) return go('home');
  if (w.phase === 'cardio') return go('cardio');
  if (w.phase === 'done') return go('summary');
  const d = Logic.DAYS[w.dayKey];
  const head = `<div class="row between"><span class="eyebrow">${d.name}</span><button class="btn small" data-act="endEarly">운동 끝내기</button></div>`;

  if (w.phase === 'warmup') {
    $('#scr-workout').innerHTML = `${head}
      <h1>준비운동</h1>
      <div class="card">
        <p style="margin-top:0">가벼운 유산소 <b>5~10분</b>으로 몸을 데워요.</p>
        <p class="small muted">예: 트레드밀 평지 걷기 시속 5~6km, 실내 자전거 가볍게</p>
        <div class="timer" id="warm-timer">${w.warm.start ? mmss((Date.now() - w.warm.start) / 1000) : '0:00'}</div>
        ${w.warm.start ? '' : '<button class="btn" data-act="warmStart">타이머 시작</button>'}
        <p class="xs muted center" style="margin-bottom:0">타이머 없이 완료하면 5분으로 기록돼요.</p>
      </div>
      ${actionBar('<button class="btn" data-act="warmSkip">건너뛰기</button><button class="btn primary big" data-act="warmDone">준비운동 완료</button>')}`;
    return;
  }

  const it = curItem();
  if (!it.startedAt) { it.startedAt = Date.now(); saveDraft(); }
  const ex = EX[it.exId];
  const R = rules();
  const inc = Logic.increment(ex, R);
  const unit = it.presc.unit;
  const curSet = it.sets.findIndex(s => !s.done);
  const weighted = Logic.isWeighted(ex);
  const rec = S.next[it.exId];

  const setRows = it.sets.map((s, i) => {
    if (s.done) return `<div class="set-row done"><div class="head"><b>${i + 1}세트</b><span>${setLabel(ex, s, unit)} ✓</span></div></div>`;
    if (i !== curSet) return `<div class="set-row"><div class="head"><b>${i + 1}세트</b><span>${setLabel(ex, s, unit)}</span></div></div>`;
    const recTxt = setLabel(ex, { w: it.calib ? ex.start : (rec ? rec.weight : s.w), r: it.calib ? it.presc.lo : (rec ? rec.reps : s.r) }, unit);
    return `<div class="set-row current">
      <div class="head"><b>${i + 1}세트 · 지금</b><span>추천 ${recTxt}</span></div>
      ${weighted ? ctlRow(ex.assist ? '보조 무게' : '중량', stepper('setW', fmt(s.w), 'kg', `data-i="${i}"`, 'inSetW')) : ''}
      ${ctlRow(unit === '초' ? '시간' : '횟수', stepper('setR', s.r, unit, `data-i="${i}" data-step="${it.presc.repStep}"`, 'inSetR'))}
    </div>`;
  }).join('');

  const alts = ex.alts.filter(a => !w.items.some(x => x.exId === a));
  $('#scr-workout').innerHTML = `${head}
    <div class="row between" style="margin-top:var(--sp-3)"><span class="tag">근력 ${w.idx + 1} / ${w.items.length}</span><span class="small muted">${ex.part} · ${EQUIP_NAME[ex.equip]}</span></div>
    <h1 style="margin-top:var(--sp-2)">${ex.name}</h1>
    ${it.calib ? `<div class="notice warn"><b>처음 하는 운동 · 기준 중량 찾기</b><br>${weighted
      ? `가벼운 무게(${ex.equip === 'barbell' ? '빈 봉' : '가장 가벼운 무게'})부터 세트마다 조금씩 올려 보세요. 목표 ${it.presc.lo}${unit}를 <b>2~3회 여유 있게</b> 할 수 있는 무게를 찾으면 돼요.`
      : '편하게 할 수 있는 만큼 하고 실제 횟수를 기록하세요. 그 횟수가 다음부터의 기준이 돼요.'}</div>` : ''}
    ${FIG.pair(ex.id)}
    ${MUSCLE.card(ex.id)}
    <div class="row between" style="margin:var(--sp-3) 0">
      <a href="${youtubeLink(ex)}" target="_blank" rel="noopener" class="small">▶ 유튜브 자세 영상</a>
      <span class="xs muted">${it.presc.sets}세트 × ${it.presc.lo}~${it.presc.hi}${unit} · 휴식 ${it.presc.rest}초</span>
    </div>
    <details class="card tight"><summary class="small">자세 안내</summary>
      <p class="small bold" style="margin:0">추천 자세</p><ul class="small">${ex.tips.map(t => `<li>${t}</li>`).join('')}</ul>
      <p class="small bold" style="margin:0;color:var(--danger)">주의 자세</p><ul class="small" style="margin-bottom:0">${ex.cautions.map(t => `<li>${t}</li>`).join('')}</ul>
    </details>
    <div class="notice danger slim">운동 중 통증이 생기면 즉시 중단하세요.</div>
    ${setRows}
    <div class="btn-row" style="margin-top:var(--sp-3)"><button class="btn" data-act="addSet">＋ 세트 추가</button><button class="btn" data-act="toggleAlt">대체 운동</button></div>
    ${w.showAlt ? `<div class="card" style="margin-top:var(--sp-3)"><div class="card-title">대체 운동 고르기</div><p class="small muted" style="margin-top:0">고르면 루틴 자체가 바뀌고 다음 번에도 이 운동으로 추천해요. 루틴 화면에서 되돌릴 수 있어요.</p>
      ${alts.length ? alts.map(a => `<button class="btn" style="margin-top:var(--sp-2);justify-content:space-between" data-act="substitute" data-to="${a}"><span>${EX[a].name}</span><span class="small muted">${EX[a].part}</span></button>`).join('') : '<p class="small muted">오늘 루틴에 없는 대체 운동이 없어요.</p>'}
    </div>` : ''}
    ${it.sets.some(s => s.done) ? '' : '<button class="btn ghost" data-act="skipEx" style="margin-top:var(--sp-2)">이 운동 건너뛰기</button>'}
    ${actionBar(curSet >= 0 ? `<button class="btn success big" data-act="setDone">${curSet + 1}세트 완료</button>` : '<button class="btn primary big" data-act="toEval">평가하기</button>')}`;
};

// 세트 무게·횟수 바꾸기 (지금 세트와 남은 세트에 같이 적용)
//  무게 +/−: 덤벨 20kg까지 1kg, 넘으면 2.5kg / 바벨 2.5kg / 머신 한 칸
function setSetValue(field, i, v) {
  const it = curItem();
  v = field === 'w' ? Math.max(0, Math.round(v * 10) / 10) : Math.max(1, Math.round(v));
  for (let k = i; k < it.sets.length; k++) if (!it.sets[k].done) it.sets[k][field] = v;
  saveDraft(); rerender();
}
function adjustSet(field, i, d, step) {
  const it = curItem(), s = it.sets[i];
  if (field === 'w') setSetValue('w', i, Logic.weightStep(EX[it.exId], s.w, d, rules()));
  else setSetValue('r', i, s.r + d * step);
}

function setDone() {
  if (!S.workout || S.workout.phase !== 'strength') return;
  unlockAudio();
  const it = curItem();
  const i = it.sets.findIndex(s => !s.done);
  if (i < 0) return;
  it.sets[i].done = true;
  const remain = it.sets.some(s => !s.done);
  if (!remain) it.endedAt = Date.now();
  saveDraft();
  if (remain) { rerender(); startRest(it.presc.rest); }
  else go('eval');
}

// 5. 휴식 타이머
function startRest(sec) {
  S.rest = { end: Date.now() + sec * 1000, total: sec, warned: sec <= 12 };
  renderRest();
  $('#ovl-rest').classList.add('active');
  restNotify();
}
function renderRest() {
  if (!S.rest) return;
  const left = (S.rest.end - Date.now()) / 1000;
  const it = S.workout && curItem();
  const nextSet = it ? it.sets.findIndex(s => !s.done) + 1 : 0;
  const ex = it ? EX[it.exId] : null;
  $('#rest-inner').innerHTML = `
    <div class="eyebrow center">휴식 중</div>
    <h1 class="center">다음은 ${nextSet}세트</h1>
    ${ex ? `<p class="center muted small" style="margin-top:-8px">${ex.name} · ${setLabel(ex, it.sets[nextSet - 1], it.presc.unit)}</p>` : ''}
    <div class="ring"><svg viewBox="0 0 100 100"><circle class="track" cx="50" cy="50" r="44"/><circle class="prog" id="rest-ring" cx="50" cy="50" r="44" stroke-dasharray="276.5" stroke-dashoffset="0"/></svg><div class="timer" id="rest-timer">${mmss(left)}</div></div>
    <div class="btn-row"><button class="btn big" data-act="restAdj" data-d="-30">−30초</button><button class="btn big" data-act="restAdj" data-d="30">+30초</button></div>
    <button class="btn primary big" data-act="restSkip" style="margin-top:var(--sp-3)">건너뛰기</button>
    <p class="xs muted center" style="margin-top:var(--sp-4)">10초 전에 짧게, 끝나면 <b>진동 3초 + 소리 + 화면 팝업</b>으로 알려 드려요.<br>휴대폰 상태표시줄에도 남은 시간이 보여요.</p>`;
  updateRestRing();
}
function updateRestRing() {
  if (!S.rest) return;
  const left = Math.max(0, (S.rest.end - Date.now()) / 1000);
  const t = $('#rest-timer'); if (t) t.textContent = mmss(left);
  const r = $('#rest-ring'); if (r) r.setAttribute('stroke-dashoffset', (276.5 * (1 - left / Math.max(S.rest.total, left))).toFixed(1));
}
function endRest(alert) {
  S.rest = null;
  clearRestNotify();
  $('#ovl-rest').classList.remove('active');
  if (alert) {
    const it = S.workout && S.workout.items && curItem();
    const n = it ? it.sets.findIndex(s => !s.done) + 1 : 0;
    strongAlert('휴식 끝!', it && n ? `${EX[it.exId].name} ${n}세트를 시작하세요` : '다음 세트를 시작하세요');
  }
}

// 대체 운동 (4-10)
async function substitute(toId) {
  const w = S.workout;
  const it = curItem();
  const sb = subs();
  const cur = it.exId;
  const orig = Object.keys(sb).find(k => sb[k] === cur) || Logic.baseInDay(w.dayKey, cur);
  if (toId === orig) delete sb[orig]; else sb[orig] = toId;
  S.routine.subs = sb;
  await DB.put('routine', S.routine);
  w.items[w.idx] = makeItem(toId, it.sets.length);
  w.showAlt = false;
  saveDraft();
  toast(`다음 번부터 ${EX[toId].name}(으)로 추천해요`);
  rerender();
}

// =========================================================
// 6. 운동 평가 (4-6)
// =========================================================
function computeResult(it) {
  if (!it.rating) return null;
  const ex = EX[it.exId], R = rules();
  const doneSets = it.sets.filter(s => s.done);
  let res;
  if (it.calib) res = Logic.calibrated(ex, doneSets, it.presc, it.rating, doneSets.length ? doneSets[doneSets.length - 1].w : ex.start, R);
  else {
    const rec = S.next[it.exId];
    const actualW = doneSets.length ? doneSets[doneSets.length - 1].w : rec.weight;
    res = Logic.nextRec(ex, { weight: actualW, reps: rec.reps, hardStreak: rec.hardStreak || 0 }, doneSets, it.rating, it.presc, R);
    if (res.suggestDrop && it.applyDrop) res = Object.assign({}, res, { weight: res.dropTo, hardStreak: 0, note: `${res.note} → ${R.failDropPct}% 감소 적용` });
  }
  // 내가 직접 고친 다음 목표
  if (it.override) res = Object.assign({}, res, { weight: it.override.weight, reps: it.override.reps, manual: true, auto: { weight: res.weight, reps: res.reps } });
  return res;
}

RENDER.eval = () => {
  const w = S.workout;
  const it = curItem();
  const ex = EX[it.exId];
  const unit = it.presc.unit;
  const doneSets = it.sets.filter(s => s.done);
  const weighted = Logic.isWeighted(ex);
  const res = computeResult(it);
  const isLast = w.idx >= w.items.length - 1;
  const R = rules();
  $('#scr-eval').innerHTML = `
    <div class="eyebrow">${Logic.DAYS[w.dayKey].name} · 근력 ${w.idx + 1} / ${w.items.length}</div>
    <h1>${ex.name}<br>어땠나요?</h1>
    <div class="card tight"><div class="kv">${doneSets.map((s, i) => `<span>${i + 1}세트</span><span>${setLabel(ex, s, unit)}</span>`).join('') || '<span>기록된 세트가 없어요</span><span></span>'}</div></div>
    <p class="xs muted" style="margin-bottom:var(--sp-2)">RPE: 느낀 힘든 정도(1~10) · RIR: 더 할 수 있었던 횟수</p>
    <div class="choice col">
      ${Object.entries(RATINGS).map(([k, t]) => ratingBtn('rate', k, it.rating, RATING_DESC)).join('')}
    </div>
    ${res ? `<div class="card" style="margin-top:var(--sp-3)">
      <div class="card-title">다음 번 목표 ${res.manual ? '<span class="tag primary">직접 정함</span>' : '<span class="tag">앱 추천</span>'}</div>
      ${weighted ? ctlRow(ex.assist ? '보조 무게' : '무게', stepper('nextW', fmt(res.weight), 'kg', '', 'inNextW')) : ''}
      ${ctlRow(unit === '초' ? '시간' : '횟수', stepper('nextR', res.reps, unit, `data-step="${it.presc.repStep}"`, 'inNextR'))}
      <p class="small muted" style="margin:var(--sp-2) 0 0">${res.manual ? `앱 추천은 ${weighted ? wLabel(ex, res.auto.weight) + ' × ' : ''}${res.auto.reps}${unit}였어요. 직접 느낀 대로 정한 값으로 저장돼요.` : res.note + ' · 직접 느낀 대로 고쳐도 돼요.'}</p>
      ${res.manual ? '<button class="btn small" data-act="nextReset" style="margin-top:var(--sp-2)">앱 추천으로 되돌리기</button>' : ''}
      ${res.suggestDrop ? `<div class="notice warn">'한계 근접(RPE 9~10)'이 ${R.hardStreakLimit}회 연속이에요. 중량을 ${R.failDropPct}% 줄여 ${wLabel(ex, res.dropTo)}(으)로 하는 것을 제안해요.
        <button class="btn small" style="margin-top:var(--sp-2)" data-act="toggleDrop">${it.applyDrop ? '감소 취소' : `${R.failDropPct}% 줄이기 적용`}</button></div>` : ''}
    </div>` : ''}
    ${actionBar(`<button class="btn primary big" data-act="evalNext" ${it.rating ? '' : 'disabled'}>${isLast ? '유산소로 넘어가기' : '다음 운동'}</button>`)}`;
};

function evalNext() { curItem().result = computeResult(curItem()); advanceItem(); }
function advanceItem() {
  const w = S.workout;
  w.showAlt = false;
  if (w.idx >= w.items.length - 1) { w.phase = 'cardio'; saveDraft(); go('cardio'); }
  else { w.idx++; saveDraft(); go('workout'); }
}

// =========================================================
// 7. 유산소 진행 (4-7, 4-8 + 칼로리로 시간 정하기)
// =========================================================
// 지금까지 실제로 쓴 순소모(준비운동 + 근력)
function doneNetSoFar() {
  const w = S.workout, kg = S.profile.weight;
  let n = w.warm.minutes > 0 ? Logic.netKcal(Logic.WARMUP.met, kg, w.warm.minutes) : 0;
  w.items.forEach(it => {
    const sets = it.sets.filter(s => s.done);
    if (!sets.length) return;
    const min = Math.max(1, ((it.endedAt || Date.now()) - it.startedAt) / 60000);
    n += Logic.netKcal(Logic.strengthMET(EX[it.exId], it.rating, sets[sets.length - 1].w).met, kg, min);
  });
  return n;
}
function initCardio() {
  const w = S.workout;
  if (w.cardio) return;
  const p = S.profile, R = rules();
  const g = goal();
  const elapsed = (Date.now() - w.start) / 60000;
  const fitMin = Math.max(0, Math.floor((p.minutes - elapsed) / 5) * 5);
  let { intensity, reason } = Logic.cardioIntensity(p, w.dayKey, g.direction, intervalsThisWeek());
  if (intensity === 'high' && fitMin < 20) { intensity = 'low'; reason = '시간이 부족해 인터벌 대신 저강도로 해요'; }
  const doneNet = doneNetSoFar();
  w.cardio = { intensity, reason, exId: Logic.CARDIO_INT[intensity].ex, fitMin, doneNet: Math.round(doneNet), needNet: w.targetNet ? Math.max(0, Math.round(w.targetNet - doneNet)) : 0, elapsedMs: 0, runStart: null, finished: false, rating: null, force: false, lastPhase: null, goalAlerted: false, manualMin: false };
  loadCardioSettings();
  saveDraft();
}
function loadCardioSettings() {
  const c = S.workout.cardio;
  c.set = cardioSettings(c.exId, c.intensity);
  c.manualMin = false;
  autoMinutes();
}
// 설정(속도·경사·와트)에 맞춰 필요한 시간 다시 계산
function autoMinutes() {
  const c = S.workout.cardio, g = goal(), R = rules();
  const met = Logic.cardioMET(c.exId, c.intensity, c.set, S.profile.weight).met;
  const res = Logic.cardioMinutes({ direction: g.direction, intensity: c.intensity, needNet: c.needNet, met, kg: S.profile.weight, fitMin: c.fitMin, R });
  if (!c.manualMin) {
    let m = res.minutes;
    if (g.direction !== 'loss') { const saved = S.next[`cardio:${c.exId}:${c.intensity}`]; if (saved && saved.minutes) m = Math.min(saved.minutes, c.fitMin); }
    c.minutes = c.force ? Math.max(m, R.cardioMinMinutes) : m;
  }
  c.skip = res.skip;
  c.limited = res.limited;
  c.want = res.want;
}
const cardioElapsed = c => (c.elapsedMs + (c.runStart ? Date.now() - c.runStart : 0)) / 1000;
function intervalPhase(sec) {
  if (sec < 120) return { name: '준비 · 천천히', key: 'warm' };
  const k = Math.floor((sec - 120) / 120);
  if (k < 8) { const within = (sec - 120) % 120; return within < 30 ? { name: `${k + 1}/8 빠르게! 30초`, key: 'f' + k, fast: true } : { name: `${k + 1}/8 천천히 90초`, key: 's' + k }; }
  return { name: '정리 · 천천히', key: 'cool' };
}
function cardioSetText(ex, s, intensity) {
  const w = s.watts ? ` · ${s.watts}W` : '';
  if (ex.ctl === 'speed') return `시속 ${fmt(s.speed)}km · 경사 ${s.incline}%`;
  return intensity === 'high' ? `빠르게 ${s.level}단계${w} / 천천히 ${s.easyLevel}단계` : `${s.level}단계${w}`;
}
function cardioMinutesDone(c) {
  const m = c.res && num(c.res.min);
  if (m) return m;
  const e = cardioElapsed(c) / 60; return e >= 1 ? Math.round(e) : c.minutes;
}
// 입력한 결과로 평균 속도·칼로리 계산
//  칼로리를 입력하면 기계 값을 쓰고(순소모 = 입력값 − 가만히 있을 때 쓰는 열량), 비워 두면 MET로 계산
function cardioResult(c) {
  const kg = S.profile.weight, ex = EX[c.exId], r = c.res || {};
  const min = cardioMinutesDone(c), km = num(r.km), incline = ex.ctl === 'speed' ? (num(r.incline) ?? c.set.incline ?? 0) : null, kcalM = num(r.kcal);
  const avg = km && min ? Math.round(km / (min / 60) * 10) / 10 : null;
  const m = ex.ctl === 'speed' && avg ? Logic.acsmTreadmill(avg, incline || 0) : Logic.cardioMET(c.exId, c.intensity, c.set, kg);
  const kcal = kcalM || Logic.kcal(m.met, kg, min);
  const net = kcalM ? Math.max(0, kcalM - kg * min / 60) : Logic.netKcal(m.met, kg, min);
  return { min, km, incline, avg, kcal, net, met: m.met, src: kcalM ? '기계 표시값' : `계산값 (MET ${m.met})` };
}
function cardioCalcText(c) {
  const r = cardioResult(c);
  return `${r.avg ? `평균 속도 <b>시속 ${fmt(r.avg)}km</b> · ` : ''}${r.min}분 · 칼로리 <b>약 ${kc(r.kcal)}kcal</b> <span class="muted">(${r.src})</span>`;
}

RENDER.cardio = () => {
  const w = S.workout;
  if (!w) return go('home');
  initCardio();
  const c = w.cardio;
  const I = Logic.CARDIO_INT[c.intensity];
  const ex = EX[c.exId];
  const kg = S.profile.weight;
  const g = goal();
  const hr = Logic.hrRange(S.profile.age, c.intensity);

  if (c.skip && !c.force) {
    $('#scr-cardio').innerHTML = `
      <div class="eyebrow">유산소</div><h1>시간이 부족해요</h1>
      <div class="notice warn">남은 시간이 약 ${c.fitMin}분이라 유산소 최소 ${rules().cardioMinMinutes}분이 안 돼요. 유산소는 다음 날로 넘기는 것을 권해요.</div>
      ${g.direction === 'loss' && c.needNet > 0 ? `<p class="small muted">오늘 목표까지 약 ${kc(c.needNet)}kcal가 남았어요. 식단에서 조금 더 줄이거나 다음 운동에서 채우면 돼요.</p>` : ''}
      ${actionBar('<button class="btn" data-act="cardioForce">그래도 하기</button><button class="btn primary big" data-act="cardioSkip">유산소 없이 마치기</button>')}`;
    return;
  }

  const el = cardioElapsed(c);
  const running = !!c.runStart;
  const cm = Logic.cardioMET(c.exId, c.intensity, c.set, kg);
  const estNet = Logic.netKcal(cm.met, kg, c.minutes);
  const isTm = ex.ctl === 'speed';
  const r = c.res || (c.res = {});
  const inp = (k, label, unit, ph, hint = '') => `<div class="field"><label for="cr-${k}">${label} <span class="muted">(${unit})</span></label>
    <input id="cr-${k}" type="number" inputmode="decimal" step="any" data-cres="${k}" value="${r[k] ?? ''}" placeholder="${ph}">${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
  $('#scr-cardio').innerHTML = `
    <div class="row between"><span class="tag primary">유산소 · ${I.name}</span><button class="btn small" data-act="endEarly">운동 끝내기</button></div>
    <h1 style="margin-top:var(--sp-3)">${ex.name}</h1>
    <p class="small muted" style="margin-top:-8px">${c.reason}</p>
    <div class="choice wrap2" style="margin-bottom:var(--sp-3)">${I.allowed.map(id => `<button class="${id === c.exId ? 'on' : ''}" data-act="cardioEx" data-val="${id}">${EX[id].name}</button>`).join('')}</div>
    <div class="card">
      <div class="card-title">오늘 추천 <span class="side">참고용</span></div>
      <div class="kv">
        <span>시간</span><span>${c.intensity === 'high' ? '20분 (인터벌)' : `약 ${c.minutes}분`}</span>
        <span>설정</span><span>${cardioSetText(ex, c.set, c.intensity)}</span>
        <span>목표 심박수</span><span>${hr.hr[0]}~${hr.hr[1]}회/분</span>
        <span>예상 순소모</span><span>약 ${kc(estNet)}kcal</span>
      </div>
      <p class="xs muted" style="margin-bottom:0">느낌: ${I.feel} · 최대 심박수 약 ${hr.maxHR}회/분의 ${I.hr[0]}~${I.hr[1]}%${g.direction === 'loss' && c.needNet > 0 ? ` · 오늘 목표까지 남은 열량 약 ${kc(c.needNet)}kcal` : ''}</p>
    </div>
    ${FIG.pair(ex.id)}
    ${MUSCLE.card(ex.id)}
    <details class="card tight" style="margin-top:var(--sp-3)"><summary class="small">자세 안내</summary><ul class="small">${ex.tips.map(t => `<li>${t}</li>`).join('')}</ul>
      <p class="small bold" style="margin:0;color:var(--danger)">주의</p><ul class="small" style="margin-bottom:0">${ex.cautions.map(t => `<li>${t}</li>`).join('')}</ul></details>
    ${c.intensity === 'high' ? `<div class="card center">
      <div class="small muted">인터벌 타이머 · 2분 준비 → (30초 빠르게 + 90초 천천히) × 8회 → 2분 정리</div>
      <div id="c-phase" class="bold" style="font-size:var(--fs-xl);margin-top:var(--sp-2)">${intervalPhase(el).name}</div>
      <div class="timer" id="c-timer">${mmss(el)}</div>
      <button class="btn ${running ? '' : 'primary'}" data-act="cardioToggle">${running ? '일시정지' : (el > 0 ? '계속' : '타이머 시작')}</button>
    </div>` : ''}
    <div class="card">
      <div class="card-title">운동 결과 입력</div>
      <p class="small muted" style="margin-top:0">끝나면 기계 화면에 나온 값을 넣어 주세요. 평균 속도와 칼로리는 자동으로 계산돼요.</p>
      <div class="grid2">
        ${inp('min', '시간', '분', c.intensity === 'high' ? '20' : String(c.minutes))}
        ${inp('km', '거리', 'km', '예: 2.5')}
        ${isTm ? inp('incline', '경사', '%', String(c.set.incline ?? 0)) : ''}
        ${inp('kcal', '칼로리', 'kcal', '기계 표시값', '모르면 비워 두세요')}
      </div>
      <div class="notice info slim" id="c-calc">${cardioCalcText(c)}</div>
    </div>
    <p class="small bold" style="margin-bottom:var(--sp-2)">느낌은 어땠나요? <span class="muted xs">(다음 번 추천에 반영)</span></p>
    <div class="choice col">${Object.keys(RATINGS).map(k => ratingBtn('cardioRate', k, c.rating, RATING_DESC_CARDIO)).join('')}</div>
    <div class="notice danger slim">어지럽거나 가슴이 아프면 즉시 멈추세요.</div>
    ${actionBar('<button class="btn success big" data-act="cardioDone">결과 저장하고 요약 보기</button>')}`;
};

// =========================================================
// 8. 운동 완료 요약 (4-9)
// =========================================================
function sessionCalc() {
  const w = S.workout;
  const kg = S.profile.weight;
  const rows = [];
  let total = 0, net = 0;
  const addRow = (o, met, min) => { const k = Logic.kcal(met, kg, min), n = Logic.netKcal(met, kg, min); total += k; net += n; rows.push(Object.assign(o, { kcal: k, net: n, met, min })); };
  if (w.warm.minutes > 0) addRow({ name: '준비운동', detail: `${w.warm.minutes}분`, warm: true }, Logic.WARMUP.met, w.warm.minutes);
  w.items.forEach(it => {
    const ex = EX[it.exId];
    const sets = it.sets.filter(s => s.done);
    if (!sets.length) { rows.push({ name: ex.name, detail: '건너뜀', kcal: 0, net: 0, skipped: true }); return; }
    const min = Math.max(1, ((it.endedAt || Date.now()) - it.startedAt) / 60000);
    addRow({ name: ex.name, detail: sets.map(s => setLabel(ex, s, it.presc.unit)).join(', '), rating: it.rating, it }, Logic.strengthMET(ex, it.rating, sets[sets.length - 1].w).met, min);
  });
  const c = w.cardio;
  if (c && c.finished) {
    const ex = EX[c.exId], r = cardioResult(c);
    total += r.kcal; net += r.net;
    rows.push({ name: `${ex.name} (${Logic.CARDIO_INT[c.intensity].name})`, detail: `${r.min}분${r.km ? ` · ${fmt(r.km)}km · 평균 시속 ${fmt(r.avg)}km` : ''}${r.incline ? ` · 경사 ${fmt(r.incline)}%` : ''} · ${r.src}`, rating: c.rating, cardio: true, kcal: r.kcal, net: r.net, met: r.met, min: r.min, res: r });
  }
  return { rows, total, net, minutes: Math.max(1, Math.round((Date.now() - w.start) / 60000)) };
}

RENDER.summary = () => {
  const w = S.workout;
  if (!w) return go('home');
  const s = sessionCalc();
  const pct = w.targetNet ? Math.min(100, Math.round(s.net / w.targetNet * 100)) : null;
  $('#scr-summary').innerHTML = `
    <div class="eyebrow">${Logic.DAYS[w.dayKey].name}</div>
    <h1>운동 완료!</h1>
    <div class="grid3" style="margin-bottom:var(--sp-3)">
      <div class="stat"><div class="label">운동 시간</div><div class="value">${s.minutes}<small>분</small></div></div>
      <div class="stat"><div class="label">총 소모</div><div class="value">약 ${kc(s.total)}<small>kcal</small></div></div>
      <div class="stat"><div class="label">순소모</div><div class="value">약 ${kc(s.net)}<small>kcal</small></div></div>
    </div>
    ${pct != null ? `<div class="card tight"><div class="row between small"><span class="muted">오늘 목표 순소모 약 ${kc(w.targetNet)}kcal</span><b>${pct}%</b></div>
      <div class="bar"><span class="b3" style="width:${pct}%"></span></div></div>` : ''}
    <div class="card">
      <ul class="list">${s.rows.map(r => `<li><div class="item"><span class="title">${r.name}</span><span class="side">${r.kcal ? `약 ${kc(r.kcal)}kcal` : ''}${r.rating ? `<br><span class="tag">${RATINGS[r.rating]} · ${RATING_RPE[r.rating]}</span>` : ''}</span>
        <span class="sub">${r.detail}${r.met && !r.cardio ? ` · MET ${r.met}` : ''}</span></div></li>`).join('')}</ul>
    </div>
    <p class="xs muted">총 소모 = MET × 체중 × 시간. 순소모는 가만히 있을 때보다 운동으로 더 쓴 열량((MET−1) × 체중 × 시간)이에요. 모두 추정치예요.</p>
    <button class="btn danger" data-act="discardSession">저장하지 않고 나가기</button>
    ${actionBar('<button class="btn primary big" data-act="saveSession">저장</button>')}`;
};

async function saveSession() {
  const w = S.workout;
  const s = sessionCalc();
  const date = new Date().toISOString();
  const base = { date, sessionId: w.id, dayKey: w.dayKey, sessionMin: s.minutes };
  for (const r of s.rows) {
    if (r.skipped) continue;
    if (r.warm) { await DB.put('cardio', Object.assign({}, base, { exId: 'warmup', warmup: true, minutes: w.warm.minutes, kcal: Math.round(r.kcal), net: Math.round(r.net) })); continue; }
    if (r.cardio) continue;
    const it = r.it;
    await DB.put('strength', Object.assign({}, base, { exId: it.exId, sets: it.sets.filter(x => x.done).map(x => ({ w: x.w, r: x.r })), unit: it.presc.unit, rating: it.rating, calib: it.calib, minutes: Math.round(r.min), kcal: Math.round(r.kcal), net: Math.round(r.net), met: r.met }));
    if (it.result) await DB.put('next', { key: it.exId, weight: it.result.weight, reps: it.result.reps, hardStreak: it.result.hardStreak || 0, manual: !!it.result.manual, updated: date });
  }
  const c = w.cardio;
  const cr = s.rows.find(r => r.cardio);
  if (c && c.finished && cr) {
    const ex = EX[c.exId];
    const x = cr.res;
    await DB.put('cardio', Object.assign({}, base, { exId: c.exId, intensity: c.intensity, minutes: x.min, km: x.km, avgSpeed: x.avg, incline: x.incline, kcalSource: x.src, set: c.set, rating: c.rating, kcal: Math.round(x.kcal), net: Math.round(x.net), met: x.met }));
    if (c.rating) {
      const res = Logic.cardioNext(ex, c.intensity, Object.assign({ minutes: x.min }, c.set), c.rating, goal().direction === 'loss');
      const { minutes, ...set } = res.next;
      await DB.put('next', { key: `cardio:${c.exId}:${c.intensity}`, minutes, set, updated: date });
    }
  }
  S.routine.pointer += 1;
  await DB.put('routine', S.routine);
  S.workout = null; saveDraft(); keepAwake(false);
  await loadAll();
  toast('운동 기록을 저장했어요');
  go('home');
}

// =========================================================
// 9-1. 기록 (날짜별 운동 기록, 체중 입력·그래프)
// =========================================================
RENDER.records = () => {
  const lastW = S.weights.length ? S.weights[S.weights.length - 1].kg : S.profile.weight;
  if (S.form.wInput == null) S.form.wInput = lastW;
  const sessions = {};
  [...S.strength, ...S.cardio].forEach(r => {
    const s = sessions[r.sessionId] || (sessions[r.sessionId] = { id: r.sessionId, date: r.date, dayKey: r.dayKey, min: r.sessionMin, kcal: 0, net: 0, rows: [] });
    s.kcal += r.kcal || 0; s.net += r.net || 0; s.rows.push(r);
    if (r.date < s.date) s.date = r.date;
  });
  const list = Object.values(sessions).sort((a, b) => b.date.localeCompare(a.date));
  const rowHtml = r => {
    if (r.warmup) return `<div class="item"><span class="title">준비운동</span><span class="side">${r.minutes}분</span></div>`;
    const ex = EX[r.exId];
    if (!ex) return r.exId;
    if (ex.cardio) return `<div class="item"><span class="title">${ex.name}</span><span class="side">${r.minutes}분${r.km ? `<br>${fmt(r.km)}km` : ''}</span><span class="sub">${Logic.CARDIO_INT[r.intensity].name}${r.avgSpeed ? ` · 평균 시속 ${fmt(r.avgSpeed)}km` : ''}${r.incline ? ` · 경사 ${fmt(r.incline)}%` : ''}${r.rating ? ' · ' + RATINGS[r.rating] : ''}</span></div>`;
    return `<div class="item"><span class="title">${ex.name} ${r.calib ? '<span class="tag">기준 찾기</span>' : ''}</span><span class="side">${r.rating ? RATINGS[r.rating] : ''}</span>
      <span class="sub">${r.sets.map(s => setLabel(ex, s, r.unit || '회')).join(', ')}</span></div>`;
  };
  $('#scr-records').innerHTML = `
    <div class="eyebrow">기록</div><h1>몸과 운동 기록</h1>
    ${calendarCard(list, rowHtml)}
    ${bodyCard()}
    <div class="card">
      <div class="card-title">체중 기록</div>
      <div class="field"><label for="w-date">날짜</label><input type="date" id="w-date" value="${ymd()}" max="${ymd()}"></div>
      ${ctlRow('체중', stepper('wStep', fmt(S.form.wInput), 'kg', 'data-step="0.1"', 'inWeight'))}
      <button class="btn primary" data-act="saveWeight" style="margin-top:var(--sp-3)">체중 저장</button>
      <div class="chart-box" style="margin-top:var(--sp-4)"><canvas id="chart-weight"></canvas></div>
      ${S.weights.length ? `<details style="margin-top:var(--sp-3)"><summary class="small">체중 기록 목록 (${S.weights.length})</summary><ul class="list small">${[...S.weights].reverse().map(w => `<li><div class="item"><span>${w.date}</span><span class="side"><b style="color:var(--text)">${fmt(w.kg)}kg</b> <button class="btn small" data-act="delWeight" data-date="${w.date}">삭제</button></span></div></li>`).join('')}</ul></details>` : ''}
    </div>
    ${growthCard()}
    <h2>운동 기록</h2>
    ${list.length ? list.map(s => `<details class="card" ${S.form.recOpen === s.id ? 'open' : ''}><summary><span>${korDate(s.date)} <span class="small muted">${Logic.DAYS[s.dayKey] ? Logic.DAYS[s.dayKey].name : ''}</span></span></summary>
      <div class="grid3" style="margin-bottom:var(--sp-3)"><div class="stat"><div class="label">시간</div><div class="value">${s.min}<small>분</small></div></div>
        <div class="stat"><div class="label">총 소모</div><div class="value">${kc(s.kcal)}<small>kcal</small></div></div>
        <div class="stat"><div class="label">순소모</div><div class="value">${kc(s.net)}<small>kcal</small></div></div></div>
      <ul class="list small">${s.rows.map(r => `<li>${recordRow(r, rowHtml)}</li>`).join('')}</ul>
      <button class="btn danger small" data-act="recDelSession" data-sid="${s.id}" style="margin-top:var(--sp-3)">이 날 운동 기록 모두 지우기</button></details>`).join('')
      : '<div class="empty">아직 운동 기록이 없어요.<br>홈에서 운동을 시작해 보세요.</div>'}`;
  drawWeightChart('chart-weight', false);
  drawBodyChart();
  drawGrowth();
};

async function saveWeight() {
  const date = $('#w-date').value || ymd();
  const kg = Math.round(S.form.wInput * 10) / 10;
  await DB.put('weight', { date, kg });
  await loadAll();
  const last = S.weights[S.weights.length - 1];
  if (last && last.kg !== S.profile.weight) { S.profile.weight = last.kg; await DB.put('profile', S.profile); }
  toast(`${date} 체중 ${fmt(kg)}kg 저장`);
  rerender();
}

function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function drawWeightChart(canvasId, mini) {
  const cv = document.getElementById(canvasId);
  if (!cv) return;
  if (S.charts[canvasId]) { S.charts[canvasId].destroy(); delete S.charts[canvasId]; }
  const data = mini ? S.weights.slice(-30) : S.weights;
  if (!window.Chart) { cv.parentElement.innerHTML = '<div class="empty small">그래프 도구를 불러오지 못했어요. 인터넷에 연결된 상태로 한 번 열면 그 뒤로는 인터넷 없이도 보여요.</div>'; return; }
  if (!data.length) { cv.parentElement.innerHTML = '<div class="empty small">체중을 기록하면 그래프가 나타나요.</div>'; return; }
  const text = cssVar('--text-muted'), line = cssVar('--line'), primary = cssVar('--primary'), success = cssVar('--success');
  S.charts[canvasId] = new Chart(cv, {
    type: 'line',
    data: {
      labels: data.map(d => d.date.slice(5).replace('-', '/')),
      datasets: [
        { label: '체중', data: data.map(d => d.kg), borderColor: primary, backgroundColor: primary, tension: 0.3, pointRadius: mini ? 2 : 3, borderWidth: 3 },
        { label: '목표', data: data.map(() => S.profile.target), borderColor: success, borderDash: [6, 4], pointRadius: 0, borderWidth: 2 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { display: !mini, labels: { color: text, boxWidth: 12 } }, tooltip: { enabled: !mini } },
      scales: {
        x: { display: !mini, ticks: { color: text, maxTicksLimit: 6 }, grid: { color: line } },
        y: { display: true, ticks: { color: text, maxTicksLimit: mini ? 3 : 6 }, grid: { color: line } },
      },
    },
  });
}

// =========================================================
// 9-2. 설정
// =========================================================
RENDER.settings = () => {
  const p = S.profile, R = rules();
  const g = goal();
  let lastBackup = null;
  try { lastBackup = localStorage.getItem('last-backup'); } catch (e) { /* 없음 */ }
  const days = lastBackup ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000) : null;
  $('#scr-settings').innerHTML = `
    <div class="eyebrow">설정</div><h1>내 정보와 설정</h1>
    <div class="card">
      <div class="card-title">내 정보 <button class="btn small" data-act="editProfile">수정</button></div>
      <div class="kv">
        <span>키 · 나이 · 성별</span><span>${p.height}cm · ${p.age}세 · ${p.sex === 'female' ? '여' : '남'}</span>
        <span>체중 → 목표</span><span>${fmt(p.weight)} → ${fmt(p.target)}kg (${p.weeks}주)</span>
        <span>운동</span><span>주 ${p.freq}회 · ${LEVELS[p.level]} · ${p.minutes}분</span>
      </div>
    </div>
    ${goalCard(p, g, R)}
    <div class="card"><div class="card-title">화면</div>
      <div class="choice">
        <button class="${p.theme !== 'light' ? 'on' : ''}" data-act="theme" data-val="dark">다크 모드</button>
        <button class="${p.theme === 'light' ? 'on' : ''}" data-act="theme" data-val="light">밝은 화면</button>
      </div>
    </div>
    <div class="card"><div class="card-title">백업 ${days == null || days >= 7 ? '<span class="tag warn">할 때가 됐어요</span>' : '<span class="tag success">최근 백업</span>'}</div>
      <p class="small muted" style="margin-top:0">기록은 이 휴대폰 브라우저 안에만 저장돼요. 브라우저 데이터를 지우면 사라질 수 있으니 <b>주 1회 내보내기</b>를 권장해요.</p>
      <p class="small">${lastBackup ? `마지막 백업: ${korDate(lastBackup)} (${days}일 전)` : '아직 백업한 적이 없어요.'}</p>
      <div class="btn-row"><button class="btn" data-act="importBackup">불러오기</button><button class="btn primary" data-act="exportBackup">내보내기</button></div>
    </div>
    <details class="card"><summary>MET(운동 강도 수치)란?</summary>
      <p class="small" style="margin-top:0"><b>MET</b>은 가만히 앉아 있을 때를 1로 두고, 운동이 그보다 몇 배의 에너지를 쓰는지 나타낸 숫자예요. 예를 들어 MET 5인 운동을 체중 80kg인 사람이 1시간 하면 약 5 × 80 × 1 = 400kcal를 써요.</p>
      <p class="small"><b>이 앱이 MET을 정하는 방법</b></p>
      <ul class="small">
        <li><b>근력 운동</b>: 2024 Compendium(신체활동 개론, 운동별 MET 공식 목록)의 코드를 써요. 평소에는 '여러 운동 8~15회' 3.5, 스쿼트·데드리프트는 5.0이에요. 그날 '한계 근접·목표 미달'로 평가하면 고강도 6.0으로 계산해요.</li>
        <li><b>트레드밀</b>: 미국스포츠의학회(ACSM)의 걷기·달리기 공식으로, 입력한 속도와 경사에서 바로 계산해요.</li>
        <li><b>실내 자전거·로잉머신</b>: 기계 화면의 와트(W)를 입력하면 ACSM 공식이나 와트별 Compendium 값을 써요. 입력하지 않으면 강도별 대표값을 써요.</li>
        <li><b>일립티컬·계단 오르기</b>: Compendium 값(5.0 / 6.8~9.3)을 써요.</li>
      </ul>
      <p class="xs muted" style="margin-bottom:0">Compendium은 종목별로 따로 재지 않은 운동(예: 레그 익스텐션)은 '근력운동 일반' 하나로 묶어 둬요. 그래서 운동마다 다른 값을 만들어 넣지 않고, 공식 값과 그날의 강도를 써요. 운동 사전에서 운동별로 쓰는 코드를 볼 수 있어요.</p>
    </details>
    <details class="card"><summary>추천 기준 수치</summary>
      <p class="small muted" style="margin-top:0">설계서 4장의 수치예요. 바꾸면 다음 추천부터 적용돼요.</p>
      ${Object.entries(RULE_LABELS).map(([k, [label, unit]]) => `<div class="ctl-row"><span class="label">${label} <span class="xs">(${unit})</span></span>
        <input type="number" step="any" inputmode="decimal" data-rule="${k}" value="${R[k]}" style="width:96px;min-height:42px;text-align:right;font-size:var(--fs-md)"></div>`).join('')}
      <div class="btn-row" style="margin-top:var(--sp-3)"><button class="btn" data-act="resetRules">기본값으로</button><button class="btn primary" data-act="saveRules">저장</button></div>
    </details>
    <details class="card" id="dict"><summary>운동 사전 보기 (${EXERCISES.length}개)</summary><div id="dict-body"></div></details>
    <details class="card"><summary>데이터 지우기</summary>
      <p class="small muted" style="margin-top:0">모든 기록과 설정을 지워요. 지우기 전에 꼭 백업 파일을 내보내 두세요.</p>
      <button class="btn danger" data-act="clearAll">모든 데이터 지우기</button>
    </details>
    <p class="xs muted center">운동관리 앱 · 1차</p>`;
  $('#dict').addEventListener('toggle', e => { if (e.target.open && !$('#dict-body').innerHTML) renderDict(); });
};

function metText(ex) {
  const kg = S.profile ? S.profile.weight : 70;
  if (ex.cardio) {
    return Object.keys(Logic.CARDIO_INT).filter(k => Logic.CARDIO_INT[k].allowed.includes(ex.id)).map(k => {
      const m = Logic.cardioMET(ex.id, k, Logic.cardioDefaults(ex, k), kg);
      return `<li>${Logic.CARDIO_INT[k].name}: <b>${m.met}</b> — ${m.src}${m.note ? ` (${m.note})` : ''}</li>`;
    }).join('');
  }
  const a = Logic.strengthMET(ex, null, ex.start), b = Logic.strengthMET(ex, 'hard', ex.start);
  return `<li>평소: <b>${a.met}</b> — ${a.src}</li><li>한계 근접·목표 미달: <b>${b.met}</b> — ${b.src}</li>`;
}
function renderDict() {
  const groups = [['chest', '가슴'], ['shoulder', '어깨'], ['back', '등'], ['biceps', '팔 앞(이두)'], ['triceps', '팔 뒤(삼두)'], ['quads', '허벅지 앞'], ['hams', '허벅지 뒤·엉덩이'], ['calves', '종아리'], ['core', '복부(코어)'], ['cardio', '유산소']];
  $('#dict-body').innerHTML = groups.map(([g, gname]) => `<h3>${gname}</h3>` + EXERCISES.filter(e => e.group === g).map(ex => `
    <details class="card tight" style="background:var(--surface-2)"><summary><span>${ex.name} <span class="small muted">· ${EQUIP_NAME[ex.equip]}</span></span></summary>
      ${FIG.pair(ex.id)}
      ${MUSCLE.card(ex.id)}
      <p class="small"><a href="${youtubeLink(ex)}" target="_blank" rel="noopener">▶ 유튜브에서 자세 영상 보기</a></p>
      <p class="small bold" style="margin-bottom:0">추천 자세</p><ul class="small">${ex.tips.map(t => `<li>${t}</li>`).join('')}</ul>
      <p class="small bold" style="margin-bottom:0;color:var(--danger)">주의 자세</p><ul class="small">${ex.cautions.map(t => `<li>${t}</li>`).join('')}</ul>
      <div class="kv small"><span>대체 운동</span><span style="white-space:normal">${ex.alts.map(a => EX[a].name).join(', ')}</span>
      ${ex.cardio ? '' : `<span>중량 증가 단위</span><span>${!Logic.isWeighted(ex) ? '횟수만 올림' : ex.equip === 'dumbbell' ? `${rules().dumbbellHeavyFrom}kg까지 ${rules().incDumbbell}kg, 넘으면 ${rules().incDumbbellHeavy}kg` : Logic.increment(ex, rules()) + 'kg' + (ex.assist ? ' (보조 줄임)' : '')}</span>`}</div>
      <p class="small bold" style="margin-bottom:0">MET (칼로리 계산)</p><ul class="small" style="margin-bottom:0">${metText(ex)}</ul>
    </details>`).join('')).join('');
}

async function exportBackup() {
  const data = await DB.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `운동기록-백업-${ymd()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  try { localStorage.setItem('last-backup', new Date().toISOString()); } catch (e) { /* 무시 */ }
  toast('백업 파일을 내보냈어요');
  if (S.screen === 'settings') rerender();
}
function importBackup() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json,application/json';
  inp.onchange = async () => {
    const file = inp.files[0]; if (!file) return;
    try {
      const obj = JSON.parse(await file.text());
      if (S.profile && !confirm('지금 기록을 지우고 백업 파일 내용으로 바꿀까요?')) return;
      await DB.importAll(obj);
      await loadAll();
      applyTheme();
      toast('백업을 불러왔어요');
      go(S.profile ? 'home' : 'setup');
    } catch (e) { alert('불러오지 못했어요: ' + e.message); }
  };
  inp.click();
}

// =========================================================
// 버튼 동작 모음
// =========================================================
const ACT = {
  tab: el => go(el.dataset.to),
  choose: el => {
    S.form[el.dataset.group] = el.dataset.val;
    el.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === el));
    updateGoalBox();
  },
  saveSetup, cancelSetup: () => { S.editMode = false; go('settings'); },
  editProfile: () => { S.editMode = true; go('setup'); },
  startWorkout,
  alertOk: () => stopAlert(),
  nextW: el => { const it = curItem(); const r = computeResult(it); it.override = { weight: Logic.weightStep(EX[it.exId], r.weight, +el.dataset.d, rules()), reps: r.reps }; saveDraft(); rerender(); },
  nextR: el => { const it = curItem(); const r = computeResult(it); it.override = { weight: r.weight, reps: Math.max(1, r.reps + (+el.dataset.d) * (+el.dataset.step)) }; saveDraft(); rerender(); },
  nextReset: () => { curItem().override = null; saveDraft(); rerender(); },
  rtEdit: el => { const id = el.dataset.id, ex = EX[id], n = S.next[id], pr = Logic.prescription(ex, S.profile.level, rules()); S.form.rtEdit = { id, w: n ? n.weight : ex.start, r: n ? n.reps : pr.lo }; S.form.rtOpen = el.dataset.day; rerender(); },
  rtCancel: () => { S.form.rtEdit = null; rerender(); },
  rtW: el => { const e = S.form.rtEdit; e.w = Logic.weightStep(EX[e.id], e.w, +el.dataset.d, rules()); rerender(); },
  rtR: el => { const e = S.form.rtEdit; e.r = Math.max(1, e.r + (+el.dataset.d) * (+el.dataset.step)); rerender(); },
  rtSave: async () => {
    const e = S.form.rtEdit, prev = S.next[e.id];
    await DB.put('next', { key: e.id, weight: Logic.isWeighted(EX[e.id]) ? e.w : 0, reps: e.r, hardStreak: prev ? prev.hardStreak || 0 : 0, manual: true, updated: new Date().toISOString() });
    S.form.rtEdit = null; await loadAll(); toast(`${EX[e.id].name} 다음 목표를 저장했어요`); rerender();
  },
  bodyOpen: () => { S.form.bodyOpen = !S.form.bodyOpen; rerender(); },
  bodySave: () => saveBody(),
  bodyDel: async el => { if (!confirm(`${el.dataset.date} 인바디 기록을 지울까요?`)) return; await DB.del('body', el.dataset.date); await loadAll(); await syncBmr(); rerender(); },
  bodyMetric: el => { S.form.bodyMetric = el.dataset.val; rerender(); },
  addOpen: el => { S.form.addFor = el.dataset.day; S.form.rtOpen = el.dataset.day; rerender(); },
  addClose: () => { S.form.addFor = null; rerender(); },
  addPick: async el => { const d = el.dataset.day, id = el.dataset.id; await saveAdds(a => { a[d] = [...(a[d] || []), id]; }); S.form.addFor = null; S.form.rtOpen = d; toast(`${EX[id].name}을(를) ${Logic.DAYS[d].name}에 추가했어요`); rerender(); },
  addRemove: async el => { const d = el.dataset.day, id = el.dataset.id; await saveAdds(a => { a[d] = (a[d] || []).filter(x => x !== id); }); S.form.rtOpen = d; toast(`${EX[id].name}을(를) 코스에서 뺐어요`); rerender(); },
  gTab: el => { S.form.gTab = el.dataset.val; rerender(); },
  gWeek: el => { S.form.gWeek = +el.dataset.val; rerender(); },
  calMove: el => {
    const [y, m] = S.form.calMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + (+el.dataset.d), 1);
    S.form.calMonth = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; S.form.calDay = null; rerender();
  },
  calDay: el => { S.form.calDay = el.dataset.val || null; rerender(); },
  recEdit: el => {
    const store = el.dataset.store, id = +el.dataset.id;
    const r = (store === 'strength' ? S.strength : S.cardio).find(x => x.id === id);
    S.form.recEdit = { id, store, sets: r.sets ? r.sets.map(x => Object.assign({}, x)) : null, minutes: r.minutes };
    S.form.recOpen = r.sessionId; rerender();
  },
  recCancel: () => { S.form.recEdit = null; rerender(); },
  recSetAdd: () => { const e = S.form.recEdit; const last = e.sets[e.sets.length - 1] || { w: 0, r: 10 }; e.sets.push(Object.assign({}, last)); rerender(); },
  recSetDel: el => { const e = S.form.recEdit; if (e.sets.length <= 1) { toast('세트가 하나뿐이면 아래 지우기를 쓰세요'); return; } e.sets.splice(+el.dataset.i, 1); rerender(); },
  recSave: async () => {
    const e = S.form.recEdit;
    const list = e.store === 'strength' ? S.strength : S.cardio;
    const r = Object.assign({}, list.find(x => x.id === e.id));
    if (e.store === 'strength') {
      const old = r.sets.length;
      r.sets = e.sets.map(x => ({ w: Math.max(0, num(x.w) || 0), r: Math.max(0, Math.round(num(x.r) || 0)) })).filter(x => x.r > 0);
      if (old) { r.kcal = Math.round((r.kcal || 0) * r.sets.length / old); r.net = Math.round((r.net || 0) * r.sets.length / old); }
    } else {
      const m = Math.max(1, Math.round(num(e.minutes) || r.minutes)); const k = r.minutes ? m / r.minutes : 1;
      r.kcal = Math.round((r.kcal || 0) * k); r.net = Math.round((r.net || 0) * k); r.minutes = m;
    }
    await DB.put(e.store, r); S.form.recEdit = null; await loadAll(); toast('기록을 고쳤어요'); rerender();
  },
  recDel: async el => {
    if (!confirm('이 운동 기록을 지울까요? 되돌릴 수 없어요.')) return;
    await DB.del(el.dataset.store, +el.dataset.id); await loadAll(); toast('기록을 지웠어요'); rerender();
  },
  recDelSession: async el => {
    if (!confirm('이 날 운동 기록을 모두 지울까요? 되돌릴 수 없어요. (다음 차례 순서와 다음 목표는 그대로예요)')) return;
    const sid = +el.dataset.sid;
    for (const r of S.strength.filter(x => x.sessionId === sid)) await DB.del('strength', r.id);
    for (const r of S.cardio.filter(x => x.sessionId === sid)) await DB.del('cardio', r.id);
    await loadAll(); toast('이 날 기록을 지웠어요'); rerender();
  },
  resume: () => go(S.workout.phase === 'cardio' ? 'cardio' : S.workout.phase === 'done' ? 'summary' : 'workout'),
  discardDraft: () => { if (confirm('진행 중인 운동을 취소할까요? 기록은 저장되지 않아요.')) { S.workout = null; saveDraft(); rerender(); } },
  revert: el => revertSub(el.dataset.orig),
  warmStart: () => { S.workout.warm.start = Date.now(); saveDraft(); rerender(); },
  warmDone: () => { const w = S.workout; w.warm.minutes = w.warm.start ? Math.max(1, Math.round((Date.now() - w.warm.start) / 60000)) : 5; w.phase = 'strength'; saveDraft(); go('workout'); },
  warmSkip: () => { S.workout.warm.minutes = 0; S.workout.phase = 'strength'; saveDraft(); go('workout'); },
  setW: el => adjustSet('w', +el.dataset.i, +el.dataset.d, +el.dataset.step),
  setR: el => adjustSet('r', +el.dataset.i, +el.dataset.d, +el.dataset.step),
  setDone,
  addSet: () => { const it = curItem(); const last = it.sets[it.sets.length - 1]; it.sets.push({ w: last.w, r: last.r, done: false }); saveDraft(); rerender(); },
  toEval: () => go('eval'),
  toggleAlt: () => { S.workout.showAlt = !S.workout.showAlt; rerender(); },
  substitute: el => substitute(el.dataset.to),
  skipEx: () => { if (confirm('이 운동을 건너뛸까요?')) advanceItem(); },
  endEarly: () => {
    if (!confirm('운동을 여기서 끝내고 요약으로 갈까요?')) return;
    const c = S.workout.cardio;
    if (c && !c.finished && c.runStart) { c.elapsedMs += Date.now() - c.runStart; c.runStart = null; }
    if (c && !c.finished && (num(c.res && c.res.min) || cardioElapsed(c) >= 60)) { c.finished = true; c.rating = c.rating || 'ok'; }
    S.workout.phase = 'done'; saveDraft(); go('summary');
  },
  restAdj: el => { if (S.rest) { S.rest.end += (+el.dataset.d) * 1000; S.rest.total = Math.max(S.rest.total, (S.rest.end - Date.now()) / 1000); if (S.rest.end < Date.now()) endRest(false); else updateRestRing(); } },
  restSkip: () => endRest(false),
  rate: el => { const it = curItem(); it.rating = el.dataset.val; it.override = null; saveDraft(); rerender(); },
  toggleDrop: () => { const it = curItem(); it.applyDrop = !it.applyDrop; saveDraft(); rerender(); },
  evalNext,
  cardioSkip: () => { S.workout.cardio.skipped = true; S.workout.phase = 'done'; saveDraft(); go('summary'); },
  cardioForce: () => { const c = S.workout.cardio; c.force = true; c.fitMin = Math.max(c.fitMin, rules().cardioMinMinutes); autoMinutes(); saveDraft(); rerender(); },
  cardioEx: el => { const c = S.workout.cardio; c.exId = el.dataset.val; loadCardioSettings(); saveDraft(); rerender(); },
  cSet: el => {
    const c = S.workout.cardio; const k = el.dataset.k;
    const min = k === 'incline' || k === 'watts' ? 0 : 1;
    c.set[k] = Math.max(min, Math.round(((c.set[k] || 0) + (+el.dataset.d) * (+el.dataset.step)) * 10) / 10);
    autoMinutes(); saveDraft(); rerender();
  },
  cMin: el => { const c = S.workout.cardio; c.minutes = Math.max(5, c.minutes + (+el.dataset.d) * 5); c.manualMin = true; saveDraft(); rerender(); },
  cardioToggle: () => { unlockAudio(); const c = S.workout.cardio; if (c.runStart) { c.elapsedMs += Date.now() - c.runStart; c.runStart = null; } else c.runStart = Date.now(); saveDraft(); rerender(); },
  cardioDone: () => {
    const c = S.workout.cardio;
    if (c.runStart) { c.elapsedMs += Date.now() - c.runStart; c.runStart = null; }
    const typed = num(c.res && c.res.min);
    if (!typed && cardioElapsed(c) < 60) { toast('운동한 시간(분)을 입력해 주세요'); const f = $('#cr-min'); if (f) f.focus(); return; }
    const r = cardioResult(c);
    if (EX[c.exId].ctl === 'speed') { if (r.avg) c.set.speed = r.avg; if (r.incline != null) c.set.incline = r.incline; }
    c.rating = c.rating || 'ok';
    c.finished = true; S.workout.phase = 'done'; saveDraft(); go('summary');
  },
  cardioEnd: () => { const c = S.workout.cardio; if (c.runStart) { c.elapsedMs += Date.now() - c.runStart; c.runStart = null; } c.finished = true; saveDraft(); rerender(); window.scrollTo(0, 0); },
  cardioRate: el => { S.workout.cardio.rating = el.dataset.val; saveDraft(); rerender(); },
  toSummary: () => { S.workout.phase = 'done'; saveDraft(); go('summary'); },
  saveSession,
  discardSession: () => { if (confirm('이번 운동을 저장하지 않고 나갈까요?')) { S.workout = null; saveDraft(); keepAwake(false); go('home'); } },
  wStep: el => { S.form.wInput = Math.max(20, Math.round((S.form.wInput + (+el.dataset.d) * 0.1) * 10) / 10); rerender(); },
  saveWeight,
  delWeight: async el => { if (!confirm(`${el.dataset.date} 체중 기록을 지울까요?`)) return; await DB.del('weight', el.dataset.date); await loadAll(); rerender(); },
  theme: async el => {
    try { localStorage.setItem('theme', el.dataset.val); } catch (e) { /* 무시 */ }
    if (S.profile) { S.profile.theme = el.dataset.val; await DB.put('profile', S.profile); }
    else document.documentElement.dataset.theme = el.dataset.val;
    applyTheme();
    // 처음 설정 화면은 입력한 값이 지워지지 않게 버튼만 바꿈
    if (S.screen === 'setup') { const b = document.querySelector('[data-act=toggleTheme]'); if (b) b.outerHTML = themeToggle(); }
    else rerender();
  },
  toggleTheme: el => { el.dataset.val = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'; ACT.theme(el); },
  saveRules: async () => {
    const r = {};
    document.querySelectorAll('[data-rule]').forEach(i => { const v = num(i.value); if (v != null && v >= 0) r[i.dataset.rule] = v; });
    S.profile.rules = r; await DB.put('profile', S.profile); toast('추천 기준을 저장했어요'); rerender();
  },
  resetRules: async () => { if (!confirm('추천 기준 수치를 기본값으로 되돌릴까요?')) return; S.profile.rules = {}; await DB.put('profile', S.profile); toast('기본값으로 되돌렸어요'); rerender(); },
  exportBackup, importBackup,
  clearAll: async () => {
    if (!confirm('정말 모든 기록과 설정을 지울까요? 되돌릴 수 없어요.')) return;
    if (!confirm('마지막 확인: 백업 파일을 내보내 두셨나요? 지우기를 계속할까요?')) return;
    await DB.clearAll(); S.workout = null; saveDraft();
    await loadAll(); S.editMode = false; applyTheme(); go('setup');
  },
};

document.addEventListener('click', e => {
  const tab = e.target.closest('[data-tab]');
  if (tab) { go(tab.dataset.tab); return; }
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act];
  if (fn) fn(el, e);
});

// 숫자 직접 입력칸
const INPUT = {
  inSetW: (el, v) => setSetValue('w', +el.dataset.i, v),
  inSetR: (el, v) => setSetValue('r', +el.dataset.i, v),
  inNextW: (el, v) => { const it = curItem(); const r = computeResult(it); it.override = { weight: Math.max(0, Math.round(v * 10) / 10), reps: r.reps }; saveDraft(); rerender(); },
  inNextR: (el, v) => { const it = curItem(); const r = computeResult(it); it.override = { weight: r.weight, reps: Math.max(1, Math.round(v)) }; saveDraft(); rerender(); },
  inRtW: (el, v) => { S.form.rtEdit.w = Math.max(0, Math.round(v * 10) / 10); rerender(); },
  inRtR: (el, v) => { S.form.rtEdit.r = Math.max(1, Math.round(v)); rerender(); },
  inCSet: (el, v) => { const c = S.workout.cardio; c.set[el.dataset.k] = Math.max(0, Math.round(v * 10) / 10); autoMinutes(); saveDraft(); rerender(); },
  inCMin: (el, v) => { const c = S.workout.cardio; c.minutes = Math.max(1, Math.round(v)); c.manualMin = true; saveDraft(); rerender(); },
  inWeight: (el, v) => { S.form.wInput = Math.max(20, Math.round(v * 10) / 10); rerender(); },
};
document.addEventListener('change', e => {
  const el = e.target.closest('[data-input]');
  if (!el) return;
  const v = num(el.value);
  if (v == null) { rerender(); return; }
  INPUT[el.dataset.input](el, v);
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-rec]'); if (!el || !S.form.recEdit) return;
  const k = el.dataset.rec;
  if (k === 'min') S.form.recEdit.minutes = el.value; else S.form.recEdit.sets[+el.dataset.i][k] = el.value;
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-cres]'); if (!el || !S.workout || !S.workout.cardio) return;
  S.workout.cardio.res[el.dataset.cres] = el.value; saveDraft();
  const t = $('#c-calc'); if (t) t.innerHTML = cardioCalcText(S.workout.cardio);
});
document.addEventListener('focusin', e => { if (e.target.classList && e.target.classList.contains('val-input')) e.target.select(); });

// 타이머 화면 갱신 (0.25초마다)
setInterval(() => {
  if (S.rest) {
    updateRestRing();
    const left = S.rest.end - Date.now();
    if (!S.rest.warned && left <= 10000) { S.rest.warned = true; vibrate(200); beep(1); }   // 10초 전 예고
    if (left > 0 && Date.now() - (S.rest.noted || 0) >= 5000) restNotify();               // 상태표시줄 갱신
    if (left <= 0) endRest(true);
  }
  const w = S.workout;
  if (!w) return;
  if (S.screen === 'workout' && w.phase === 'warmup' && w.warm.start) { const t = $('#warm-timer'); if (t) t.textContent = mmss((Date.now() - w.warm.start) / 1000); }
  if (S.screen === 'cardio' && w.cardio && w.cardio.runStart) {
    const c = w.cardio, el = cardioElapsed(c);
    const t = $('#c-timer'); if (t) t.textContent = mmss(el);
    if (c.intensity === 'high') {
      const ph = intervalPhase(el);
      const pe = $('#c-phase'); if (pe) pe.textContent = ph.name;
      if (c.lastPhase && c.lastPhase !== ph.key) { vibrate(ph.fast ? [600, 150, 600, 150, 600] : [900]); loudBeep(ph.fast ? 1.5 : 1); if (document.hidden) notify(ph.name, '인터벌 구간이 바뀌었어요'); }
      c.lastPhase = ph.key;
    }
    if (!c.goalAlerted && el >= c.minutes * 60) { c.goalAlerted = true; strongAlert('목표 시간 완료!', '유산소 끝 버튼을 눌러 평가해 주세요'); saveDraft(); }
  }
}, 250);

// ---------- 시작 ----------
(async function boot() {
  try {
    await loadAll();
  } catch (e) {
    document.body.innerHTML = '<p style="padding:24px">이 브라우저에서는 저장소를 열 수 없어요. 사생활 보호(시크릿) 모드라면 일반 모드로 열어 주세요.</p>';
    return;
  }
  applyTheme();
  if (!S.profile) { go('setup'); }
  else {
    if (S.profile.rules && (S.profile.rulesVersion || 1) < 2) {
      for (const [k, old] of Object.entries(OLD_RULE_DEFAULTS)) if (S.profile.rules[k] === old) delete S.profile.rules[k];
    }
    if ((S.profile.rulesVersion || 1) < 2) { S.profile.rulesVersion = 2; await DB.put('profile', S.profile); }
    if (!S.routine) { S.routine = { key: 'me', subs: {}, pointer: 0, sig: currentCycle().join(',') }; await DB.put('routine', S.routine); }
    // 분할 구성이 바뀌었으면(앱 업데이트 등) 첫 차례부터
    const sig = currentCycle().join(',');
    if (S.routine.sig !== sig) { S.routine.sig = sig; S.routine.pointer = 0; await DB.put('routine', S.routine); }
    S.workout = loadDraft();
    go('home');
  }
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* 오프라인 기능 없이 동작 */ });
  }
})();
