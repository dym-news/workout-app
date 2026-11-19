/* =========================================================
   운동 사전 (설계서 6장) — 근력 31개 + 유산소 5개
   - equip: barbell 바벨 / dumbbell 덤벨 / machine 머신 / cable 케이블 / bodyweight 맨손
   - big: 큰 근육을 여러 관절로 쓰는 운동이면 true (먼저 하고, 상급 목표 횟수 6~10회)
   - lower: 하체 운동이면 true (바벨 중량 증가 +5kg)
   - start: '기준 중량 찾기' 시작 무게(kg). 0이면 맨손으로 시작
   - mk: 칼로리 계산 종류 (sqdl 스쿼트·데드리프트 / weights 일반 근력 / bw 맨손 근력 / core 복부 / cal 맨손체조)
     실제 MET 값은 js/logic.js 의 MET 계산(2024 Compendium + ACSM 공식)에서 정합니다.
   ========================================================= */

const EXERCISES = [
  // ---------------- 가슴 ----------------
  { id: 'bench', name: '벤치프레스', group: 'chest', part: '가슴', equip: 'barbell', big: true, start: 20,
    tips: ['어깨뼈를 뒤로 모으고 가슴을 살짝 들어 올립니다.', '봉은 가슴 중간(유두 선)까지 천천히 내립니다.', '발바닥 전체로 바닥을 단단히 밀어 몸을 고정합니다.'],
    cautions: ['엉덩이가 벤치에서 뜨지 않게 합니다.', '봉을 가슴에 튕기듯 내리치지 않습니다.'],
    alts: ['incline_db', 'chest_press', 'pushup'], mk: 'weights' },
  { id: 'incline_db', name: '인클라인 덤벨 프레스', group: 'chest', part: '가슴 윗부분', equip: 'dumbbell', big: true, start: 4,
    tips: ['벤치 등받이를 30~45도로 세웁니다.', '덤벨은 가슴 위쪽 옆으로 내렸다가 위로 모으며 밉니다.', '팔꿈치는 몸통과 45~60도 정도로 둡니다.'],
    cautions: ['팔꿈치를 어깨 높이까지 활짝 벌리지 않습니다.', '덤벨끼리 세게 부딪치지 않습니다.'],
    alts: ['bench', 'chest_press', 'pushup'], mk: 'weights' },
  { id: 'chest_press', name: '체스트 프레스', group: 'chest', part: '가슴', equip: 'machine', big: true, start: 5,
    tips: ['손잡이가 가슴 중간 높이에 오도록 의자를 맞춥니다.', '등을 등받이에 붙인 채 앞으로 밉니다.', '돌아올 때 무게를 버티며 천천히 돌아옵니다.'],
    cautions: ['팔꿈치를 끝까지 세게 펴서 잠그지 않습니다.', '어깨가 앞으로 말리지 않게 합니다.'],
    alts: ['bench', 'incline_db', 'pushup'], mk: 'weights' },
  { id: 'pec_deck', name: '펙덱 플라이', group: 'chest', part: '가슴 안쪽', equip: 'machine', big: false, start: 5,
    tips: ['팔꿈치를 살짝 굽힌 채 고정합니다.', '가슴을 쥐어짜듯 양팔을 앞으로 모읍니다.', '벌릴 때는 가슴이 늘어나는 느낌까지만 천천히 엽니다.'],
    cautions: ['팔을 너무 뒤로 젖혀 어깨에 무리를 주지 않습니다.', '반동으로 휘두르지 않습니다.'],
    alts: ['chest_press', 'incline_db', 'pushup'], mk: 'weights' },
  { id: 'pushup', name: '푸시업', group: 'chest', part: '가슴·삼두', equip: 'bodyweight', big: true, start: 0,
    tips: ['손은 어깨너비보다 조금 넓게 짚습니다.', '머리부터 발끝까지 일직선을 유지합니다.', '가슴이 바닥 가까이 갈 때까지 내려갑니다.'],
    cautions: ['허리가 아래로 처지지 않게 합니다.', '힘들면 무릎을 대고 해도 됩니다.'],
    alts: ['chest_press', 'bench', 'incline_db'], mk: 'bw' },

  // ---------------- 어깨 ----------------
  { id: 'db_shoulder', name: '덤벨 숄더 프레스', group: 'shoulder', part: '어깨 앞·옆', equip: 'dumbbell', big: true, start: 2,
    tips: ['등받이를 세운 벤치에 앉아 등을 붙입니다.', '덤벨을 귀 옆 높이에서 머리 위로 밀어 올립니다.', '복부에 힘을 주어 허리를 고정합니다.'],
    cautions: ['허리를 뒤로 크게 젖히지 않습니다.', '덤벨을 너무 깊이 내려 어깨를 꺾지 않습니다.'],
    alts: ['side_lateral', 'incline_db'], mk: 'weights' },
  { id: 'side_lateral', name: '사이드 레터럴 레이즈', group: 'shoulder', part: '어깨 옆', equip: 'dumbbell', big: false, start: 2,
    tips: ['팔꿈치를 살짝 굽히고 덤벨을 옆으로 들어 올립니다.', '어깨 높이까지만 올립니다.', '내릴 때 2~3초에 걸쳐 천천히 내립니다.'],
    cautions: ['몸을 흔들어 반동으로 올리지 않습니다.', '어깨를 귀 쪽으로 으쓱하지 않습니다.'],
    alts: ['db_shoulder', 'face_pull'], mk: 'weights' },
  { id: 'rear_delt', name: '리어 델트 플라이', group: 'shoulder', part: '어깨 뒤', equip: 'machine', big: false, start: 5,
    tips: ['가슴을 패드에 붙이고 앉습니다.', '팔을 크게 원을 그리듯 뒤로 벌립니다.', '어깨 뒤쪽이 조이는 느낌에 집중합니다.'],
    cautions: ['등 전체를 젖혀 당기지 않습니다.', '무거운 무게로 반동을 쓰지 않습니다.'],
    alts: ['face_pull', 'seated_row'], mk: 'weights' },
  { id: 'face_pull', name: '페이스 풀', group: 'shoulder', part: '어깨 뒤', equip: 'cable', big: false, start: 5,
    tips: ['케이블 높이를 얼굴 높이로 맞추고 로프를 잡습니다.', '로프를 얼굴 쪽으로 당기며 양손을 귀 옆으로 벌립니다.', '팔꿈치를 높게 유지합니다.'],
    cautions: ['허리를 뒤로 젖혀 당기지 않습니다.', '목에 힘을 주지 않습니다.'],
    alts: ['rear_delt', 'seated_row'], mk: 'weights' },

  // ---------------- 등 ----------------
  { id: 'lat_pulldown', name: '랫풀다운', group: 'back', part: '등', equip: 'machine', big: true, start: 5,
    tips: ['허벅지 패드로 다리를 고정합니다.', '봉을 쇄골 쪽으로 당기며 가슴을 내밉니다.', '팔보다 팔꿈치를 아래로 끌어내린다는 느낌으로 당깁니다.'],
    cautions: ['봉을 목 뒤로 당기지 않습니다.', '몸을 크게 뒤로 눕혀 당기지 않습니다.'],
    alts: ['assist_pullup', 'seated_row', 'one_arm_row'], mk: 'weights' },
  { id: 'seated_row', name: '시티드 케이블 로우', group: 'back', part: '등 가운데', equip: 'cable', big: true, start: 5,
    tips: ['무릎을 살짝 굽히고 허리를 곧게 세웁니다.', '손잡이를 배꼽 쪽으로 당기며 어깨뼈를 모읍니다.', '돌아갈 때 등이 늘어나는 느낌으로 천천히 보냅니다.'],
    cautions: ['상체를 앞뒤로 크게 흔들지 않습니다.', '허리를 둥글게 말지 않습니다.'],
    alts: ['barbell_row', 'one_arm_row', 'lat_pulldown'], mk: 'weights' },
  { id: 'barbell_row', name: '바벨 로우', group: 'back', part: '등', equip: 'barbell', big: true, start: 20,
    tips: ['무릎을 살짝 굽히고 엉덩이를 뒤로 빼 상체를 45도쯤 숙입니다.', '봉을 배꼽 쪽으로 당겨 올립니다.', '허리는 처음부터 끝까지 곧게 유지합니다.'],
    cautions: ['허리를 둥글게 말지 않습니다.', '상체를 들어 올리며 반동으로 당기지 않습니다.'],
    alts: ['seated_row', 'one_arm_row'], mk: 'weights' },
  { id: 'one_arm_row', name: '원암 덤벨 로우', group: 'back', part: '등', equip: 'dumbbell', big: true, start: 4,
    tips: ['한쪽 무릎과 손을 벤치에 올려 몸을 지탱합니다.', '덤벨을 골반 쪽으로 끌어올립니다.', '등은 바닥과 평행하게 곧게 유지합니다.'],
    cautions: ['몸통을 비틀어 올리지 않습니다.', '어깨를 으쓱하며 당기지 않습니다.'],
    alts: ['barbell_row', 'seated_row'], mk: 'weights' },
  { id: 'assist_pullup', name: '어시스트 풀업', group: 'back', part: '등·이두', equip: 'machine', big: true, start: 40, assist: true,
    tips: ['보조 무게가 클수록 쉬워집니다. 처음엔 넉넉하게 설정합니다.', '턱이 봉 높이에 올 때까지 몸을 끌어올립니다.', '내려갈 때 팔이 거의 펴질 때까지 천천히 내려옵니다.'],
    cautions: ['다리 반동으로 올라가지 않습니다.', '맨 아래에서 어깨 힘을 완전히 풀어 매달리지 않습니다.'],
    alts: ['lat_pulldown', 'seated_row'], mk: 'weights' },

  // ---------------- 팔 앞(이두) ----------------
  { id: 'barbell_curl', name: '바벨 컬', group: 'biceps', part: '팔 앞쪽(이두)', equip: 'barbell', big: false, start: 10,
    tips: ['팔꿈치를 옆구리에 붙이고 고정합니다.', '봉을 어깨 쪽으로 감아 올립니다.', '내릴 때 2~3초에 걸쳐 천천히 내립니다.'],
    cautions: ['허리를 젖혀 반동으로 올리지 않습니다.', '팔꿈치가 앞으로 많이 나가지 않게 합니다.'],
    alts: ['hammer_curl', 'assist_pullup'], mk: 'weights' },
  { id: 'hammer_curl', name: '해머 컬', group: 'biceps', part: '팔 앞쪽(이두)', equip: 'dumbbell', big: false, start: 2,
    tips: ['손바닥이 서로 마주 보게 덤벨을 잡습니다.', '팔꿈치를 고정한 채 덤벨을 들어 올립니다.', '양팔을 번갈아 또는 동시에 합니다.'],
    cautions: ['몸을 흔들지 않습니다.', '손목을 꺾지 않습니다.'],
    alts: ['barbell_curl', 'assist_pullup'], mk: 'weights' },

  // ---------------- 팔 뒤(삼두) ----------------
  { id: 'pushdown', name: '케이블 푸시다운', group: 'triceps', part: '팔 뒤쪽(삼두)', equip: 'cable', big: false, start: 5,
    tips: ['팔꿈치를 옆구리에 붙이고 고정합니다.', '손잡이를 아래로 밀어 팔을 끝까지 폅니다.', '올라올 때 팔꿈치가 뜨지 않게 천천히 올립니다.'],
    cautions: ['상체를 숙여 체중으로 누르지 않습니다.', '팔꿈치가 앞뒤로 움직이지 않게 합니다.'],
    alts: ['overhead_ext', 'pushup'], mk: 'weights' },
  { id: 'overhead_ext', name: '오버헤드 트라이셉스 익스텐션', group: 'triceps', part: '팔 뒤쪽(삼두)', equip: 'dumbbell', big: false, start: 2,
    tips: ['덤벨 한 개를 양손으로 잡고 머리 위로 듭니다.', '팔꿈치를 고정한 채 머리 뒤로 내렸다가 폅니다.', '복부에 힘을 주어 허리를 고정합니다.'],
    cautions: ['팔꿈치를 바깥으로 크게 벌리지 않습니다.', '허리를 젖히지 않습니다.'],
    alts: ['pushdown', 'pushup'], mk: 'weights' },

  // ---------------- 허벅지 앞 ----------------
  { id: 'squat', name: '바벨 스쿼트', group: 'quads', part: '허벅지 앞·엉덩이', equip: 'barbell', big: true, lower: true, start: 20,
    tips: ['봉을 어깨 위 승모근에 얹고 발은 어깨너비로 섭니다.', '엉덩이를 뒤로 빼며 허벅지가 바닥과 평행할 때까지 앉습니다.', '무릎은 발끝 방향으로 향하게 합니다.'],
    cautions: ['무릎이 안쪽으로 모이지 않게 합니다.', '허리를 둥글게 말지 않습니다.'],
    alts: ['leg_press', 'bulgarian', 'lunge'], mk: 'sqdl' },
  { id: 'leg_press', name: '레그프레스', group: 'quads', part: '허벅지 앞·엉덩이', equip: 'machine', big: true, lower: true, start: 10,
    tips: ['발판에 발을 어깨너비로 올립니다.', '무릎이 90도쯤 굽을 때까지 내립니다.', '발뒤꿈치로 밀어 올립니다.'],
    cautions: ['무릎을 끝까지 펴서 잠그지 않습니다.', '엉덩이가 의자에서 뜰 만큼 깊이 내리지 않습니다.'],
    alts: ['squat', 'lunge', 'leg_ext'], mk: 'weights' },
  { id: 'leg_ext', name: '레그 익스텐션', group: 'quads', part: '허벅지 앞', equip: 'machine', big: false, lower: true, start: 5,
    tips: ['무릎 관절이 기계 회전축과 맞도록 앉습니다.', '다리를 끝까지 펴며 허벅지 앞을 조입니다.', '내릴 때 천천히 버티며 내립니다.'],
    cautions: ['반동으로 차올리지 않습니다.', '엉덩이가 들리지 않게 손잡이를 잡습니다.'],
    alts: ['leg_press', 'lunge'], mk: 'weights' },
  { id: 'lunge', name: '런지', group: 'quads', part: '허벅지 앞·엉덩이', equip: 'dumbbell', big: true, lower: true, start: 0,
    tips: ['한 발을 크게 앞으로 내딛습니다.', '뒷무릎이 바닥에 닿기 직전까지 내려갑니다.', '앞발 뒤꿈치로 밀며 일어섭니다. 처음에는 맨손으로 합니다.'],
    cautions: ['앞무릎이 안쪽으로 꺾이지 않게 합니다.', '상체가 앞으로 쏠리지 않게 합니다.'],
    alts: ['bulgarian', 'leg_press'], mk: 'bw' },

  // ---------------- 허벅지 뒤·엉덩이 ----------------
  { id: 'rdl', name: '루마니안 데드리프트', group: 'hams', part: '허벅지 뒤·엉덩이', equip: 'barbell', big: true, lower: true, start: 20,
    tips: ['무릎을 살짝 굽힌 채 고정합니다.', '엉덩이를 뒤로 빼며 봉을 허벅지를 따라 내립니다.', '허벅지 뒤가 당길 때까지만 내리고 엉덩이를 앞으로 밀며 섭니다.'],
    cautions: ['허리를 둥글게 말지 않습니다.', '봉이 몸에서 멀어지지 않게 합니다.'],
    alts: ['leg_curl', 'hip_thrust'], mk: 'sqdl' },
  { id: 'leg_curl', name: '레그 컬', group: 'hams', part: '허벅지 뒤', equip: 'machine', big: false, lower: true, start: 5,
    tips: ['패드가 발목 바로 위에 오게 맞춥니다.', '뒤꿈치를 엉덩이 쪽으로 끌어당깁니다.', '내릴 때 천천히 버팁니다.'],
    cautions: ['엉덩이가 들리지 않게 합니다.', '반동으로 차올리지 않습니다.'],
    alts: ['rdl', 'hip_thrust'], mk: 'weights' },
  { id: 'hip_thrust', name: '힙 쓰러스트', group: 'hams', part: '엉덩이', equip: 'barbell', big: true, lower: true, start: 20,
    tips: ['등 윗부분을 벤치에 기대고 봉을 골반 위에 올립니다(패드 사용).', '발뒤꿈치로 밀며 엉덩이를 들어 몸이 일직선이 되게 합니다.', '맨 위에서 엉덩이를 1초 조입니다.'],
    cautions: ['허리를 과하게 젖혀 올리지 않습니다.', '턱을 들지 말고 시선은 앞을 봅니다.'],
    alts: ['rdl', 'bulgarian'], mk: 'weights' },
  { id: 'bulgarian', name: '불가리안 스플릿 스쿼트', group: 'hams', part: '엉덩이·허벅지', equip: 'dumbbell', big: true, lower: true, start: 0,
    tips: ['뒷발등을 벤치에 올리고 앞발은 크게 앞에 둡니다.', '수직으로 앉듯 내려갑니다.', '앞발 뒤꿈치로 밀며 올라옵니다. 처음에는 맨손으로 합니다.'],
    cautions: ['앞무릎이 안쪽으로 꺾이지 않게 합니다.', '균형이 어려우면 기둥을 잡고 합니다.'],
    alts: ['lunge', 'hip_thrust', 'leg_press'], mk: 'bw' },

  // ---------------- 종아리 ----------------
  { id: 'standing_calf', name: '스탠딩 카프 레이즈', group: 'calves', part: '종아리', equip: 'machine', big: false, lower: true, start: 10,
    tips: ['발 앞쪽만 발판에 올리고 섭니다.', '발뒤꿈치를 최대한 높이 들어 올립니다.', '내릴 때 종아리가 늘어나도록 깊게 내립니다.'],
    cautions: ['무릎을 굽혔다 폈다 하며 반동을 쓰지 않습니다.', '너무 빠르게 튕기지 않습니다.'],
    alts: ['seated_calf'], mk: 'weights' },
  { id: 'seated_calf', name: '시티드 카프 레이즈', group: 'calves', part: '종아리', equip: 'machine', big: false, lower: true, start: 5,
    tips: ['패드를 무릎 바로 위 허벅지에 맞춥니다.', '발뒤꿈치를 최대한 들어 올립니다.', '맨 위에서 1초 멈춥니다.'],
    cautions: ['반동으로 튕기지 않습니다.', '발목이 바깥으로 꺾이지 않게 합니다.'],
    alts: ['standing_calf'], mk: 'weights' },

  // ---------------- 복부(코어) ----------------
  { id: 'plank', name: '플랭크', group: 'core', part: '복부(코어)', equip: 'bodyweight', big: false, start: 0, unit: '초',
    tips: ['팔꿈치를 어깨 바로 아래에 둡니다.', '머리부터 발끝까지 일직선을 유지합니다.', '배꼽을 등 쪽으로 당기듯 복부에 힘을 줍니다.'],
    cautions: ['엉덩이가 처지거나 너무 올라가지 않게 합니다.', '숨을 참지 말고 고르게 쉽니다.'],
    alts: ['crunch', 'hanging_leg'], mk: 'core' },
  { id: 'crunch', name: '크런치', group: 'core', part: '복부(코어)', equip: 'bodyweight', big: false, start: 0,
    tips: ['무릎을 세우고 누워 손을 가슴이나 귀 옆에 둡니다.', '어깨뼈가 바닥에서 뜰 만큼만 상체를 말아 올립니다.', '내쉬며 올라가고 들이쉬며 내려옵니다.'],
    cautions: ['손으로 목을 당기지 않습니다.', '허리까지 들어 올리지 않습니다.'],
    alts: ['plank', 'hanging_leg'], mk: 'core' },
  { id: 'hanging_leg', name: '행잉 레그 레이즈', group: 'core', part: '복부(코어)', equip: 'bodyweight', big: false, start: 0,
    tips: ['봉에 매달려 어깨에 힘을 줍니다.', '다리를 모아 골반을 말아 올리듯 들어 올립니다.', '힘들면 무릎을 굽혀서 합니다.'],
    cautions: ['몸을 앞뒤로 흔들어 반동을 쓰지 않습니다.', '내릴 때 툭 떨어뜨리지 않습니다.'],
    alts: ['crunch', 'plank'], mk: 'cal' },

  // ---------------- 유산소 ----------------
  // ctl: 조절 방식(speed 속도·경사, level 단계) / watts: 기계 화면의 와트(W)를 입력하면 칼로리가 더 정확해짐
  { id: 'treadmill', name: '트레드밀', group: 'cardio', part: '유산소', equip: 'machine', cardio: true, ctl: 'speed',
    defaults: { low: { speed: 5.5, incline: 10 }, mid: { speed: 8.0, incline: 1 } },
    tips: ['손잡이를 잡지 않고 걷는 것이 좋습니다.', '상체를 곧게 세우고 발뒤꿈치부터 딛습니다.', '경사를 올릴 때는 속도를 조금 낮춥니다.'],
    cautions: ['손잡이에 몸을 기대 경사를 무의미하게 만들지 않습니다.', '멈출 때는 속도를 먼저 줄인 뒤 내립니다.'],
    alts: ['bike', 'elliptical', 'stair'] },
  { id: 'bike', name: '실내 자전거', group: 'cardio', part: '유산소', equip: 'machine', cardio: true, ctl: 'level',
    defaults: { low: { level: 4 }, mid: { level: 7 }, high: { level: 10, easyLevel: 3 } },
    tips: ['안장 높이는 페달이 가장 아래일 때 무릎이 살짝 굽는 정도로 맞춥니다.', '분당 회전수 70~90회를 유지합니다.', '상체 힘을 빼고 다리로 밟습니다.'],
    cautions: ['안장이 너무 낮으면 무릎에 무리가 갑니다.', '엉덩이를 좌우로 흔들지 않습니다.'],
    alts: ['elliptical', 'rower', 'treadmill'] },
  { id: 'elliptical', name: '일립티컬', group: 'cardio', part: '유산소', equip: 'machine', cardio: true, ctl: 'level',
    defaults: { low: { level: 4 }, mid: { level: 7 } },
    tips: ['발판에 발 전체를 붙이고 밟습니다.', '팔과 다리를 함께 움직입니다.', '허리를 곧게 세웁니다.'],
    cautions: ['손잡이에 체중을 싣지 않습니다.', '발뒤꿈치가 계속 뜨지 않게 합니다.'],
    alts: ['bike', 'treadmill', 'stair'] },
  { id: 'rower', name: '로잉머신', group: 'cardio', part: '유산소', equip: 'machine', cardio: true, ctl: 'level',
    defaults: { low: { level: 4 }, mid: { level: 5 }, high: { level: 6, easyLevel: 3 } },
    tips: ['다리로 먼저 밀고 → 상체 → 팔 순서로 당깁니다.', '돌아갈 때는 팔 → 상체 → 다리 순서입니다.', '손잡이는 명치 높이로 당깁니다.'],
    cautions: ['허리를 둥글게 말지 않습니다.', '팔로만 당기지 않습니다.'],
    alts: ['bike', 'elliptical'] },
  { id: 'stair', name: '계단 오르기 머신', group: 'cardio', part: '유산소', equip: 'machine', cardio: true, ctl: 'level',
    defaults: { low: { level: 3 }, mid: { level: 6 } },
    tips: ['발 전체로 계단을 딛습니다.', '상체를 곧게 세우고 손잡이는 가볍게 잡습니다.', '처음에는 느린 속도로 시작합니다.'],
    cautions: ['손잡이에 매달리듯 기대지 않습니다.', '발끝으로만 딛지 않습니다.'],
    alts: ['treadmill', 'elliptical'] },
];

const EX = Object.fromEntries(EXERCISES.map(e => [e.id, e]));

const EQUIP_NAME = { barbell: '바벨', dumbbell: '덤벨', machine: '머신', cable: '케이블', bodyweight: '맨손' };

function youtubeLink(ex) {
  return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(ex.name + ' 자세');
}
