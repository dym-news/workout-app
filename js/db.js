/* 휴대폰 안 저장소(IndexedDB) — 설계서 7장의 6개 칸 */
const DB = (() => {
  const NAME = 'workout-app';
  const VERSION = 2; // 2: 인바디 기록 칸 추가
  // 칸 이름: 내 정보, 내 루틴, 근력 기록, 유산소 기록, 체중 기록, 다음 추천값, 인바디
  const STORES = {
    profile: { keyPath: 'key' },
    routine: { keyPath: 'key' },
    strength: { keyPath: 'id', autoIncrement: true },
    cardio: { keyPath: 'id', autoIncrement: true },
    weight: { keyPath: 'date' },
    next: { keyPath: 'key' },
    body: { keyPath: 'date' },   // 인바디 기록
  };
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const [name, opt] of Object.entries(STORES)) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, opt);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }

  function tx(store, mode, fn) {
    return open().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      let result;
      const r = fn(s);
      if (r && 'onsuccess' in r) r.onsuccess = () => { result = r.result; };
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    }));
  }

  return {
    STORE_NAMES: Object.keys(STORES),
    get: (store, key) => tx(store, 'readonly', s => s.get(key)),
    all: (store) => tx(store, 'readonly', s => s.getAll()),
    put: (store, value) => tx(store, 'readwrite', s => s.put(value)),
    del: (store, key) => tx(store, 'readwrite', s => s.delete(key)),
    clear: (store) => tx(store, 'readwrite', s => s.clear()),
    // 백업: 6개 칸을 하나로 묶기
    async exportAll() {
      const out = { app: 'workout-app', version: 1, exportedAt: new Date().toISOString(), data: {} };
      for (const name of Object.keys(STORES)) out.data[name] = await this.all(name);
      return out;
    },
    // 불러오기: 기존 내용을 지우고 파일 내용으로 바꾸기
    async importAll(obj) {
      if (!obj || obj.app !== 'workout-app' || !obj.data) throw new Error('이 앱의 백업 파일이 아닙니다.');
      for (const name of Object.keys(STORES)) {
        await this.clear(name);
        for (const row of (obj.data[name] || [])) await this.put(name, row);
      }
    },
    async clearAll() {
      for (const name of Object.keys(STORES)) await this.clear(name);
    },
  };
})();
