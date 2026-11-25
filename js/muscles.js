/* =========================================================
   근육 자극 그림 — 몸 앞면·뒷면에 자극이 와야 하는 근육을 색칠
   main: 주로 쓰는 근육(진하게) / sub: 함께 쓰는 근육(연하게) / feel: 제대로 할 때 느낌
   ========================================================= */
const MUSCLE = (() => {
  const NAMES = {
    chest: '가슴', front_delt: '어깨 앞', side_delt: '어깨 옆', rear_delt: '어깨 뒤', traps: '승모근',
    biceps: '이두(팔 앞)', triceps: '삼두(팔 뒤)', forearm: '전완(아래팔)', abs: '복근', obliques: '옆구리',
    lats: '광배근(등 옆)', mid_back: '등 가운데', lower_back: '허리', glutes: '엉덩이',
    quads: '허벅지 앞', hams: '허벅지 뒤', calves: '종아리', adductors: '허벅지 안쪽',
  };

  const MAP = {
    bench: { main: ['chest'], sub: ['front_delt', 'triceps'], feel: '가슴 가운데~바깥쪽이 뻐근하면 제대로예요. 어깨만 아프면 팔꿈치를 조금 모으세요.' },
    incline_db: { main: ['chest'], sub: ['front_delt', 'triceps'], feel: '가슴 윗부분(쇄골 바로 아래)이 당기면 제대로예요.' },
    chest_press: { main: ['chest'], sub: ['front_delt', 'triceps'], feel: '밀 때 가슴이 조이는 느낌이 나야 해요. 팔만 지치면 무게를 줄이세요.' },
    pec_deck: { main: ['chest'], sub: ['front_delt'], feel: '팔을 모을 때 가슴 안쪽이 쥐어짜이는 느낌이에요.' },
    pushup: { main: ['chest'], sub: ['triceps', 'front_delt', 'abs'], feel: '가슴과 팔 뒤쪽이 뻐근하고, 배에 힘이 들어가 있어야 해요.' },
    db_shoulder: { main: ['front_delt', 'side_delt'], sub: ['triceps', 'traps'], feel: '어깨 위·옆이 뜨거워지면 제대로예요. 허리가 아프면 자세를 점검하세요.' },
    side_lateral: { main: ['side_delt'], sub: ['traps'], feel: '어깨 바깥쪽이 타는 느낌이에요. 목 뒤가 먼저 아프면 무게를 줄이세요.' },
    rear_delt: { main: ['rear_delt'], sub: ['mid_back', 'traps'], feel: '어깨 뒤쪽과 날개뼈 사이가 조이는 느낌이에요.' },
    face_pull: { main: ['rear_delt'], sub: ['mid_back', 'traps'], feel: '어깨 뒤쪽이 조이고 가슴이 펴지는 느낌이에요.' },
    lat_pulldown: { main: ['lats'], sub: ['biceps', 'mid_back', 'rear_delt'], feel: '겨드랑이 아래 등 옆쪽이 당기면 제대로예요. 팔만 아프면 팔꿈치로 당긴다고 생각하세요.' },
    seated_row: { main: ['mid_back', 'lats'], sub: ['biceps', 'rear_delt'], feel: '날개뼈를 모을 때 등 가운데가 조여야 해요.' },
    barbell_row: { main: ['lats', 'mid_back'], sub: ['biceps', 'lower_back', 'rear_delt'], feel: '등 전체가 뻐근해야 해요. 허리가 아프면 바로 멈추세요.' },
    one_arm_row: { main: ['lats'], sub: ['mid_back', 'biceps'], feel: '당기는 쪽 등 옆구리 위쪽이 당기는 느낌이에요.' },
    assist_pullup: { main: ['lats'], sub: ['biceps', 'mid_back'], feel: '등 옆쪽이 몸을 끌어올리는 느낌이에요.' },
    barbell_curl: { main: ['biceps'], sub: ['forearm'], feel: '팔 앞쪽 알통이 꽉 차는 느낌이에요.' },
    hammer_curl: { main: ['biceps', 'forearm'], sub: [], feel: '알통 바깥쪽과 아래팔이 함께 뻐근해요.' },
    pushdown: { main: ['triceps'], sub: [], feel: '팔 뒤쪽이 뜨거워지면 제대로예요. 팔꿈치는 몸에 붙이세요.' },
    overhead_ext: { main: ['triceps'], sub: [], feel: '팔 뒤쪽 윗부분이 길게 늘어나는 느낌이에요.' },
    squat: { main: ['quads', 'glutes'], sub: ['hams', 'lower_back', 'abs'], feel: '허벅지 앞과 엉덩이가 뻐근해야 해요. 무릎·허리 통증은 멈춤 신호예요.' },
    leg_press: { main: ['quads', 'glutes'], sub: ['hams'], feel: '허벅지 앞이 타는 느낌이에요. 발을 높이 두면 엉덩이 쪽이 더 쓰여요.' },
    leg_ext: { main: ['quads'], sub: [], feel: '무릎 위 허벅지 앞이 꽉 조여야 해요.' },
    lunge: { main: ['quads', 'glutes'], sub: ['hams', 'calves'], feel: '앞다리 허벅지와 엉덩이가 뻐근해요.' },
    rdl: { main: ['hams', 'glutes'], sub: ['lower_back'], feel: '허벅지 뒤가 쭉 늘어나는 느낌이에요. 허리가 아프면 자세가 틀린 거예요.' },
    leg_curl: { main: ['hams'], sub: ['calves'], feel: '허벅지 뒤가 수축하며 뻐근해요.' },
    hip_thrust: { main: ['glutes'], sub: ['hams'], feel: '맨 위에서 엉덩이가 꽉 조여야 해요. 허리로 들지 마세요.' },
    bulgarian: { main: ['glutes', 'quads'], sub: ['hams'], feel: '앞다리 엉덩이와 허벅지가 강하게 쓰여요.' },
    standing_calf: { main: ['calves'], sub: [], feel: '종아리가 타는 느낌이에요. 맨 위에서 1초 버티세요.' },
    seated_calf: { main: ['calves'], sub: [], feel: '종아리 아래쪽(가자미근)이 뻐근해요.' },
    plank: { main: ['abs'], sub: ['obliques', 'front_delt'], feel: '배 전체가 단단하게 버텨야 해요. 허리가 아프면 엉덩이 높이를 고치세요.' },
    crunch: { main: ['abs'], sub: ['obliques'], feel: '배 윗부분이 접히며 조이는 느낌이에요. 목이 아프면 손을 가슴에 두세요.' },
    hanging_leg: { main: ['abs'], sub: ['obliques', 'forearm'], feel: '아랫배가 말려 올라가는 느낌이에요.' },
    // ---- 2단계 추가 운동 ----
    cable_crossover: { main: ['chest'], sub: ['front_delt'], feel: '두 손을 모을 때 가슴 안쪽이 쥐어짜이는 느낌이에요.' },
    db_fly: { main: ['chest'], sub: ['front_delt'], feel: '내릴 때 가슴 바깥쪽이 쭉 늘어나는 느낌이에요. 늘어나는 구간이 근육을 키워요.' },
    machine_shoulder: { main: ['front_delt', 'side_delt'], sub: ['triceps'], feel: '어깨 위·옆이 뜨거워지면 제대로예요.' },
    tbar_row: { main: ['mid_back', 'lats'], sub: ['biceps', 'rear_delt', 'lower_back'], feel: '등 가운데가 조이고 두꺼워지는 느낌이에요.' },
    preacher_curl: { main: ['biceps'], sub: ['forearm'], feel: '팔이 펴진 아래쪽에서 알통이 강하게 당겨요.' },
    assist_dip: { main: ['triceps', 'chest'], sub: ['front_delt'], feel: '가슴 아래쪽과 팔 뒤쪽이 함께 뻐근해요.' },
    smith_squat: { main: ['quads', 'glutes'], sub: ['hams'], feel: '허벅지 앞과 엉덩이가 뻐근해요. 균형 잡기가 쉬워 하체에 집중돼요.' },
    hack_squat: { main: ['quads'], sub: ['glutes'], feel: '허벅지 앞이 타는 느낌이에요.' },
    hip_abduction: { main: ['glutes'], sub: [], feel: '엉덩이 옆쪽 위가 뜨거워져요.' },
    hip_adduction: { main: ['adductors'], sub: [], feel: '허벅지 안쪽이 조여요.' },
    back_ext: { main: ['lower_back', 'glutes'], sub: ['hams'], feel: '엉덩이와 허리 아래쪽이 단단해져요. 허리가 찌릿하면 멈추세요.' },
    cable_crunch: { main: ['abs'], sub: ['obliques'], feel: '배가 접히며 강하게 조여요. 무게를 올릴 수 있는 복근 운동이에요.' },
    bw_squat: { main: ['quads', 'glutes'], sub: ['hams', 'calves'], feel: '허벅지 앞과 엉덩이가 따뜻해져요.' },
    glute_bridge: { main: ['glutes'], sub: ['hams'], feel: '맨 위에서 엉덩이가 꽉 조여야 해요. 허리가 아니라 엉덩이로 드세요.' },
    side_plank: { main: ['obliques'], sub: ['abs', 'side_delt'], feel: '아래쪽 옆구리가 단단하게 버텨요.' },
    dead_bug: { main: ['abs'], sub: ['obliques'], feel: '허리를 바닥에 붙인 채 아랫배가 버텨요.' },
    bird_dog: { main: ['lower_back', 'abs'], sub: ['glutes', 'rear_delt'], feel: '허리와 배가 흔들리지 않게 버티는 느낌이에요.' },
    mountain_climber: { main: ['abs'], sub: ['front_delt', 'quads'], feel: '배에 힘이 들어가고 숨이 차요.' },
    // ---- 기구 변형 ----
    seated_leg_curl: { main: ['hams'], sub: ['calves'], feel: '허벅지 뒤가 늘어난 채로 강하게 조여요. 누워서 하는 것보다 근육이 더 늘어난 자세라 성장에 유리하다는 연구가 있어요.' },
    incline_leg_press: { main: ['quads', 'glutes'], sub: ['hams'], feel: '허벅지 앞과 엉덩이가 타는 느낌이에요. 등이 기대져 있어 허리 부담이 적어요.' },
    incline_chest_press: { main: ['chest'], sub: ['front_delt', 'triceps'], feel: '가슴 윗부분(쇄골 아래)이 당기면 제대로예요.' },
    machine_row: { main: ['mid_back', 'lats'], sub: ['biceps', 'rear_delt'], feel: '날개뼈 사이가 조여요. 허리 대신 등에만 집중돼요.' },
    vbar_pulldown: { main: ['lats'], sub: ['biceps', 'mid_back'], feel: '등 아래쪽 옆구리 근처가 당겨요.' },
    cable_curl: { main: ['biceps'], sub: ['forearm'], feel: '내릴 때도 알통에 힘이 계속 걸려요.' },
    leg_press_calf: { main: ['calves'], sub: [], feel: '종아리가 늘어났다 수축하며 타는 느낌이에요.' },
    db_bench: { main: ['chest'], sub: ['front_delt', 'triceps'], feel: '가슴이 바벨보다 더 깊게 늘어나요. 양팔 힘 차이도 고르게 맞춰져요.' },
    incline_bench: { main: ['chest'], sub: ['front_delt', 'triceps'], feel: '가슴 윗부분(쇄골 바로 아래)이 뻐근하면 제대로예요.' },
    db_rdl: { main: ['hams', 'glutes'], sub: ['lower_back', 'forearm'], feel: '허벅지 뒤가 쭉 늘어나요. 허리가 아프면 멈추세요.' },
    cable_lateral: { main: ['side_delt'], sub: ['traps'], feel: '어깨 바깥쪽이 처음부터 끝까지 힘을 받아요.' },
    treadmill: { main: ['quads', 'glutes', 'calves'], sub: ['hams'], feel: '경사 걷기는 엉덩이와 종아리가 따뜻해져요. 숨은 대화가 될 정도예요.' },
    bike: { main: ['quads'], sub: ['glutes', 'calves'], feel: '허벅지 앞이 주로 쓰여요.' },
    elliptical: { main: ['quads', 'glutes'], sub: ['hams', 'chest', 'lats'], feel: '다리와 함께 팔도 밀고 당기며 쓰여요.' },
    rower: { main: ['lats', 'mid_back', 'quads'], sub: ['biceps', 'glutes', 'hams'], feel: '다리로 밀고 등으로 당겨요. 팔만 쓰면 금방 지쳐요.' },
    stair: { main: ['glutes', 'quads'], sub: ['calves', 'hams'], feel: '엉덩이와 허벅지가 따뜻해져요.' },
  };

  // 근육 모양 (앞면 x=50 중심, 뒷면 x=150 중심) — 좌우 대칭은 mirror로 처리
  const E = (cx, cy, rx, ry, rot = 0) => ({ cx, cy, rx, ry, rot });
  const SHAPES = {
    front: {
      chest: [E(42, 47, 8.5, 6, 8), E(58, 47, 8.5, 6, -8)],
      front_delt: [E(31.5, 42, 4.5, 6, 15), E(68.5, 42, 4.5, 6, -15)],
      side_delt: [E(27.5, 40, 3, 5.5, 20), E(72.5, 40, 3, 5.5, -20)],
      biceps: [E(26.5, 57, 3.8, 8), E(73.5, 57, 3.8, 8)],
      forearm: [E(23.5, 77, 3.4, 9, 6), E(76.5, 77, 3.4, 9, -6)],
      abs: [E(50, 70, 6, 13)],
      obliques: [E(41.5, 71, 3, 10), E(58.5, 71, 3, 10)],
      quads: [E(43, 113, 6.5, 17, 4), E(57, 113, 6.5, 17, -4)],
      adductors: [E(47.6, 106, 2.2, 9, -8), E(52.4, 106, 2.2, 9, 8)],
      calves: [E(43.5, 150, 3.5, 10), E(56.5, 150, 3.5, 10)],
      traps: [E(41, 35, 5, 2.5, 25), E(59, 35, 5, 2.5, -25)],
    },
    back: {
      traps: [E(150, 39, 10, 7)],
      rear_delt: [E(131.5, 42, 4.5, 6, 15), E(168.5, 42, 4.5, 6, -15)],
      side_delt: [E(127.5, 40, 3, 5.5, 20), E(172.5, 40, 3, 5.5, -20)],
      triceps: [E(126.5, 57, 3.8, 8.5), E(173.5, 57, 3.8, 8.5)],
      forearm: [E(123.5, 77, 3.4, 9, 6), E(176.5, 77, 3.4, 9, -6)],
      mid_back: [E(150, 52, 5.5, 7)],
      lats: [E(139, 62, 6.5, 12, 10), E(161, 62, 6.5, 12, -10)],
      lower_back: [E(150, 78, 6, 7)],
      glutes: [E(143, 96, 7.5, 7.5), E(157, 96, 7.5, 7.5)],
      hams: [E(143, 118, 6, 15, 3), E(157, 118, 6, 15, -3)],
      calves: [E(143.5, 149, 4.8, 11), E(156.5, 149, 4.8, 11)],
    },
  };

  // 몸 윤곽 (앞·뒤 같은 모양)
  function silhouette(cx) {
    const x = v => cx + v;
    return `
      <circle class="mm-body" cx="${cx}" cy="15" r="8"/>
      <rect class="mm-body" x="${x(-3)}" y="22" width="6" height="8" rx="2"/>
      <path class="mm-body" d="M${x(-19)},34 Q${cx},30 ${x(19)},34 L${x(17)},62 Q${x(13)},80 ${x(13)},88 L${x(-13)},88 Q${x(-13)},80 ${x(-17)},62 Z"/>
      <path class="mm-body" d="M${x(-13)},86 L${x(13)},86 L${x(15)},100 L${x(-15)},100 Z"/>
      <line class="mm-limb" x1="${x(-21)}" y1="38" x2="${x(-24)}" y2="66"/><line class="mm-limb" x1="${x(21)}" y1="38" x2="${x(24)}" y2="66"/>
      <line class="mm-limb" x1="${x(-24)}" y1="66" x2="${x(-27)}" y2="90"/><line class="mm-limb" x1="${x(24)}" y1="66" x2="${x(27)}" y2="90"/>
      <line class="mm-leg" x1="${x(-7)}" y1="98" x2="${x(-7)}" y2="134"/><line class="mm-leg" x1="${x(7)}" y1="98" x2="${x(7)}" y2="134"/>
      <line class="mm-limb" x1="${x(-6.5)}" y1="134" x2="${x(-6.5)}" y2="166"/><line class="mm-limb" x1="${x(6.5)}" y1="134" x2="${x(6.5)}" y2="166"/>`;
  }

  function shapes(side, info) {
    const out = [];
    for (const [m, list] of Object.entries(SHAPES[side])) {
      const cls = info.main.includes(m) ? 'mm-main' : info.sub.includes(m) ? 'mm-sub' : 'mm-off';
      list.forEach(e => out.push(`<ellipse class="${cls}" cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}" transform="rotate(${e.rot} ${e.cx} ${e.cy})"/>`));
    }
    return out.join('');
  }

  function svg(id) {
    const info = MAP[id];
    if (!info) return '';
    return `<svg viewBox="0 0 200 176" role="img" aria-label="자극 부위: ${info.main.map(m => NAMES[m]).join(', ')}">
      ${silhouette(50)}${silhouette(150)}
      ${shapes('front', info)}${shapes('back', info)}
      <text class="fig-label" x="50" y="175" text-anchor="middle" style="font-size:8px">앞</text>
      <text class="fig-label" x="150" y="175" text-anchor="middle" style="font-size:8px">뒤</text>
    </svg>`;
  }

  // 그림 + 설명 카드
  function card(id) {
    const info = MAP[id];
    if (!info) return '';
    return `<div class="muscle-card">
      <div class="muscle-svg">${svg(id)}</div>
      <div class="muscle-text">
        <div class="small bold">자극 부위</div>
        <div class="legend" style="margin:4px 0 6px"><span><i class="mm-dot main"></i>${info.main.map(m => NAMES[m]).join(', ')}</span>
          ${info.sub.length ? `<span><i class="mm-dot sub"></i>${info.sub.map(m => NAMES[m]).join(', ')}</span>` : ''}</div>
        <div class="small">${info.feel}</div>
      </div>
    </div>`;
  }

  return { svg, card, MAP, NAMES };
})();
