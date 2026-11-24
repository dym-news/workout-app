/* =========================================================
   운동 그림 (직접 그린 SVG 선 그림) — 운동마다 시작 자세·끝 자세 2장
   사람은 옆모습(오른쪽을 봄)으로 그리고, 관절 각도로 자세를 정합니다.
   각도: 0 = 아래, 90 = 앞(오른쪽), 180 = 위, -90 = 뒤(왼쪽)
   t: 몸통 각도 / a: 팔[위팔, 아래팔] / l: 다리[허벅지, 정강이] / a2·l2: 뒤쪽(정면 그림은 왼쪽) 팔다리
   hip: 엉덩이 위치 또는 foot: 발 위치(이걸로 엉덩이 위치를 계산)
   front: 정면 그림(어깨·골반 너비가 생김) / zoom: 크게 그리기 / raw: 직접 그린 그림(위에서 본 모습 등)
   props: 기구 — plate 바벨 원판, db 덤벨, handle 손잡이, roller 다리 패드, pad 두꺼운 판(padf: 몸 앞),
          line 선, cable 케이블(점선), circle 원, poly 꺾은선, bench 벤치, arrow 움직이는 방향(노란 화살표)
   위치는 [x, y] 또는 'w'(손) 's'(어깨) 'p'(엉덩이) 'k'(무릎) 'f'(발) 'e'(팔꿈치) 'h'(머리) + [이름, x이동, y이동]
   ========================================================= */
const FIG = (() => {
  const STAND = { foot: [50, 92], t: 180, l: [0, 0] };
  const S = (o) => Object.assign({}, STAND, o);
  const seatUp = [['pad', [38, 73], [60, 73]], ['line', [48, 73], [48, 92]]];

  // 위에서 내려다본 그림 (리어 델트 플라이처럼 옆·정면으로 동작이 안 보이는 운동)
  function topView(handsOut) {
    const hands = handsOut ? [[8, 54], [92, 54]] : [[44, 24], [56, 24]];
    const arrows = handsOut ? '' :
      '<polyline class="fig-arrow" points="38,28 22,42"/><polyline class="fig-arrow" points="22.7,37.9 22,42 26,41.5"/>' +
      '<polyline class="fig-arrow" points="62,28 78,42"/><polyline class="fig-arrow" points="77.3,37.9 78,42 74,41.5"/>';
    return `
      <polyline class="fig-pad" points="38,47 62,47"/>
      <polyline class="fig-body" points="36,59 ${hands[0][0]},${hands[0][1]}"/>
      <polyline class="fig-body" points="64,59 ${hands[1][0]},${hands[1][1]}"/>
      <rect class="fig-head" x="32" y="53" width="36" height="13" rx="6.5"/>
      <circle class="fig-headtop" cx="50" cy="58" r="6"/>
      <circle class="fig-fill" cx="${hands[0][0]}" cy="${hands[0][1]}" r="2.8"/><circle class="fig-fill" cx="${hands[1][0]}" cy="${hands[1][1]}" r="2.8"/>
      ${arrows}
      <text class="fig-label" x="50" y="86" text-anchor="middle">위에서 본 모습</text>`;
  }

  // 위에서 본 덤벨 플라이: 벤치에 누워 팔을 옆으로 벌렸다 모음
  function topFly(open) {
    const L = open ? '36,34 22,30 9,35' : '36,34 42,38 47,41';
    const Rr = open ? '64,34 78,30 91,35' : '64,34 58,38 53,41';
    const hl = open ? [9, 35] : [46, 41], hr = open ? [91, 35] : [54, 41];
    const arrows = open ? '' :
      '<polyline class="fig-arrow" points="40,48 24,52"/><polyline class="fig-arrow" points="28,49.2 24,52 27.7,54.8"/>' +
      '<polyline class="fig-arrow" points="60,48 76,52"/><polyline class="fig-arrow" points="72,49.2 76,52 72.3,54.8"/>';
    return `
      <rect class="fig-pad" x="41" y="14" width="18" height="74" rx="3" style="fill:var(--figure-prop);opacity:.25;stroke:none"/>
      <rect class="fig-head" x="34" y="30" width="32" height="40" rx="10"/>
      <circle class="fig-headtop" cx="50" cy="22" r="7"/>
      <polyline class="fig-body" points="${L}"/><polyline class="fig-body" points="${Rr}"/>
      <rect class="fig-fill" x="${hl[0] - 2.5}" y="${hl[1] - 5}" width="5" height="10" rx="1.5"/>
      <rect class="fig-fill" x="${hr[0] - 2.5}" y="${hr[1] - 5}" width="5" height="10" rx="1.5"/>
      ${arrows}
      <text class="fig-label" x="50" y="96" text-anchor="middle">위에서 본 모습 · 벤치에 누워서</text>`;
  }
  // 위에서 본 힙 어브덕션(벌리기)·어덕션(모으기): 앉아서 무릎 바깥/안쪽 패드
  function topLegs(spread, padsInside, arrowDir) {
    const kl = spread ? [28, 30] : [44, 30], kr = spread ? [72, 30] : [56, 30];
    const pad = (k, side) => { const x = padsInside ? k[0] - side * 5 : k[0] + side * 5; return `<polyline class="fig-pad" points="${x},22 ${x},38" style="stroke-width:6;opacity:.8"/>`; };
    const arr = (x1, x2) => { const d = Math.sign(x2 - x1); return `<polyline class="fig-arrow" points="${x1},46 ${x2},46"/><polyline class="fig-arrow" points="${x2 - d * 4},43 ${x2},46 ${x2 - d * 4},49"/>`; };
    const arrows = arrowDir === 'out' ? arr(40, 28) + arr(60, 72) : arrowDir === 'in' ? arr(30, 42) + arr(70, 58) : '';
    return `
      <rect x="30" y="56" width="40" height="30" rx="6" style="fill:var(--figure-prop);opacity:.2"/>
      <polyline class="fig-body" style="stroke-width:7" points="45,70 ${kl[0]},${kl[1]}"/><polyline class="fig-body" style="stroke-width:7" points="55,70 ${kr[0]},${kr[1]}"/>
      <circle class="fig-head" cx="${kl[0]}" cy="${kl[1]}" r="4.5"/><circle class="fig-head" cx="${kr[0]}" cy="${kr[1]}" r="4.5"/>
      ${pad(kl, -1)}${pad(kr, 1)}
      <rect class="fig-head" x="32" y="66" width="36" height="13" rx="6.5"/>
      <circle class="fig-headtop" cx="50" cy="73" r="6"/>
      ${arrows}
      <text class="fig-label" x="50" y="96" text-anchor="middle">위에서 본 모습 · 앉아서</text>`;
  }

  const POSES = {
    // ---------- 가슴 ----------
    bench: [
      { hip: [60, 62], t: -90, l: [60, -5], a: [180, 180], props: [['bench', 22, 66, 66], ['plate', 'w']] },
      { hip: [60, 62], t: -90, l: [60, -5], a: [30, 170], props: [['bench', 22, 66, 66], ['plate', 'w']] },
    ],
    incline_db: [
      { hip: [55, 69], t: -150, l: [80, -5], a: [20, 175], props: [['pad', [58, 73], [41, 45]], ['pad', [50, 73], [64, 73]], ['line', [56, 73], [56, 92]], ['db', 'w']] },
      { hip: [55, 69], t: -150, l: [80, -5], a: [160, 160], props: [['pad', [58, 73], [41, 45]], ['pad', [50, 73], [64, 73]], ['line', [56, 73], [56, 92]], ['db', 'w']] },
    ],
    chest_press: [
      { hip: [50, 70], t: 190, l: [90, 0], a: [-60, 90], props: [...seatUp, ['pad', [41, 73], [36, 40]], ['line', [84, 20], [84, 92]], ['handle', 'w']] },
      { hip: [50, 70], t: 190, l: [90, 0], a: [90, 90], props: [...seatUp, ['pad', [41, 73], [36, 40]], ['line', [84, 20], [84, 92]], ['handle', 'w']] },
    ],
    // 정면: 양팔을 벌렸다가 가슴 앞으로 모음
    pec_deck: [
      { hip: [50, 58], t: 180, l: [30, -5], l2: [-30, 5], a: [90, 180], a2: [-90, 180], front: true, zoom: 1.2, toe: [4, 0], toe2: [-4, 0],
        props: [['poly', [[43, 60], [43, 24], [57, 24], [57, 60]]], ['pad', [34, 61], [66, 61]], ['padf', 'e', 'w'], ['padf', 'e2', 'w2'], ['arrow', [86, 28], [77, 28]], ['arrow', [14, 28], [23, 28]]] },
      { hip: [50, 58], t: 180, l: [30, -5], l2: [-30, 5], a: [-12, 178], a2: [12, -178], front: true, zoom: 1.2, toe: [4, 0], toe2: [-4, 0],
        props: [['poly', [[43, 60], [43, 24], [57, 24], [57, 60]]], ['pad', [34, 61], [66, 61]], ['padf', 'e', 'w'], ['padf', 'e2', 'w2']] },
    ],
    pushup: [
      { foot: [12, 92], l: [-65.4, -65.4], t: 114.6, a: [0, 0], toe: [0, 0] },
      { foot: [12, 92], l: [-80.4, -80.4], t: 99.6, a: [-60, 73], toe: [0, 0] },
    ],
    // ---------- 어깨 ----------
    db_shoulder: [
      { hip: [48, 70], t: 180, l: [90, 0], a: [10, 180], props: [...seatUp, ['pad', [42, 73], [42, 42]], ['db', 'w']] },
      { hip: [48, 70], t: 180, l: [90, 0], a: [175, 180], props: [...seatUp, ['pad', [42, 73], [42, 42]], ['db', 'w']] },
    ],
    side_lateral: [
      { hip: [50, 54], t: 180, l: [5, 0], l2: [-5, 0], a: [5, 0], a2: [-5, 0], front: true, zoom: 1.15, toe: [4, 0], toe2: [-4, 0], props: [['db', 'w'], ['db', 'w2'], ['arrow', [68, 56], [78, 46]], ['arrow', [32, 56], [22, 46]]] },
      { hip: [50, 54], t: 180, l: [5, 0], l2: [-5, 0], a: [90, 90], a2: [-90, -90], front: true, zoom: 1.15, toe: [4, 0], toe2: [-4, 0], props: [['db', 'w'], ['db', 'w2']] },
    ],
    // 위에서 본 모습: 앞으로 모은 팔을 양옆으로 벌림
    rear_delt: [{ raw: topView(false) }, { raw: topView(true) }],
    face_pull: [
      S({ a: [100, 100], zoom: 1.15, props: [['line', [86, 5], [86, 92]], ['cable', 'w', [86, 30]], ['handle', 'w'], ['arrow', [80, 20], [66, 20]]] }),
      S({ a: [-100, 120], zoom: 1.15, props: [['line', [86, 5], [86, 92]], ['cable', 'w', [86, 30]], ['handle', 'w']] }),
    ],
    // ---------- 등 ----------
    lat_pulldown: [
      { hip: [48, 70], t: 185, l: [90, 0], a: [175, 175], props: [['pad', [36, 73], [58, 73]], ['line', [48, 73], [48, 92]], ['pad', [60, 64], [72, 64]], ['line', [36, 4], [90, 4]], ['cable', 'w', [49, 4]], ['handle', 'w']] },
      { hip: [48, 70], t: 185, l: [90, 0], a: [-20, 170], props: [['pad', [36, 73], [58, 73]], ['line', [48, 73], [48, 92]], ['pad', [60, 64], [72, 64]], ['line', [36, 4], [90, 4]], ['cable', 'w', [49, 4]], ['handle', 'w']] },
    ],
    seated_row: [
      { hip: [40, 78], t: 170, l: [75, 105], a: [95, 95], props: [['pad', [26, 81], [50, 81]], ['line', [38, 81], [38, 92]], ['pad', [81, 70], [81, 90]], ['cable', 'w', [81, 66]], ['handle', 'w']] },
      { hip: [40, 78], t: 185, l: [75, 105], a: [-60, 90], props: [['pad', [26, 81], [50, 81]], ['line', [38, 81], [38, 92]], ['pad', [81, 70], [81, 90]], ['cable', 'w', [81, 66]], ['handle', 'w']] },
    ],
    barbell_row: [
      { foot: [50, 92], l: [15, -5], t: 120, a: [0, 0], props: [['plate', 'w']] },
      { foot: [50, 92], l: [15, -5], t: 120, a: [-70, 0], props: [['plate', 'w']] },
    ],
    one_arm_row: [
      { hip: [40, 53], t: 95, l: [0, -90], l2: [20, 0], a2: [30, 10], a: [0, 0], props: [['bench', 14, 74, 72], ['db', 'w']] },
      { hip: [40, 53], t: 95, l: [0, -90], l2: [20, 0], a2: [30, 10], a: [-75, 0], props: [['bench', 14, 74, 72], ['db', 'w']] },
    ],
    // 정면: 팔을 위로 뻗고 매달림 → 턱이 봉까지 올라감 (발판이 몸을 받쳐 줌)
    assist_pullup: [
      { hip: [50, 55], t: 180, l: [4, 0], l2: [-4, 0], a: [160, 170], a2: [-160, -170], front: true, noGround: true, toe: [3, 0], toe2: [-3, 0],
        props: [['line', [22, 9], [22, 96]], ['line', [78, 9], [78, 96]], ['line', [18, 9], [82, 9]], ['pad', ['f2', -7, 2], ['f', 7, 2]], ['arrow', [88, 62], [88, 44]]] },
      { hip: [50, 41], t: 180, l: [4, 0], l2: [-4, 0], a: [74, 204], a2: [-74, -204], front: true, noGround: true, toe: [3, 0], toe2: [-3, 0],
        props: [['line', [22, 9], [22, 96]], ['line', [78, 9], [78, 96]], ['line', [18, 9], [82, 9]], ['pad', ['f2', -7, 2], ['f', 7, 2]]] },
    ],
    // ---------- 팔 ----------
    barbell_curl: [
      S({ a: [14, 4], zoom: 1.15, props: [['plate', 'w'], ['arrow', [68, 62], [68, 42]]] }),
      S({ a: [8, 155], zoom: 1.15, props: [['plate', 'w']] }),
    ],
    hammer_curl: [
      S({ a: [14, 4], zoom: 1.15, props: [['db', 'w'], ['arrow', [66, 62], [66, 42]]] }),
      S({ a: [8, 160], zoom: 1.15, props: [['db', 'w']] }),
    ],
    pushdown: [
      { foot: [50, 92], t: 170, l: [0, 0], a: [5, 140], zoom: 1.15, props: [['line', [82, 5], [82, 92]], ['cable', 'w', [82, 8]], ['handle', 'w'], ['arrow', [70, 38], [70, 56]]] },
      { foot: [50, 92], t: 170, l: [0, 0], a: [5, 5], zoom: 1.15, props: [['line', [82, 5], [82, 92]], ['cable', 'w', [82, 8]], ['handle', 'w']] },
    ],
    overhead_ext: [
      S({ a: [150, -40], props: [['db', 'w'], ['arrow', [68, 28], [68, 10]]] }),
      S({ a: [150, 170], props: [['db', 'w']] }),
    ],
    // ---------- 하체 ----------
    squat: [
      S({ a: [-60, 150], props: [['plate', ['s', -2, -3]]] }),
      { foot: [50, 92], l: [80, -20], t: 145, a: [-95, 115], props: [['plate', ['s', -2, -3]]] },
    ],
    // 앉아서 미는 레그프레스: 등을 기대고 발판을 앞으로 밀어냄
    leg_press: [
      { hip: [38, 72], t: 200, l: [141, 39], a: [20, 80], toe: [1, -6], props: [['pad', [34, 77], [24, 46]], ['pad', [28, 76], [46, 76]], ['line', [36, 76], [36, 93]], ['line', [58, 88], [96, 88]], ['pad', ['f', 2, -9], ['f', 2, 9]], ['line', ['f', 2, 9], ['f', 2, 16]], ['handle', 'w'], ['arrow', [76, 62], [90, 62]]] },
      { hip: [38, 72], t: 200, l: [85, 95], a: [20, 80], toe: [1, -6], props: [['pad', [34, 77], [24, 46]], ['pad', [28, 76], [46, 76]], ['line', [36, 76], [36, 93]], ['line', [58, 88], [96, 88]], ['pad', ['f', 2, -9], ['f', 2, 9]], ['line', ['f', 2, 9], ['f', 2, 16]], ['handle', 'w']] },
    ],
    leg_ext: [
      { hip: [50, 70], t: 180, l: [90, 0], a: [10, 40], zoom: 1.15, props: [...seatUp, ['pad', [42, 73], [42, 42]], ['roller', ['f', 3, -3]], ['arrow', [78, 88], [88, 78]]] },
      { hip: [50, 70], t: 180, l: [90, 90], a: [10, 40], zoom: 1.15, props: [...seatUp, ['pad', [42, 73], [42, 42]], ['roller', ['f', 0, -4]]] },
    ],
    lunge: [
      S({ a: [0, 0], props: [['db', 'w']] }),
      { hip: [47, 73], t: 180, l: [90, 0], l2: [-22, -95], a: [0, 0], props: [['db', 'w']] },
    ],
    // 무릎은 살짝만 굽히고, 엉덩이를 뒤로 빼며 상체를 숙임
    rdl: [
      { foot: [55, 92], t: 180, l: [0, 0], a: [0, 0], zoom: 1.1, props: [['plate', 'w'], ['arrow', [44, 50], [32, 50]]] },
      { foot: [55, 92], t: 110, l: [45, -5], a: [0, 0], zoom: 1.1, props: [['plate', 'w']] },
    ],
    leg_curl: [
      { hip: [45, 64], t: 90, l: [-90, -90], a: [45, 0], props: [['bench', 14, 72, 68], ['roller', ['f', 0, -4]], ['arrow', [6, 56], [14, 44]]] },
      { hip: [45, 64], t: 90, l: [-90, 145], a: [45, 0], props: [['bench', 14, 72, 68], ['roller', ['f', -3, -2]]] },
    ],
    hip_thrust: [
      { hip: [42, 84], t: -147, l: [122, 24], a: [90, 0], props: [['bench', 8, 32, 70], ['plate', ['p', 0, -7]]] },
      { hip: [52, 66], t: -90, l: [65, -9], a: [90, 135], props: [['bench', 8, 32, 70], ['plate', ['p', 0, -7]]] },
    ],
    bulgarian: [
      { hip: [50, 56], t: 180, l: [15, 15], l2: [-29, -90], a: [0, 0], props: [['bench', 6, 30, 76], ['db', 'w']] },
      { hip: [46, 72], t: 180, l: [88, -5], l2: [-40, -122], a: [0, 0], props: [['bench', 6, 30, 76], ['db', 'w']] },
    ],
    // 발 앞쪽만 발판에 올리고, 뒤꿈치를 내렸다가(시작) 높이 들어 올림(끝)
    standing_calf: [
      { foot: [50, 88], t: 180, l: [0, 0], a: [-20, 160], toe: [8, -2], props: [['pad', ['s', -7, -3], ['s', 7, -3]], ['poly', [[54, 93.5], [54, 86], [74, 86], [74, 93.5]]], ['arrow', [41, 90], [41, 76]]] },
      { foot: [50, 79], t: 180, l: [0, 0], a: [-20, 160], toe: [7, 7], props: [['pad', ['s', -7, -3], ['s', 7, -3]], ['poly', [[54, 93.5], [54, 86], [74, 86], [74, 93.5]]]] },
    ],
    seated_calf: [
      { hip: [42, 64], t: 180, l: [90, 0], a: [30, 60], toe: [8, -3], zoom: 1.1, props: [['pad', [30, 67], [52, 67]], ['line', [41, 67], [41, 93.5]], ['pad', ['k', -8, -4], ['k', 3, -4]], ['poly', [[66, 93.5], [66, 80], [80, 80], [80, 93.5]]], ['arrow', [76, 64], [76, 50]]] },
      { hip: [42, 64], t: 180, l: [115, 0], a: [45, 80], toe: [10, 5], zoom: 1.1, props: [['pad', [30, 67], [52, 67]], ['line', [41, 67], [41, 93.5]], ['pad', ['k', -8, -4], ['k', 3, -4]], ['poly', [[66, 93.5], [66, 80], [80, 80], [80, 93.5]]]] },
    ],
    // ---------- 복부 ----------
    plank: [
      { hip: [50, 82], t: 82, l: [-58, -90], a: [0, 90], toe: [0, 0], zoom: 1.1 },
      { foot: [12, 92], t: 102.5, l: [-77.5, -77.5], a: [0, 90], toe: [0, 0], zoom: 1.1, props: [['cable', ['f', 0, -9], ['h', 2, -9]]] },
    ],
    crunch: [
      { hip: [50, 88], t: -90, l: [150, 20], a: [167, -53], zoom: 1.35, props: [['arrow', [14, 78], [22, 68]]] },
      { hip: [50, 88], t: -125, l: [150, 20], a: [132, -88], zoom: 1.35 },
    ],
    hanging_leg: [
      { hip: [50, 52], t: 180, l: [0, 0], a: [180, 180], noGround: true, props: [['line', [30, 5], [70, 5]], ['handle', 'w']] },
      { hip: [50, 52], t: 180, l: [90, 90], a: [180, 180], noGround: true, props: [['line', [30, 5], [70, 5]], ['handle', 'w']] },
    ],
    // ---------- 2단계 추가 운동 ----------
    cable_crossover: [
      { hip: [50, 55], t: 180, l: [5, 0], l2: [-5, 0], a: [125, 115], a2: [-125, -115], front: true, zoom: 1.1, toe: [3, 0], toe2: [-3, 0],
        props: [['line', [88, 6], [88, 93]], ['line', [12, 6], [12, 93]], ['cable', 'w', [88, 8]], ['cable', 'w2', [12, 8]], ['handle', 'w'], ['handle', 'w2'], ['arrow', [82, 34], [70, 46]], ['arrow', [18, 34], [30, 46]]] },
      { hip: [50, 55], t: 180, l: [5, 0], l2: [-5, 0], a: [-20, -10], a2: [20, 10], front: true, zoom: 1.1, toe: [3, 0], toe2: [-3, 0],
        props: [['line', [88, 6], [88, 93]], ['line', [12, 6], [12, 93]], ['cable', 'w', [88, 8]], ['cable', 'w2', [12, 8]], ['handle', 'w'], ['handle', 'w2']] },
    ],
    db_fly: [{ raw: topFly(false) }, { raw: topFly(true) }],
    machine_shoulder: [
      { hip: [48, 70], t: 180, l: [90, 0], a: [10, 180], props: [...seatUp, ['pad', [42, 73], [42, 42]], ['line', [72, 8], [72, 92]], ['line', 'w', [72, 30]], ['handle', 'w']] },
      { hip: [48, 70], t: 180, l: [90, 0], a: [175, 180], props: [...seatUp, ['pad', [42, 73], [42, 42]], ['line', [72, 8], [72, 92]], ['line', 'w', [72, 30]], ['handle', 'w']] },
    ],
    tbar_row: [
      { foot: [50, 92], l: [15, -5], t: 120, a: [0, 0], props: [['line', ['w', 0, 2], [16, 92]], ['plate', ['w', -7, 4]], ['handle', 'w']] },
      { foot: [50, 92], l: [15, -5], t: 120, a: [-70, 0], props: [['line', ['w', 0, 2], [16, 92]], ['plate', ['w', -7, 4]], ['handle', 'w']] },
    ],
    preacher_curl: [
      { hip: [45, 70], t: 180, l: [90, 0], a: [60, 70], props: [['pad', [33, 73], [55, 73]], ['line', [44, 73], [44, 92]], ['pad', [44, 56], [63, 67]], ['line', [56, 64], [56, 92]], ['plate', 'w']] },
      { hip: [45, 70], t: 180, l: [90, 0], a: [60, 175], props: [['pad', [33, 73], [55, 73]], ['line', [44, 73], [44, 92]], ['pad', [44, 56], [63, 67]], ['line', [56, 64], [56, 92]], ['plate', 'w']] },
    ],
    assist_dip: [
      { hip: [50, 52], t: 180, l: [0, -90], a: [-5, 10], noGround: false, props: [['line', [40, 55], [64, 55]], ['line', [62, 55], [62, 93]], ['pad', [28, 74], [56, 74]], ['line', [56, 74], [72, 93]], ['handle', 'w'], ['arrow', [76, 36], [76, 52]]] },
      { hip: [50, 62], t: 180, l: [0, -90], a: [-60, 55], props: [['line', [40, 55], [64, 55]], ['line', [62, 55], [62, 93]], ['pad', [28, 84], [56, 84]], ['line', [56, 84], [72, 93]], ['handle', 'w']] },
    ],
    smith_squat: [
      S({ a: [-60, 150], props: [['line', [64, 3], [64, 93]], ['line', ['s', -2, -3], [64, 29]], ['plate', ['s', -2, -3]]] }),
      { foot: [50, 92], l: [80, -20], t: 145, a: [-95, 115], props: [['line', [64, 3], [64, 93]], ['line', ['s', -2, -3], [64, 50]], ['plate', ['s', -2, -3]]] },
    ],
    hack_squat: [
      { foot: [62, 90], l: [20, 20], t: 200, a: [-30, 170], toe: [6, -2], props: [['pad', ['p', -5, 2], ['s', -5, -2]], ['pad', [54, 94], [78, 87]], ['roller', ['s', 1, -4]]] },
      { foot: [62, 90], l: [100, -30], t: 200, a: [-30, 170], toe: [6, -2], props: [['pad', ['p', -5, 2], ['s', -5, -2]], ['pad', [54, 94], [78, 87]], ['roller', ['s', 1, -4]]] },
    ],
    hip_abduction: [{ raw: topLegs(false, false, 'out') }, { raw: topLegs(true, false) }],
    hip_adduction: [{ raw: topLegs(true, true, 'in') }, { raw: topLegs(false, true) }],
    back_ext: [
      { hip: [55, 58], t: 10, l: [-44, -44], a: [100, -80], noGround: true, props: [['pad', [53, 65], [63, 55]], ['pad', [22, 88], [32, 82]], ['line', [58, 62], [58, 93]], ['line', [27, 85], [27, 93]], ['line', [18, 93], [66, 93]]] },
      { hip: [55, 58], t: 136, l: [-44, -44], a: [40, -100], noGround: true, props: [['pad', [53, 65], [63, 55]], ['pad', [22, 88], [32, 82]], ['line', [58, 62], [58, 93]], ['line', [27, 85], [27, 93]], ['line', [18, 93], [66, 93]]] },
    ],
    cable_crunch: [
      { hip: [45, 73], t: 165, l: [0, -90], a: [160, -100], props: [['line', [74, 2], [74, 93]], ['cable', 'w', [74, 5]], ['handle', 'w'], ['arrow', [62, 30], [70, 48]]] },
      { hip: [45, 73], t: 110, l: [0, -90], a: [105, -155], props: [['line', [74, 2], [74, 93]], ['cable', 'w', [74, 5]], ['handle', 'w']] },
    ],
    bw_squat: [
      S({ a: [85, 85] }),
      { foot: [50, 92], l: [80, -20], t: 145, a: [85, 85] },
    ],
    glute_bridge: [
      { hip: [50, 88], t: -90, l: [140, 30], a: [90, 90], props: [['arrow', [50, 82], [50, 68]]] },
      { hip: [48, 76], t: -59, l: [103, 15], a: [100, 90] },
    ],
    side_plank: [
      { hip: [50, 82], t: 82, l: [-58, -90], a: [0, 90], a2: [120, 60], toe: [0, 0], zoom: 1.1 },
      { foot: [12, 92], t: 102.5, l: [-77.5, -77.5], a: [0, 90], a2: [180, 180], toe: [0, 0], zoom: 1.1, props: [['cable', ['f', 0, -9], ['h', 2, -9]]] },
    ],
    dead_bug: [
      { hip: [55, 86], t: -90, l: [180, 90], l2: [180, 90], a: [180, 180], a2: [180, 180] },
      { hip: [55, 86], t: -90, l: [95, 90], l2: [180, 90], a: [-80, -80], a2: [180, 180] },
    ],
    bird_dog: [
      { hip: [40, 70], t: 105, l: [0, -90], l2: [0, -90], a: [0, 0], a2: [0, 0] },
      { hip: [40, 70], t: 105, l: [0, -90], l2: [-88, -88], a: [95, 95], a2: [0, 0] },
    ],
    mountain_climber: [
      { foot: [12, 92], l: [-65.4, -65.4], l2: [-65.4, -65.4], t: 114.6, a: [0, 0], toe: [0, 0], toe2: [0, 0], props: [['arrow', [26, 70], [46, 64]]] },
      { hip: [46.5, 76.2], l: [95, -30], l2: [-65.4, -65.4], t: 114.6, a: [0, 0], toe: [0, 0], toe2: [0, 0] },
    ],
    // ---------- 기구 변형 ----------
    // 시티드 레그 컬: 다리를 앞으로 편 채 앉아서 발뒤꿈치를 의자 밑으로 당김
    seated_leg_curl: [
      { hip: [45, 66], t: 185, l: [90, 85], a: [20, 60], props: [['pad', [33, 69], [55, 69]], ['line', [44, 69], [44, 92]], ['pad', [38, 69], [35, 38]], ['pad', ['k', -13, -4], ['k', -1, -4]], ['roller', ['f', 0, 3]], ['arrow', [88, 74], [80, 86]]] },
      { hip: [45, 66], t: 185, l: [90, -5], a: [20, 60], props: [['pad', [33, 69], [55, 69]], ['line', [44, 69], [44, 92]], ['pad', [38, 69], [35, 38]], ['pad', ['k', -13, -4], ['k', -1, -4]], ['roller', ['f', 3, 0]]] },
    ],
    // 45도 레그프레스: 비스듬히 누워 발판을 대각선 위로 밀어 올림
    incline_leg_press: [
      { hip: [32, 74], t: -135, l: [182, 88], a: [45, 80], toe: [-4, -4], props: [['pad', [36, 78], [12, 54]], ['line', [24, 66], [24, 92]], ['line', [52, 80], [90, 42]], ['pad', ['f', -5, -5], ['f', 5, 5]], ['handle', 'w'], ['arrow', [64, 64], [74, 54]]] },
      { hip: [32, 74], t: -135, l: [128, 142], a: [45, 80], toe: [-4, -4], props: [['pad', [36, 78], [12, 54]], ['line', [24, 66], [24, 92]], ['line', [52, 80], [90, 42]], ['pad', ['f', -5, -5], ['f', 5, 5]], ['handle', 'w']] },
    ],
    incline_chest_press: [
      { hip: [50, 70], t: 190, l: [90, 0], a: [-50, 135], props: [...seatUp, ['pad', [41, 73], [36, 40]], ['line', [84, 14], [84, 92]], ['handle', 'w']] },
      { hip: [50, 70], t: 190, l: [90, 0], a: [125, 125], props: [...seatUp, ['pad', [41, 73], [36, 40]], ['line', [84, 14], [84, 92]], ['handle', 'w']] },
    ],
    machine_row: [
      { hip: [48, 70], t: 175, l: [90, 0], a: [90, 90], props: [...seatUp, ['pad', [57, 52], [57, 68]], ['line', [82, 28], [82, 92]], ['line', 'w', [82, 40]], ['handle', 'w']] },
      { hip: [48, 70], t: 175, l: [90, 0], a: [-70, 90], props: [...seatUp, ['pad', [57, 52], [57, 68]], ['line', [82, 28], [82, 92]], ['line', 'w', [82, 40]], ['handle', 'w']] },
    ],
    vbar_pulldown: [
      { hip: [48, 70], t: 185, l: [90, 0], a: [175, 175], props: [['pad', [36, 73], [58, 73]], ['line', [48, 73], [48, 92]], ['pad', [60, 64], [72, 64]], ['line', [36, 4], [90, 4]], ['cable', 'w', [49, 4]], ['db', 'w']] },
      { hip: [48, 70], t: 180, l: [90, 0], a: [-15, 172], props: [['pad', [36, 73], [58, 73]], ['line', [48, 73], [48, 92]], ['pad', [60, 64], [72, 64]], ['line', [36, 4], [90, 4]], ['cable', 'w', [49, 4]], ['db', 'w']] },
    ],
    cable_curl: [
      S({ a: [14, 6], zoom: 1.1, props: [['line', [78, 6], [78, 92]], ['cable', 'w', [78, 88]], ['handle', 'w'], ['arrow', [68, 64], [68, 44]]] }),
      S({ a: [8, 158], zoom: 1.1, props: [['line', [78, 6], [78, 92]], ['cable', 'w', [78, 88]], ['handle', 'w']] }),
    ],
    // 레그프레스 카프 레이즈: 다리는 편 채로 발끝으로만 발판을 밀어냄
    leg_press_calf: [
      { hip: [38, 72], t: 200, l: [85, 95], a: [20, 80], toe: [-1, -7], props: [['pad', [34, 77], [24, 46]], ['pad', [28, 76], [46, 76]], ['line', [36, 76], [36, 93]], ['line', [58, 88], [96, 88]], ['pad', ['f', 4, -12], ['f', 4, 6]], ['line', ['f', 4, 6], ['f', 4, 16]], ['handle', 'w'], ['arrow', [86, 60], [86, 52]]] },
      { hip: [38, 72], t: 200, l: [85, 95], a: [20, 80], toe: [5, -5], props: [['pad', [34, 77], [24, 46]], ['pad', [28, 76], [46, 76]], ['line', [36, 76], [36, 93]], ['line', [58, 88], [96, 88]], ['pad', ['f', 8, -12], ['f', 8, 6]], ['line', ['f', 8, 6], ['f', 8, 16]], ['handle', 'w']] },
    ],
    // 케이블 레터럴 레이즈: 정면, 반대쪽 낮은 도르래에서 옆으로 들어 올림
    cable_lateral: [
      { hip: [50, 55], t: 180, l: [5, 0], l2: [-5, 0], a: [-30, -20], a2: [-20, 20], front: true, zoom: 1.1, toe: [3, 0], toe2: [-3, 0], props: [['line', [88, 8], [88, 93]], ['cable', 'w', [88, 88]], ['handle', 'w'], ['arrow', [62, 56], [76, 44]]] },
      { hip: [50, 55], t: 180, l: [5, 0], l2: [-5, 0], a: [90, 95], a2: [-20, 20], front: true, zoom: 1.1, toe: [3, 0], toe2: [-3, 0], props: [['line', [88, 8], [88, 93]], ['cable', 'w', [88, 88]], ['handle', 'w']] },
    ],
    // ---------- 유산소 ----------
    treadmill: [
      { hip: [45, 50], t: 175, l: [20, 0], l2: [-20, -10], a: [30, 80], a2: [-25, -10], props: [['pad', [10, 90], [86, 82]], ['line', [84, 82], [80, 42]], ['line', [80, 42], [70, 44]]] },
      { hip: [45, 50], t: 175, l: [-20, -10], l2: [20, 0], a: [-25, -10], a2: [30, 80], props: [['pad', [10, 90], [86, 82]], ['line', [84, 82], [80, 42]], ['line', [80, 42], [70, 44]]] },
    ],
    bike: [
      { hip: [40, 52], t: 150, l: [89, -12], l2: [42, 7], a: [75, 48], props: [['line', [40, 55], [50, 80]], ['pad', [34, 54], [46, 54]], ['line', [50, 80], [68, 48]], ['line', [68, 48], [74, 44]], ['circle', [72, 80], 9], ['circle', [55, 78], 7], ['line', [50, 80], [36, 92]], ['line', [50, 80], [84, 92]]] },
      { hip: [40, 52], t: 150, l: [42, 7], l2: [89, -12], a: [75, 48], props: [['line', [40, 55], [50, 80]], ['pad', [34, 54], [46, 54]], ['line', [50, 80], [68, 48]], ['line', [68, 48], [74, 44]], ['circle', [72, 80], 9], ['circle', [55, 78], 7], ['line', [50, 80], [36, 92]], ['line', [50, 80], [84, 92]]] },
    ],
    elliptical: [
      { hip: [45, 48], t: 178, l: [15, -5], l2: [-15, -5], a: [70, 40], a2: [40, 20], props: [['line', [15, 90], [80, 90]], ['line', [78, 90], [74, 40]], ['line', 'w', [64, 90]], ['line', 'w2', [58, 90]], ['pad', ['f', -4, 3], ['f', 8, 3]], ['pad', ['f2', -4, 3], ['f2', 8, 3]]] },
      { hip: [45, 48], t: 178, l: [-15, -5], l2: [15, -5], a: [40, 20], a2: [70, 40], props: [['line', [15, 90], [80, 90]], ['line', [78, 90], [74, 40]], ['line', 'w', [64, 90]], ['line', 'w2', [58, 90]], ['pad', ['f', -4, 3], ['f', 8, 3]], ['pad', ['f2', -4, 3], ['f2', 8, 3]]] },
    ],
    rower: [
      { hip: [45, 80], t: 160, l: [124, 48], a: [110, 95], props: [['line', [5, 86], [95, 86]], ['pad', ['p', -6, 3], ['p', 6, 3]], ['pad', [79, 72], [79, 88]], ['circle', [89, 74], 6], ['cable', 'w', [86, 72]], ['handle', 'w']] },
      { hip: [37, 81], t: 200, l: [90, 90], a: [-80, 90], props: [['line', [5, 86], [95, 86]], ['pad', ['p', -6, 3], ['p', 6, 3]], ['pad', [79, 72], [79, 88]], ['circle', [89, 74], 6], ['cable', 'w', [86, 72]], ['handle', 'w']] },
    ],
    stair: [
      { hip: [42, 49], t: 175, l: [45, -15], l2: [-8, 0], a: [70, 60], props: [['poly', [[18, 92], [18, 87], [40, 87], [40, 81], [60, 81], [60, 75], [82, 75], [82, 92]]], ['line', [60, 40], [88, 40]], ['line', [88, 40], [88, 75]]] },
      { hip: [48, 43], t: 175, l: [4, 4], l2: [46, 10], a: [60, 50], props: [['poly', [[18, 92], [18, 87], [40, 87], [40, 81], [60, 81], [60, 75], [82, 75], [82, 92]]], ['line', [60, 40], [88, 40]], ['line', [88, 40], [88, 75]]] },
    ],
  };

  // 그림 아래 설명 (기본: 시작 자세 / 끝 자세)
  const CAPS = {
    plank: ['① 무릎 대고 자리 잡기', '② 무릎 펴고 일직선 버티기'],
    rear_delt: ['시작: 팔을 앞으로 모음', '끝: 양옆으로 크게 벌림'],
    db_fly: ['시작: 가슴 위로 모음', '끝: 양옆으로 벌려 내림'],
    hip_abduction: ['시작: 무릎 모은 자세', '끝: 바깥으로 벌림'],
    hip_adduction: ['시작: 다리 벌린 자세', '끝: 안쪽으로 모음'],
    side_plank: ['① 무릎 대고 옆으로 버티기', '② 다리 펴고 일직선'],
    dead_bug: ['시작: 팔·무릎 들기', '끝: 반대 팔·다리 뻗기'],
    bird_dog: ['시작: 네발 자세', '끝: 반대 팔·다리 뻗기'],
    mountain_climber: ['시작: 푸시업 자세', '끝: 무릎을 가슴으로 (번갈아)'],
  };

  // ---------- 계산 ----------
  const dir = a => { const r = a * Math.PI / 180; return [Math.sin(r), Math.cos(r)]; };
  const add = (p, d, len) => [p[0] + d[0] * len, p[1] + d[1] * len];
  const r1 = n => Math.round(n * 10) / 10;

  function solve(q) {
    const l = q.l || [0, 0];
    let hip = q.hip;
    if (q.foot) {
      const a = dir(l[0]), b = dir(l[1]);
      hip = [q.foot[0] - (a[0] + b[0]) * 19, q.foot[1] - (a[1] + b[1]) * 19];
    }
    const s = add(hip, dir(q.t), 22);
    const P = { p: hip, s, h: add(s, dir(q.t), 8) };
    // 정면 그림이면 어깨·골반에 너비를 줌
    const so = q.front ? 5 : 0, ho = q.front ? 3 : 0;
    P.s1 = [s[0] + so, s[1]]; P.s2 = [s[0] - so, s[1]];
    P.p1 = [hip[0] + ho, hip[1]]; P.p2 = [hip[0] - ho, hip[1]];
    const arm = (ang, k, base) => { if (!ang) return; P['e' + k] = add(base, dir(ang[0]), 13); P['w' + k] = add(P['e' + k], dir(ang[1]), 12); };
    const leg = (ang, k, base) => { if (!ang) return; P['k' + k] = add(base, dir(ang[0]), 19); P['f' + k] = add(P['k' + k], dir(ang[1]), 19); };
    arm(q.a || [0, 0], '', P.s1); arm(q.a2, '2', P.s2);
    leg(l, '', P.p1); leg(q.l2, '2', P.p2);
    return P;
  }

  function pt(P, v) {
    if (typeof v === 'string') return P[v];
    if (typeof v[0] === 'string') { const b = P[v[0]]; return [b[0] + v[1], b[1] + v[2]]; }
    return v;
  }
  const xy = p => `${r1(p[0])},${r1(p[1])}`;
  const pl = (pts, cls) => `<polyline class="${cls}" points="${pts.map(xy).join(' ')}"/>`;

  function prop(P, pr) {
    const [type, ...a] = pr;
    switch (type) {
      case 'plate': { const c = pt(P, a[0]); return `<circle class="fig-prop thick" cx="${r1(c[0])}" cy="${r1(c[1])}" r="6.5"/><circle class="fig-fill" cx="${r1(c[0])}" cy="${r1(c[1])}" r="1.6"/>`; }
      case 'db': { const c = pt(P, a[0]); return `<rect class="fig-fill" x="${r1(c[0] - 5)}" y="${r1(c[1] - 2.5)}" width="10" height="5" rx="1.5"/>`; }
      case 'handle': { const c = pt(P, a[0]); return `<circle class="fig-fill" cx="${r1(c[0])}" cy="${r1(c[1])}" r="2.6"/>`; }
      case 'roller': { const c = pt(P, a[0]); return `<circle class="fig-fill" cx="${r1(c[0])}" cy="${r1(c[1])}" r="3.6"/>`; }
      case 'pad': return pl([pt(P, a[0]), pt(P, a[1])], 'fig-pad');
      case 'padf': return pl([pt(P, a[0]), pt(P, a[1])], 'fig-pad front');
      case 'line': return pl([pt(P, a[0]), pt(P, a[1])], 'fig-prop');
      case 'cable': return pl([pt(P, a[0]), pt(P, a[1])], 'fig-cable');
      case 'circle': { const c = pt(P, a[0]); return `<circle class="fig-prop" cx="${c[0]}" cy="${c[1]}" r="${a[1]}"/>`; }
      case 'poly': return pl(a[0].map(v => pt(P, v)), 'fig-prop');
      case 'arrow': {
        const p1 = pt(P, a[0]), p2 = pt(P, a[1]);
        const ang = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
        const h = (d) => [p2[0] - 4 * Math.cos(ang + d), p2[1] - 4 * Math.sin(ang + d)];
        return pl([p1, p2], 'fig-arrow') + pl([h(0.5), p2, h(-0.5)], 'fig-arrow');
      }
      case 'bench': { const [x1, x2, y] = a; return pl([[x1, y], [x2, y]], 'fig-pad') + pl([[x1 + 3, y], [x1 + 3, 92]], 'fig-prop') + pl([[x2 - 3, y], [x2 - 3, 92]], 'fig-prop'); }
    }
    return '';
  }
  const FRONT_PROPS = ['plate', 'db', 'handle', 'roller', 'arrow', 'padf'];

  function draw(q) {
    if (q.raw) return q.raw;
    const P = solve(q);
    const farCls = q.front ? 'fig-body' : 'fig-far';
    const toe = (f, t) => [f[0] + t[0], f[1] + t[1]];
    const parts = [];
    if (!q.noGround) parts.push(pl([[4, 93.5], [96, 93.5]], 'fig-ground'));
    (q.props || []).filter(p => !FRONT_PROPS.includes(p[0])).forEach(p => parts.push(prop(P, p)));
    // 뒤쪽(정면 그림은 왼쪽) 팔다리
    if (P.k2) parts.push(pl([P.p2, P.k2, P.f2, toe(P.f2, q.toe2 || [6, 0])], farCls));
    if (P.e2) parts.push(pl([P.s2, P.e2, P.w2], farCls));
    // 몸통·머리
    parts.push(pl([P.p, P.s], 'fig-body'));
    if (q.front) { parts.push(pl([P.s2, P.s1], 'fig-body')); parts.push(pl([P.p2, P.p1], 'fig-body')); }
    parts.push(`<circle class="fig-head" cx="${r1(P.h[0])}" cy="${r1(P.h[1])}" r="5.5"/>`);
    // 앞쪽 팔다리
    parts.push(pl([P.p1, P.k, P.f, toe(P.f, q.toe || [6, 0])], 'fig-body'));
    parts.push(pl([P.s1, P.e, P.w], 'fig-body'));
    (q.props || []).filter(p => FRONT_PROPS.includes(p[0])).forEach(p => parts.push(prop(P, p)));
    return parts.join('');
  }

  function svg(id, idx, label) {
    const pose = POSES[id] && POSES[id][idx];
    if (!pose) return '';
    const body = pose.zoom ? `<g transform="translate(50 97) scale(${pose.zoom}) translate(-50 -93)">${draw(pose)}</g>` : draw(pose);
    return `<svg viewBox="0 0 100 100" role="img" aria-label="${label || ''}">${body}</svg>`;
  }

  // 시작·끝 자세 2장을 나란히
  function pair(id) {
    if (!POSES[id]) return '<div class="empty small">그림 준비 중</div>';
    const name = (typeof EX !== 'undefined' && EX[id]) ? EX[id].name : id;
    const caps = CAPS[id] || ['시작 자세', '끝 자세'];
    return `<div class="figs">
      <div class="fig">${svg(id, 0, name + ' ' + caps[0])}<div class="cap">${caps[0]}</div></div>
      <div class="fig">${svg(id, 1, name + ' ' + caps[1])}<div class="cap">${caps[1]}</div></div>
    </div>`;
  }

  return { svg, pair, has: id => !!POSES[id] };
})();
