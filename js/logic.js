/* =========================================================
   추천 규칙 계산 (설계서 4장 + 칼로리 기반 배분)
   화면과 상관없는 '계산'만 모아 두었습니다. tests.html 에서 검사합니다.
   ========================================================= */

// 4장의 수치 — 설정 화면에서 바꿀 수 있습니다.
const DEFAULT_RULES = {
  lossWarnPct: 1,        // 감량이 주당 체중의 몇 %를 넘으면 경고
  gainWarnPct: 0.5,      // 증량이 주당 몇 %를 넘으면 경고
  kcalPerKg: 7700,       // 체지방 1kg 칼로리
  lifeFactor: 1.2,       // 운동을 뺀 평소 활동 계수 (주로 앉아서 1.2 / 서서 일함 1.375 / 활동적 1.55)
  exerciseSharePct: 30,  // 감량 칼로리 중 운동이 맡는 몫(%) — 나머지는 식단
  cardioMinMinutes: 15,  // 유산소 최소 시간(분)
  trimMinSets: 2,        // 시간이 모자랄 때 작은 운동 세트를 몇 세트까지 줄일지
  rotateVariants: 1,     // 주마다 기구·방법 번갈아 추천 (1 켜기 / 0 끄기)
  incBarbellUpper: 2.5,  // 바벨 상체 중량 증가(kg)
  incBarbellLower: 5,    // 바벨 하체 중량 증가(kg)
  incDumbbell: 1,        // 덤벨 한 칸(kg) — 20kg까지
  incDumbbellHeavy: 2.5, // 덤벨 한 칸(kg) — 20kg 넘으면
  dumbbellHeavyFrom: 20, // 덤벨 단위가 바뀌는 무게(kg)
  incMachine: 5,         // 머신·케이블 한 칸(kg)
  failDropPct: 10,       // '목표 미달' 중량 감소(%)
  dropStepBarbell: 2.5,  // 줄일 때 바벨 무게 단위(kg) — 원판 1.25kg 양쪽
  dropStepOther: 1,      // 줄일 때 덤벨·머신·케이블 무게 단위(kg)
  hardStreakLimit: 3,    // '한계 근접' 몇 번 연속이면 감소 제안
  restBeginnerBig: 60,   // 휴식(초) 초보 큰 운동
  restBeginnerSmall: 60, // 휴식(초) 초보 작은 운동
  restMid: 60,           // 휴식(초) 중급
  restAdvBig: 120,       // 휴식(초) 상급 큰 운동
  restAdvSmall: 60,      // 휴식(초) 상급 작은 운동
};
const RULE_LABELS = {
  lossWarnPct: ['감량 경고 기준', '%/주'], gainWarnPct: ['증량 경고 기준', '%/주'], kcalPerKg: ['체지방 1kg', 'kcal'],
  lifeFactor: ['평소 활동 계수', '배'], exerciseSharePct: ['감량 중 운동 몫', '%'], cardioMinMinutes: ['유산소 최소 시간', '분'], rotateVariants: ['주마다 기구 바꾸기 (1 켜기·0 끄기)', ''], trimMinSets: ['줄일 때 최소 세트', '세트'],
  incBarbellUpper: ['바벨 상체 증가', 'kg'], incBarbellLower: ['바벨 하체 증가', 'kg'], incDumbbell: ['덤벨 한 칸 (20kg까지)', 'kg'], incDumbbellHeavy: ['덤벨 한 칸 (20kg 넘으면)', 'kg'], dumbbellHeavyFrom: ['덤벨 단위 바뀌는 무게', 'kg'], incMachine: ['머신·케이블 한 칸', 'kg'],
  failDropPct: ['목표 미달 시 감소', '%'], dropStepBarbell: ['줄일 때 바벨 단위', 'kg'], dropStepOther: ['줄일 때 덤벨·머신 단위', 'kg'], hardStreakLimit: ['한계 근접 연속 기준', '회'],
  restBeginnerBig: ['휴식: 초보 큰 운동', '초'], restBeginnerSmall: ['휴식: 초보 작은 운동', '초'], restMid: ['휴식: 중급', '초'],
  restAdvBig: ['휴식: 상급 큰 운동', '초'], restAdvSmall: ['휴식: 상급 작은 운동', '초'],
};

// 예전 기본값(설정에 그대로 저장돼 있으면 새 기본값으로 바꿈)
const OLD_RULE_DEFAULTS = { restBeginnerBig: 90, restMid: 90, restAdvSmall: 90, incDumbbell: 2 };

const LEVELS = { beginner: '초보', intermediate: '중급', advanced: '상급' };
// 평가: RPE(운동 자각 강도 1~10) · RIR(더 할 수 있었던 횟수) 기준
const RATINGS = { easy: '여유', ok: '적정', hard: '한계 근접', fail: '목표 미달' };
const RATING_RPE = { easy: 'RPE 6 이하', ok: 'RPE 7~8', hard: 'RPE 9~10', fail: '실패' };
const RATING_DESC = { easy: '3회 이상 더 할 수 있었음 (RIR 4+)', ok: '2~3회 더 할 수 있었음 (RIR 2~3)', hard: '1회 정도 더 가능하거나 한계 (RIR 0~1)', fail: '목표 횟수를 다 채우지 못함' };
const RATING_DESC_CARDIO = { easy: '대화가 편했고 더 세게 할 수 있었음', ok: '목표 강도를 꾸준히 유지함', hard: '끝까지 했지만 거의 한계였음', fail: '끝까지 못 하거나 속도·단계를 낮춤' };

const Logic = (() => {
  const round1 = x => Math.round(x * 10) / 10;
  const rules = (profile) => Object.assign({}, DEFAULT_RULES, (profile && profile.rules) || {});

  // =========================================================
  // MET (운동 강도 수치) — 2024 Adult Compendium of Physical Activities 코드 + ACSM 공식
  // =========================================================
  const MET_CODES = {
    '02050': [6.0, '근력운동, 고강도(보디빌딩·파워리프팅)'],
    '02052': [5.0, '근력운동, 스쿼트·데드리프트'],
    '02054': [3.5, '근력운동, 여러 운동 8~15회'],
    '02056': [3.0, '맨손 근력운동(스쿼트·런지·푸시업·크런치), 일반'],
    '02057': [6.5, '맨손 근력운동, 고강도'],
    '02024': [2.8, '맨손체조(크런치·플랭크), 가벼운 강도'],
    '02022': [3.8, '맨손체조(푸시업·풀업·런지), 보통 강도'],
    '02020': [7.5, '맨손체조(풀업 등), 고강도'],
    '01216': [5.0, '실내 자전거 60W'],
    '01220': [6.0, '실내 자전거 90~100W'],
    '01228': [8.0, '실내 자전거 126~150W'],
    '02048': [5.0, '일립티컬, 보통 강도'],
    '02049': [9.0, '일립티컬, 고강도'],
    '02071': [5.0, '로잉머신 100W 미만'],
    '02072': [7.5, '로잉머신 100~149W'],
    '02073': [11.0, '로잉머신 150~199W'],
    '02074': [14.0, '로잉머신 200W 이상'],
    '02065': [9.3, '계단 오르기 머신, 일반'],
    '17131': [6.8, '계단 오르기, 일반'],
    '17350': [3.8, '트레드밀 걷기 시속 4.8~5.5km, 경사 0%'],
  };
  const code = c => ({ met: MET_CODES[c][0], src: `Compendium ${c} · ${MET_CODES[c][1]}` });

  // 근력: 운동 종류 + 그날 평가(한계 근접·목표 미달 = 고강도)로 코드 선택
  function strengthMET(ex, rating, weight) {
    const hard = rating === 'hard' || rating === 'fail';
    let k = ex.mk || 'weights';
    if (k === 'bw' && ex.equip !== 'bodyweight' && weight > 0) k = 'weights'; // 덤벨을 든 런지 등
    if (k === 'sqdl') return code(hard ? '02050' : '02052');
    if (k === 'bw') return code(hard ? '02057' : '02056');
    if (k === 'core') return code(hard ? '02022' : '02024');
    if (k === 'cal') return code(hard ? '02020' : '02022');
    return code(hard ? '02050' : '02054');
  }

  // ACSM 대사 공식 (산소 섭취량 → MET, 1 MET = 3.5 ml/kg/분)
  function acsmTreadmill(kmh, inclinePct) {
    const S = kmh * 1000 / 60, G = (inclinePct || 0) / 100;
    const run = kmh >= 7.5;
    const vo2 = run ? 3.5 + 0.2 * S + 0.9 * S * G : 3.5 + 0.1 * S + 1.8 * S * G;
    return { met: round1(vo2 / 3.5), src: `ACSM ${run ? '달리기' : '걷기'} 공식 (시속 ${kmh}km · 경사 ${inclinePct || 0}%)` };
  }
  function acsmBike(watts, kg) {
    return { met: round1((7 + 1.8 * watts * 6.12 / kg) / 3.5), src: `ACSM 자전거 공식 (${watts}W · 체중 ${kg}kg)` };
  }
  const rowerByWatts = w => code(w < 100 ? '02071' : w < 150 ? '02072' : w < 200 ? '02073' : '02074');
  // 인터벌 20분 = 2분 준비 + (빠르게 30초 + 천천히 90초)×8 + 2분 정리 → 천천히 16분, 빠르게 4분
  const intervalAvg = (fast, easy) => round1((16 * easy + 4 * fast) / 20);

  function cardioMET(exId, intensity, set = {}, kg = 70) {
    const s = set || {};
    if (exId === 'treadmill') return acsmTreadmill(s.speed || 5.5, s.incline || 0);
    if (exId === 'bike') {
      if (intensity === 'high') {
        const f = s.watts ? acsmBike(s.watts, kg).met : code('01228').met;
        const e = s.easyWatts ? acsmBike(s.easyWatts, kg).met : code('01216').met;
        return { met: intervalAvg(f, e), src: `인터벌 평균: 빠르게 ${s.watts ? s.watts + 'W' : 'Compendium 01228'} · 천천히 ${s.easyWatts ? s.easyWatts + 'W' : 'Compendium 01216'}` };
      }
      if (s.watts) return acsmBike(s.watts, kg);
      return code(intensity === 'low' ? '01216' : '01220');
    }
    if (exId === 'rower') {
      if (intensity === 'high') {
        const f = s.watts ? rowerByWatts(s.watts).met : code('02073').met;
        const e = s.easyWatts ? rowerByWatts(s.easyWatts).met : code('02071').met;
        return { met: intervalAvg(f, e), src: '인터벌 평균: 빠르게 Compendium 02073 · 천천히 02071' };
      }
      if (s.watts) return rowerByWatts(s.watts);
      return code(intensity === 'low' ? '02071' : '02072');
    }
    if (exId === 'elliptical') return Object.assign(code('02048'), intensity === 'low' ? { note: '가장 낮은 단계 값이라 아주 가볍게 하면 실제보다 조금 높을 수 있어요' } : {});
    if (exId === 'stair') return code(intensity === 'low' ? '17131' : '02065');
    return code('02054');
  }
  const WARMUP = code('17350');

  // 칼로리: 총 소모(MET × 체중 × 시간) / 순소모(가만히 있을 때보다 더 쓴 열량 = (MET−1) × 체중 × 시간)
  const kcal = (met, kg, minutes) => met * kg * (minutes / 60);
  const netKcal = (met, kg, minutes) => Math.max(0, met - 1) * kg * (minutes / 60);

  // =========================================================
  // 4-1. 목표 점검 + 하루 칼로리 배분
  // =========================================================
  function bmr(p) {
    const base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
    return p.sex === 'female' ? base - 161 : base + 5;
  }
  function goalCheck(p, R = rules(p)) {
    const diff = p.weight - p.target;             // +면 감량
    const weekly = diff / p.weeks;                // 주당 변화량(kg)
    const direction = Math.abs(diff) < 0.5 ? 'keep' : (diff > 0 ? 'loss' : 'gain');
    const pct = Math.abs(weekly) / p.weight * 100;
    const limit = direction === 'loss' ? R.lossWarnPct : R.gainWarnPct;
    const warn = direction !== 'keep' && pct > limit;
    const b = p.bmrMeasured || bmr(p);   // 인바디로 잰 기초대사량이 있으면 그 값
    const base = b * R.lifeFactor;                          // 운동을 뺀 하루 소모
    const daily = direction === 'keep' ? 0 : weekly * R.kcalPerKg / 7; // 하루 적자(+) 또는 잉여(−)
    let exerciseDaily, sessionTarget = null;
    if (direction === 'loss') {
      exerciseDaily = daily * R.exerciseSharePct / 100;     // 운동이 맡는 하루 평균 순소모
      sessionTarget = exerciseDaily * 7 / p.freq;           // 1회 운동 목표 순소모
    } else {
      // 유지·증량: 운동량 추정(시간의 약 75%를 근력 3.5 MET로)
      exerciseDaily = netKcal(3.5, p.weight, (p.minutes || 60) * 0.75) * p.freq / 7;
    }
    const dietDeficit = daily - (direction === 'loss' ? exerciseDaily : 0);
    const intake = base + exerciseDaily - daily;
    return {
      direction, weekly: Math.round(Math.abs(weekly) * 100) / 100, pct: round1(pct), warn,
      bmr: Math.round(b), base: Math.round(base), exerciseDaily: Math.round(exerciseDaily),
      sessionTarget: sessionTarget == null ? null : Math.round(sessionTarget),
      dailyDelta: Math.round(Math.abs(daily)), dietDeficit: Math.round(dietDeficit),
      maintain: Math.round(base + exerciseDaily), intake: Math.round(intake), lowIntake: intake < b, bmrMeasured: !!p.bmrMeasured,
    };
  }

  // =========================================================
  // 4-2·4-3. 주간 루틴
  // =========================================================
  // list: 운동 순서(큰 운동 → 작은 운동 → 복부) / skipBeginner: 초보는 빼는 운동(개수 하한)
  // 상체 구성 3가지 (부위 묶음)
  const UP = {
    // 2단계 개편: 기구 운동 섞기(효과는 프리웨이트와 비슷하고 배우기 쉬움),
    //  늘어난 자세에서 버티는 운동(덤벨 플라이·오버헤드 익스텐션·루마니안 데드리프트) 포함
    SB: { tag: '어깨·등', parts: '어깨 · 등', list: ['lat_pulldown', 'db_shoulder', 'tbar_row', 'seated_row', 'side_lateral', 'face_pull'], skipBeginner: ['tbar_row'] },
    CB: { tag: '가슴·등', parts: '가슴 · 등 · 팔 (다른 운동으로 두 번째 자극)', list: ['chest_press', 'assist_pullup', 'one_arm_row', 'assist_dip', 'rear_delt', 'hammer_curl'], skipBeginner: ['hammer_curl'] },
    CA: { tag: '가슴·팔', parts: '가슴 · 삼두 · 이두', list: ['bench', 'incline_db', 'db_fly', 'overhead_ext', 'barbell_curl', 'pushdown'], skipBeginner: ['db_fly'] },
  };
  // 하체 구성 3가지
  const LO = {
    F: { tag: '앞쪽', parts: '허벅지 앞 · 엉덩이 · 종아리', list: ['squat', 'leg_press', 'lunge', 'leg_ext', 'standing_calf'], skipBeginner: ['lunge'] },
    B: { tag: '뒤쪽', parts: '허벅지 뒤 · 엉덩이 · 복부', list: ['rdl', 'hip_thrust', 'bulgarian', 'leg_curl', 'cable_crunch'], skipBeginner: ['bulgarian'] },
    C: { tag: '종합', parts: '허벅지 앞 · 허리·엉덩이 · 엉덩이 옆 · 종아리 · 복부', list: ['hack_squat', 'back_ext', 'hip_abduction', 'seated_calf', 'hanging_leg'], skipBeginner: ['hanging_leg'] },
  };
  const up = (label, k) => Object.assign({ name: `${label} (${UP[k].tag})`, area: ['upper'] }, UP[k]);
  const lo = (label, k) => Object.assign({ name: `${label} (${LO[k].tag})`, area: ['lower'] }, LO[k]);
  const DAYS = {
    // 주 4회: 상체A·B / 하체A·B
    UA: up('상체A', 'SB'), UB: up('상체B', 'CA'), LA: lo('하체A', 'F'), LB: lo('하체B', 'B'),
    // 주 5회: 상체1·2·3 / 하체1·2
    U1: up('상체1', 'SB'), U2: up('상체2', 'CB'), U3: up('상체3', 'CA'), L1: lo('하체1', 'F'), L2: lo('하체2', 'B'),
    // 주 6회: 상체ㄱ·ㄴ·ㄷ / 하체ㄱ·ㄴ·ㄷ
    'Uㄱ': up('상체ㄱ', 'SB'), 'Uㄴ': up('상체ㄴ', 'CB'), 'Uㄷ': up('상체ㄷ', 'CA'), 'Lㄱ': lo('하체ㄱ', 'F'), 'Lㄴ': lo('하체ㄴ', 'B'), 'Lㄷ': lo('하체ㄷ', 'C'),
    FA: { name: '전신A', parts: '하체 · 가슴 · 등 · 어깨 · 복부', area: ['upper', 'lower'], list: ['squat', 'bench', 'lat_pulldown', 'db_shoulder', 'plank'], skipBeginner: [] },
    FB: { name: '전신B', parts: '하체 · 가슴 · 등 · 어깨 · 복부', area: ['upper', 'lower'], list: ['rdl', 'incline_db', 'seated_row', 'side_lateral', 'dead_bug'], skipBeginner: [] },
    U: { name: '상체', parts: '가슴 · 등 · 어깨 · 팔', area: ['upper'], list: ['bench', 'lat_pulldown', 'db_shoulder', 'seated_row', 'overhead_ext', 'barbell_curl'], skipBeginner: [] },
    L: { name: '하체', parts: '허벅지 앞뒤 · 엉덩이 · 종아리', area: ['lower'], list: ['squat', 'rdl', 'leg_press', 'leg_curl', 'standing_calf'], skipBeginner: [] },
    F: { name: '전신', parts: '하체 · 가슴 · 등 · 어깨 · 복부', area: ['upper', 'lower'], list: ['leg_press', 'incline_db', 'one_arm_row', 'side_lateral', 'cable_crunch'], skipBeginner: [] },
  };

  // 순환 순서. 요일 고정 없이 '다음 차례'로 돌아갑니다.
  function cycle(freq, level) {
    if (freq <= 2) return ['FA', 'FB'];
    if (freq === 3) return level === 'beginner' ? ['FA', 'FB'] : ['U', 'L', 'F'];
    // 5회: 상체1(어깨·등) → 하체1 → 상체2(가슴·등) → 하체2 → 상체3(가슴·팔), 다음 차례는 다시 상체1
    //   상체3 다음에 바로 상체1이 와도 겹치는 부위가 없게 짬 (가슴·팔 → 어깨·등)
    if (freq === 5) return ['U1', 'L1', 'U2', 'L2', 'U3'];
    if (freq >= 6) return ['Uㄱ', 'Lㄱ', 'Uㄴ', 'Lㄴ', 'Uㄷ', 'Lㄷ'];
    return ['UA', 'LA', 'UB', 'LB'];
  }
  // 분할 구성 설명 (루틴 화면)
  function splitNote(freq, level) {
    if (freq === 4) return '상체는 어깨·등 / 가슴·팔로 나눠요. 부위마다 주 1회 직접 운동하고, 가슴·등 운동 때 팔·어깨가 함께 쓰여 추가 자극이 돼요.';
    if (freq === 5) return '큰 근육인 가슴과 등은 주 2회씩 해요(등: 상체1·2, 가슴: 상체2·3). 상체3 다음 상체1이 바로 이어져도 겹치는 부위가 없어요.';
    if (freq >= 6) return '상체·하체를 각각 3가지로 나눠요. 가슴·등은 주 2회, 하체는 앞쪽·뒤쪽·종합으로 고르게 해요. 같은 부위는 최소 이틀 간격이 생겨요.';
    if (freq === 3 && level !== 'beginner') return '상체 → 하체 → 전신 순서로 부위마다 주 1~2회 해요.';
    return '전신 운동을 번갈아 해서 부위마다 주 2회 정도 해요.';
  }
  function weekPlan(freq, level, start = 0) {
    const c = cycle(freq, level);
    return Array.from({ length: freq }, (_, i) => c[(start + i) % c.length]);
  }
  // 주마다 번갈아 추천하는 기구·방법 묶음 (같은 근육, 다른 기구·자세)
  //  큰 바벨 운동(스쿼트·벤치·루마니안 데드리프트 등)은 무게 변화를 보기 위해 고정
  const VARIANTS = [
    ['leg_curl', 'seated_leg_curl'],               // 누워서 ↔ 앉아서
    ['leg_press', 'incline_leg_press'],            // 앉아서 ↔ 45도
    ['chest_press', 'incline_chest_press'],
    ['seated_row', 'machine_row'],
    ['lat_pulldown', 'vbar_pulldown'],
    ['barbell_curl', 'cable_curl', 'preacher_curl'],
    ['standing_calf', 'leg_press_calf', 'seated_calf'],
    ['side_lateral', 'cable_lateral'],
    ['db_shoulder', 'machine_shoulder'],
    ['face_pull', 'rear_delt'],
    ['db_fly', 'pec_deck', 'cable_crossover'],
  ];
  const groupOf = id => VARIANTS.find(g => g.includes(id));
  // 몇 번째 주인지 (2026-01-05 월요일 기준)
  function weekIndex(t = Date.now()) {
    const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return Math.round((d - new Date(2026, 0, 5)) / (7 * 86400000));
  }
  function variantFor(id, wk) {
    const g = groupOf(id); if (!g || wk == null) return id;
    return g[(((g.indexOf(id) + wk) % g.length) + g.length) % g.length];
  }
  // 그날 코스에서 이 운동의 원래 자리(템플릿 운동) 찾기
  function baseInDay(dayKey, id) {
    const list = DAYS[dayKey] ? DAYS[dayKey].list : [];
    if (list.includes(id)) return id;
    const g = groupOf(id);
    return (g && list.find(x => g.includes(x))) || id;
  }

  // adds: 코스에 직접 추가한 운동 {요일키: [운동…]} — 복부 운동 앞에 끼워 넣음
  // wk: 주 번호를 주면 기구 변형을 주마다 번갈아 적용 (대체한 운동은 그대로)
  function dayExercises(dayKey, level, subs = {}, adds = {}, wk = null) {
    const d = DAYS[dayKey];
    const base = d.list.filter(id => !(level === 'beginner' && d.skipBeginner.includes(id)));
    const list = [];
    base.forEach(id => {
      if (subs[id]) { list.push(subs[id]); return; }
      const v = variantFor(id, wk);
      list.push(v !== id && !base.includes(v) && !list.includes(v) && !Object.values(subs).includes(v) ? v : id);
    });
    const extra = (adds[dayKey] || []).filter(id => EX[id] && !list.includes(id));
    if (!extra.length) return list;
    let at = list.length;
    while (at > 0 && EX[list[at - 1]].group === 'core') at--;
    const coreExtra = extra.filter(id => EX[id].group === 'core'), other = extra.filter(id => EX[id].group !== 'core');
    return [...list.slice(0, at), ...other, ...list.slice(at), ...coreExtra];
  }
  function isLowerDay(dayKey) { const a = DAYS[dayKey].area; return a.includes('lower') && !a.includes('upper'); }

  // 부위별 세트 수: 운동의 '주로 쓰는 근육'이 속한 부위에 세트를 더함 (권장 주 10~20세트)
  const REGIONS = [
    ['가슴', ['chest']], ['등', ['lats', 'mid_back']], ['어깨', ['front_delt', 'side_delt', 'rear_delt']], ['팔', ['biceps', 'triceps', 'forearm']],
    ['허벅지 앞', ['quads', 'adductors']], ['엉덩이·허벅지 뒤', ['glutes', 'hams']], ['종아리', ['calves']], ['복부·허리', ['abs', 'obliques', 'lower_back']],
  ];
  function setsByRegion(entries) { // entries: [{ exId, sets }]
    const out = Object.fromEntries(REGIONS.map(([n]) => [n, 0]));
    if (typeof MUSCLE === 'undefined') return out;
    entries.forEach(({ exId, sets }) => {
      const m = MUSCLE.MAP[exId]; if (!m || (EX[exId] && EX[exId].cardio)) return;
      REGIONS.forEach(([n, ms]) => { if (m.main.some(x => ms.includes(x))) out[n] += sets; });
    });
    return out;
  }
  // 한 주 계획 기준 부위별 세트 수
  function weekVolume(freq, level, R, subs = {}, adds = {}) {
    const entries = [];
    weekPlan(freq, level, 0).forEach(k => dayExercises(k, level, subs, adds).forEach(id => entries.push({ exId: id, sets: prescription(EX[id], level, R).sets })));
    return setsByRegion(entries);
  }

  // =========================================================
  // 4-4. 세트·횟수·휴식
  // =========================================================
  function prescription(ex, level, R) {
    let p;
    if (level === 'beginner') p = { sets: ex.big ? 3 : 2, lo: 10, hi: 15, rest: ex.big ? R.restBeginnerBig : R.restBeginnerSmall };
    else if (level === 'intermediate') p = { sets: ex.big ? 4 : 3, lo: 8, hi: 12, rest: R.restMid };
    else p = { sets: 4, lo: ex.big ? 6 : 10, hi: ex.big ? 10 : 15, rest: ex.big ? R.restAdvBig : R.restAdvSmall };
    if (ex.unit === '초') { // 플랭크: 초 단위
      const t = { beginner: [20, 40], intermediate: [30, 60], advanced: [40, 90] }[level];
      p.lo = t[0]; p.hi = t[1];
    }
    p.unit = ex.unit || '회';
    p.repStep = ex.unit === '초' ? 5 : 1;
    return p;
  }
  // 다음 번 무게를 올릴 때 한 칸 (덤벨은 20kg까지 1kg, 넘으면 2.5kg)
  function increment(ex, R, w = 0) {
    if (ex.equip === 'bodyweight') return 0;
    if (ex.equip === 'barbell') return ex.lower ? R.incBarbellLower : R.incBarbellUpper;
    if (ex.equip === 'dumbbell') return w >= R.dumbbellHeavyFrom ? R.incDumbbellHeavy : R.incDumbbell;
    return R.incMachine;
  }
  // +/- 버튼 한 번에 바뀌는 무게 (눈금에 맞춰 이동: 14.6 -> 15 / 14)
  //  덤벨: 20kg까지 1kg, 넘으면 2.5kg (20 -> 22.5 -> 25) / 바벨 2.5kg / 머신·케이블 한 칸
  function weightStep(ex, w, dir, R) {
    const up = (g) => round1(Math.floor(w / g + 1e-9) * g + g);
    const down = (g) => round1(Math.ceil(w / g - 1e-9) * g - g);
    let v;
    if (ex.equip === 'dumbbell') {
      const T = R.dumbbellHeavyFrom;
      if (dir > 0) v = w < T - 1e-9 ? Math.min(up(R.incDumbbell), T) : up(R.incDumbbellHeavy);
      else v = w > T + 1e-9 ? Math.max(down(R.incDumbbellHeavy), T) : down(R.incDumbbell);
    } else {
      const g = ex.equip === 'barbell' ? R.dropStepBarbell : R.incMachine;
      v = dir > 0 ? up(g) : down(g);
    }
    return Math.max(0, v);
  }
  const isWeighted = ex => ex.equip !== 'bodyweight';
  // 운동 하나 예상 시간(분): 세트당 약 45초 + 세트 사이 휴식 + 준비 1분
  function estMinutes(presc, sets = presc.sets) { return sets * 0.75 + (sets - 1) * presc.rest / 60 + 1; }

  // =========================================================
  // 4-6. 난이도 평가 → 다음 추천
  // =========================================================
  // 중량 10% 줄이기: 줄인 무게에서 가장 가까운 아래 단위로 (바벨 2.5kg, 덤벨·머신 1kg)
  //  예) 머신 15kg → 13.5 → 13kg / 바벨 60kg → 54 → 52.5kg
  //  어시스트 풀업은 보조 무게를 10% 늘림
  function dropWeight(ex, w, R) {
    const p = R.failDropPct / 100;
    const step = ex.equip === 'barbell' ? R.dropStepBarbell : R.dropStepOther;
    if (ex.assist) return round1(Math.ceil(w * (1 + p) / step - 1e-9) * step);
    const v = round1(Math.floor(w * (1 - p) / step + 1e-9) * step);
    return Math.max(v < w ? v : round1(w - step), ex.start || 0);
  }

  function nextRec(ex, rec, sets, rating, presc, R) {
    const inc = increment(ex, R);
    const step = presc.repStep;
    const done = sets.filter(s => s.done !== false);
    const allTop = done.length >= presc.sets && done.every(s => s.r >= presc.hi);
    let weight = rec.weight, reps = rec.reps;
    let hardStreak = rating === 'hard' ? (rec.hardStreak || 0) + 1 : 0;
    let note = '';
    const heavier = (w) => ex.assist ? Math.max(0, w - inc) : round1(w + increment(ex, R, w)); // 어시스트 풀업은 보조 무게가 줄어야 어려워짐
    const lighter = (w) => dropWeight(ex, w, R);
    if (!isWeighted(ex)) {
      if (rating === 'easy') { reps += 2 * step; note = `횟수 +${2 * step}`; }
      else if (rating === 'ok') { reps += step; note = `횟수 +${step}`; }
      else if (rating === 'hard') note = '같은 횟수 유지';
      else { reps = Math.max(step, Math.round(reps * (1 - R.failDropPct / 100) / step) * step); note = `횟수 ${R.failDropPct}% 감소`; }
      return { weight: 0, reps, hardStreak, note, suggestDrop: false };
    }
    if (rating === 'easy') {
      if (allTop) { weight = heavier(weight); reps = presc.lo; note = '모든 세트 상한 달성 → 중량 증가'; }
      else { reps = Math.min(reps + 2 * step, presc.hi); note = '횟수 +2'; }
    } else if (rating === 'ok') {
      if (allTop || reps >= presc.hi) { weight = heavier(weight); reps = presc.lo; note = '상한 도달 → 중량 증가'; }
      else { reps = Math.min(reps + step, presc.hi); note = '횟수 +1'; }
    } else if (rating === 'hard') {
      note = '같은 중량·횟수 유지';
    } else {
      const before = weight; weight = lighter(weight); note = `중량 ${R.failDropPct}% 감소 (${before} → ${round1(weight)}kg)`;
    }
    const suggestDrop = rating === 'hard' && hardStreak >= R.hardStreakLimit;
    return { weight: round1(weight), reps, hardStreak, note, suggestDrop, dropTo: suggestDrop ? lighter(rec.weight) : null };
  }

  // 4-5. 기준 중량 찾기가 끝났을 때
  function calibrated(ex, sets, presc, rating, foundWeight, R) {
    const done = sets.filter(s => s.done !== false);
    if (!isWeighted(ex)) {
      const minR = done.length ? Math.min(...done.map(s => s.r)) : presc.lo;
      return { weight: 0, reps: Math.max(presc.repStep, minR), hardStreak: 0, note: '오늘 기록한 횟수를 기준으로 삼아요' };
    }
    let w = foundWeight;
    let note = '찾은 무게를 기준 중량으로 삼아요';
    if (rating === 'fail') {
      const before = w; w = dropWeight(ex, w, R);
      note = `목표 미달이라 ${R.failDropPct}% 가볍게 시작해요 (${before} → ${round1(w)}kg)`;
    }
    return { weight: round1(w), reps: presc.lo, hardStreak: 0, note };
  }

  // =========================================================
  // 4-7·4-8. 유산소 강도
  // =========================================================
  const CARDIO_INT = {
    low: { name: '저강도', hr: [60, 70], feel: '대화 가능', min: 20, max: 40, def: 30, ex: 'treadmill', allowed: ['treadmill', 'bike', 'elliptical', 'stair'] },
    mid: { name: '중강도', hr: [70, 80], feel: '짧은 말만 가능', min: 20, max: 30, def: 20, ex: 'bike', allowed: ['bike', 'elliptical', 'rower', 'treadmill', 'stair'] },
    high: { name: '고강도 인터벌', hr: [80, 90], feel: '말하기 어려움', min: 20, max: 20, def: 20, ex: 'bike', allowed: ['bike', 'rower'] },
  };
  function cardioIntensity(profile, dayKey, direction, intervalsThisWeek) {
    if (isLowerDay(dayKey)) return { intensity: 'low', reason: '하체 날이라 저강도만 추천해요' };
    if (direction === 'loss') {
      if (profile.level !== 'beginner' && intervalsThisWeek < 1) return { intensity: 'high', reason: '감량 목표: 이번 주 인터벌 1회를 넣어요' };
      return { intensity: 'low', reason: '감량 목표라 저강도 위주로 해요' };
    }
    if (direction === 'gain') return { intensity: 'low', reason: '증량 목표라 가볍게 저강도로 해요' };
    return { intensity: 'mid', reason: profile.level === 'beginner' ? '체중 유지 목표: 초보는 중강도까지만 추천해요' : '체중 유지 목표라 중강도로 해요' };
  }
  function cardioDefaults(ex, intensity) {
    const d = (ex.defaults && (ex.defaults[intensity] || ex.defaults.mid || ex.defaults.low)) || {};
    return Object.assign({}, d);
  }
  const hrRange = (age, intensity) => {
    const maxHR = 220 - age, I = CARDIO_INT[intensity];
    return { maxHR, hr: [Math.round(maxHR * I.hr[0] / 100), Math.round(maxHR * I.hr[1] / 100)] };
  };

  // 유산소 시간 정하기
  //  감량: 목표 순소모에서 이미 쓴 열량을 빼고, 남은 열량을 채우는 시간(강도 범위·남은 시간 안에서)
  //  유지·증량: 설계서 기본 시간
  function cardioMinutes({ direction, intensity, needNet, met, kg, fitMin, R }) {
    const I = CARDIO_INT[intensity];
    let want;
    if (intensity === 'high') want = 20;
    else if (direction === 'loss') {
      const perMin = Math.max(0.1, (met - 1) * kg / 60);
      want = Math.ceil(needNet / perMin / 5) * 5;
      want = Math.min(Math.max(want, I.min), I.max);
    } else want = direction === 'gain' ? I.min : I.def;
    const minutes = Math.min(want, fitMin);
    return { minutes, want, skip: minutes < R.cardioMinMinutes, limited: minutes < want };
  }

  // =========================================================
  // 하루 운동 계획 (칼로리 기반 배분)
  //  ① 준비운동 → ② 근력(근손실 방지를 위해 먼저, 시간 확보 우선) → ③ 남은 목표 열량을 유산소로
  //  ④ 감량 중 시간이 모자라면 유산소를 다음 날로 미루지 않고 작은 운동 세트부터 줄여 유산소 최소 시간을 확보
  //  ⑤ 그래도 못 채운 열량은 '식단으로' 표시
  // =========================================================
  function sessionPlan({ profile, dayKey, subs = {}, adds = {}, next = {}, intervalsThisWeek = 0, cardioSettings, wk = null }) {
    const R = rules(profile), kg = profile.weight, level = profile.level;
    const g = goalCheck(profile, R);
    const warmMin = 7, warmNet = netKcal(WARMUP.met, kg, warmMin);
    const items = dayExercises(dayKey, level, subs, adds, wk).map(id => {
      const ex = EX[id], presc = prescription(ex, level, R);
      return { id, sets: presc.sets, presc };
    });
    let strengthMin = 0, strengthNet = 0;
    const calc = () => {
      strengthMin = 0; strengthNet = 0;
      items.forEach(it => {
        const ex = EX[it.id];
        const m = estMinutes(it.presc, it.sets);
        const w = next[it.id] ? next[it.id].weight : ex.start;
        strengthMin += m; strengthNet += netKcal(strengthMET(ex, null, w).met, kg, m);
      });
    };
    calc();
    const trims = [];
    const remain = () => profile.minutes - warmMin - strengthMin;
    if (g.direction === 'loss') {
      let guard = 0;
      while (remain() < R.cardioMinMinutes && guard++ < 30) {
        const small = items.map((it, i) => ({ it, i })).filter(o => !EX[o.it.id].big).reverse();
        const cut = small.find(o => o.it.sets > R.trimMinSets);
        if (cut) { trims.push(`${EX[cut.it.id].name} ${cut.it.sets}→${cut.it.sets - 1}세트`); cut.it.sets--; }
        else if (small.length && items.length > 3) { trims.push(`${EX[small[0].it.id].name} 빼기`); items.splice(small[0].i, 1); }
        else break;
        calc();
      }
    }
    let { intensity, reason } = cardioIntensity(profile, dayKey, g.direction, intervalsThisWeek);
    const fitMin = Math.max(0, Math.floor(remain() / 5) * 5);
    if (intensity === 'high' && fitMin < 20) { intensity = 'low'; reason = '시간이 부족해 인터벌 대신 저강도로 해요'; }
    const exId = CARDIO_INT[intensity].ex;
    const set = cardioSettings ? cardioSettings(exId, intensity) : cardioDefaults(EX[exId], intensity);
    const cm = cardioMET(exId, intensity, set, kg);
    const needNet = g.sessionTarget == null ? 0 : Math.max(0, g.sessionTarget - warmNet - strengthNet);
    const c = cardioMinutes({ direction: g.direction, intensity, needNet, met: cm.met, kg, fitMin, R });
    const cardioNet = c.skip ? 0 : netKcal(cm.met, kg, c.minutes);
    const planNet = warmNet + strengthNet + cardioNet;
    return {
      dayKey, items, trims, goal: g,
      warmMin, warmNet: Math.round(warmNet), strengthMin: Math.round(strengthMin), strengthNet: Math.round(strengthNet),
      cardio: Object.assign({ intensity, reason, exId, set, met: cm.met, metSrc: cm.src, net: Math.round(cardioNet), fitMin, needNet: Math.round(needNet) }, c, hrRange(profile.age, intensity)),
      targetNet: g.sessionTarget, planNet: Math.round(planNet),
      shortfall: g.sessionTarget == null ? 0 : Math.max(0, Math.round(g.sessionTarget - planNet)),
      totalMin: Math.round(warmMin + strengthMin + (c.skip ? 0 : c.minutes)),
    };
  }

  // 유산소 평가 → 다음 추천
  //  감량(칼로리로 시간을 정함): 쉬우면 강도(속도·경사·단계·와트)를 올림 → 같은 열량을 더 짧게
  //  유지·증량: 쉬우면 시간 +5분, 최대 시간이면 강도를 올림
  function cardioNext(ex, intensity, cur, rating, byCalories = false) {
    const I = CARDIO_INT[intensity];
    const n = Object.assign({}, cur);
    let note = '같은 설정 유지';
    const up = () => {
      if (ex.ctl === 'speed') {
        if (intensity === 'low' && n.incline < 15) { n.incline += 1; return '경사 +1%'; }
        n.speed = round1(n.speed + 0.5); return '속도 +0.5km/h';
      }
      n.level = (n.level || 1) + 1;
      if (n.watts) { n.watts += 10; return '단계 +1 · 와트 +10W'; }
      return '단계 +1';
    };
    const down = () => {
      if (ex.ctl === 'speed') {
        if (intensity === 'low' && n.incline > 0) { n.incline -= 1; return '경사 −1%'; }
        n.speed = Math.max(3, round1(n.speed - 0.5)); return '속도 −0.5km/h';
      }
      n.level = Math.max(1, (n.level || 1) - 1);
      if (n.watts) { n.watts = Math.max(20, n.watts - 10); return '단계 −1 · 와트 −10W'; }
      return '단계 −1';
    };
    if (rating === 'easy') {
      if (!byCalories && intensity !== 'high' && n.minutes + 5 <= I.max) { n.minutes += 5; note = '시간 +5분'; }
      else note = up();
    } else if (rating === 'fail') {
      if (!byCalories && intensity !== 'high' && n.minutes - 5 >= I.min) { n.minutes -= 5; note = '시간 −5분'; }
      else note = down();
    }
    return { next: n, note };
  }


  // =========================================================
  // 인바디(체성분) 판정
  //  BMI·허리둘레: 대한비만학회(2022) / 체지방률 표준·내장지방 레벨·세포외수분비: InBody 결과지 해석
  //  복부지방률(허리-엉덩이 비율): WHO / 체수분: 제지방량의 약 73%가 수분(InBody)
  // =========================================================
  const BODY_FIELDS = {
    weight: ['체중', 'kg'], fatPct: ['체지방률', '%'], smm: ['골격근량', 'kg'], tbw: ['체수분', 'L'],
    ecw: ['세포외수분비', ''], visceral: ['내장지방 레벨', ''], waist: ['허리둘레', 'cm'], whr: ['복부지방률', ''], bmr: ['기초대사량', 'kcal'],
  };
  function bodyAssess(r, p, prev) {
    const male = p.sex !== 'female';
    const out = [], advice = new Set();
    const add = (key, value, level, status, std) => out.push({ key, name: BODY_FIELDS[key][0], unit: BODY_FIELDS[key][1], value, level, status, std });
    const w = r.weight || p.weight;
    let lv, st;
    // BMI
    const bmi = round1(w / Math.pow(p.height / 100, 2));
    if (bmi < 18.5) { lv = 'caution'; st = '저체중'; advice.add('체중이 적은 편이에요. 단백질과 식사량을 충분히 챙기세요.'); }
    else if (bmi < 23) { lv = 'good'; st = '정상'; }
    else if (bmi < 25) { lv = 'caution'; st = '비만 전단계'; advice.add('BMI가 비만 전단계예요. 지금 목표대로 천천히 줄이면 정상 범위가 돼요.'); }
    else if (bmi < 30) { lv = 'bad'; st = '1단계 비만'; advice.add('BMI가 비만 범위예요. 주당 체중의 0.5~1%씩 꾸준히 줄이는 것을 목표로 하세요.'); }
    else if (bmi < 35) { lv = 'bad'; st = '2단계 비만'; advice.add('BMI가 2단계 비만이에요. 식단과 운동을 함께 관리하고 필요하면 전문가와 상담하세요.'); }
    else { lv = 'bad'; st = '3단계 비만'; advice.add('BMI가 3단계 비만이에요. 건강을 위해 전문가 상담을 권해요.'); }
    out.push({ key: 'bmi', name: 'BMI (체질량지수)', unit: '', value: bmi, level: lv, status: st, std: '정상 18.5~22.9 · 23~24.9 비만 전단계 · 25 이상 비만 (대한비만학회)' });
    // 체지방률
    if (r.fatPct != null) {
      const lo = male ? 10 : 18, hi = male ? 20 : 28, ob = male ? 25 : 30;
      if (r.fatPct < lo) { lv = 'caution'; st = '낮음'; advice.add('체지방이 너무 낮아요. 무리한 감량은 멈추고 섭취를 늘리세요.'); }
      else if (r.fatPct <= hi) { lv = 'good'; st = '표준'; }
      else if (r.fatPct < ob) { lv = 'caution'; st = '높음'; advice.add('체지방을 조금 더 빼면 좋아요. 유산소와 식단 관리를 꾸준히 하세요.'); }
      else { lv = 'bad'; st = '비만'; advice.add('체지방을 빼야 해요. 하루 섭취 칼로리를 지키고 유산소를 빠뜨리지 마세요.'); }
      add('fatPct', r.fatPct, lv, st, `표준 ${male ? '남 10~20%' : '여 18~28%'} (InBody) · ${ob}% 이상 비만`);
    }
    // 골격근량: 지난 기록과 비교
    if (r.smm != null) {
      let s2 = '첫 기록', l2 = 'none';
      if (prev && prev.smm != null) {
        const d = round1(r.smm - prev.smm);
        if (d > 0.1) { s2 = `지난번보다 +${d}kg`; l2 = 'good'; }
        else if (d < -0.3) { s2 = `지난번보다 ${d}kg`; l2 = 'caution'; advice.add('근육량이 줄었어요. 단백질(체중 1kg당 1.2~1.6g)과 근력 운동을 챙기세요.'); }
        else { s2 = '유지'; l2 = 'good'; }
      }
      add('smm', r.smm, l2, s2, '키·성별마다 기준이 달라 지난 기록과 비교해요. 감량 중에도 유지하는 게 목표예요.');
    }
    // 체수분: 제지방량 대비 비율(약 73%)
    if (r.tbw != null) {
      if (r.fatPct != null) {
        const ffm = w * (1 - r.fatPct / 100);
        const ratio = Math.round(r.tbw / ffm * 1000) / 10;
        if (ratio < 70) { lv = 'caution'; st = `제지방의 ${ratio}% · 부족할 수 있음`; advice.add('몸의 수분이 부족할 수 있어요. 물을 더 마시세요.'); }
        else if (ratio > 76) { lv = 'caution'; st = `제지방의 ${ratio}% · 많음`; advice.add('수분 비율이 높아요. 짠 음식을 줄이고 붓기가 있는지 보세요.'); }
        else { lv = 'good'; st = `제지방의 ${ratio}% · 적정`; }
        add('tbw', r.tbw, lv, st, '제지방량(체중−체지방)의 약 73%가 수분이면 적정이에요 (InBody).');
      } else add('tbw', r.tbw, 'none', '기록', '체지방률을 함께 넣으면 수분이 적정한지 알려 드려요.');
    }
    // 세포외수분비(부종 지표)
    if (r.ecw != null) {
      if (r.ecw > 0.39) { lv = 'bad'; st = '높음 · 부종 가능'; advice.add('세포외수분비가 높아요. 붓기·염분을 확인하고 계속 높으면 진료를 받아 보세요.'); }
      else if (r.ecw < 0.36) { lv = 'caution'; st = '낮음'; }
      else { lv = 'good'; st = '정상'; }
      add('ecw', r.ecw, lv, st, '정상 0.360~0.390 (InBody)');
    }
    // 내장지방 레벨
    if (r.visceral != null) {
      if (r.visceral < 10) { lv = 'good'; st = '정상'; }
      else if (r.visceral < 15) { lv = 'caution'; st = '높음'; advice.add('내장지방이 높아요. 술·단 음식·야식을 줄이고 유산소를 늘리세요.'); }
      else { lv = 'bad'; st = '매우 높음'; advice.add('내장지방이 많이 높아요. 술·단 음식을 줄이고 유산소를 꾸준히 하세요.'); }
      add('visceral', r.visceral, lv, st, '10 미만 권장 (InBody)');
    }
    // 허리둘레
    if (r.waist != null) {
      const cut = male ? 90 : 85;
      if (r.waist >= cut) { lv = 'bad'; st = '복부비만'; advice.add('허리둘레가 복부비만 기준을 넘었어요. 뱃살은 유산소와 식단으로 빠져요.'); }
      else if (r.waist >= cut - 5) { lv = 'caution'; st = '기준에 가까움'; }
      else { lv = 'good'; st = '정상'; }
      add('waist', r.waist, lv, st, `${male ? '남 90cm' : '여 85cm'} 이상 복부비만 (대한비만학회)`);
    }
    // 복부지방률(허리-엉덩이 비율)
    if (r.whr != null) {
      const cut = male ? 0.90 : 0.85;
      if (r.whr >= cut) { lv = 'bad'; st = '복부비만'; advice.add('복부지방률이 높아요. 유산소와 식단으로 뱃살을 줄이세요.'); }
      else if (r.whr >= cut - 0.03) { lv = 'caution'; st = '기준에 가까움'; }
      else { lv = 'good'; st = '정상'; }
      add('whr', r.whr, lv, st, `${male ? '남 0.90' : '여 0.85'} 이상 복부비만 (WHO)`);
    }
    if (r.bmr != null) add('bmr', r.bmr, 'none', '칼로리 계산에 사용', '공식으로 추정한 값 대신 이 측정값으로 하루 칼로리를 계산해요.');
    // 하루 물 권장량: 체중 1kg당 약 30~35ml (일반 권장)
    const water = [Math.round(w * 30 / 100) / 10, Math.round(w * 35 / 100) / 10];
    if (!advice.size) advice.add('지금처럼 꾸준히 유지하세요!');
    return { items: out, advice: [...advice], water, bmi };
  }

  return {
    BODY_FIELDS, bodyAssess, VARIANTS, weekIndex, variantFor, baseInDay, REGIONS, setsByRegion, weekVolume, rules, bmr, goalCheck, DAYS, cycle, splitNote, weekPlan, dayExercises, isLowerDay,
    prescription, increment, weightStep, isWeighted, dropWeight, nextRec, calibrated, estMinutes,
    CARDIO_INT, cardioIntensity, cardioDefaults, cardioMinutes, cardioNext, hrRange, sessionPlan,
    MET_CODES, strengthMET, cardioMET, acsmTreadmill, acsmBike, WARMUP, kcal, netKcal,
  };
})();
