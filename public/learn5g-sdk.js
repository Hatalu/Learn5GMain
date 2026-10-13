/*!
 * Learn5G Game SDK v1
 * ใส่ไฟล์นี้ในเกมเพื่อรายงานผลการเล่นกลับไปที่ "สื่อการสอน 5G"
 * (ดาว/ตรา/ภารกิจ/รายงานผู้ปกครองและครู)
 *
 * เมื่อเกมถูกเปิดจากหน้า /play ของเว็บหลัก URL จะมี  #l5g=<token>&api=<origin>&name=<ชื่อ>
 * ถ้าเกมถูกเปิดตรงๆ (ไม่มีโทเคน) ทุกฟังก์ชันจะเงียบและเกมเล่นได้ตามปกติ
 *
 * ตัวอย่าง:
 *   <script src="https://<เว็บหลัก>/learn5g-sdk.js"></script>
 *   Learn5G.reportResult({ levelKey: 'level-3', correct: 8, total: 10, mistakes: ['ครึ่งชั่วโมง'] });
 */
(function (global) {
  'use strict';

  var KEY = 'l5g_ctx';
  var ctx = null;

  function readHash() {
    try {
      var h = (global.location.hash || '').replace(/^#/, '');
      if (!h) return null;
      var p = new URLSearchParams(h);
      var token = p.get('l5g');
      var api = p.get('api');
      if (!token || !api) return null;
      return { token: token, api: api.replace(/\/$/, ''), name: p.get('name') || '' };
    } catch (e) {
      return null;
    }
  }

  function load() {
    var fromHash = readHash();
    if (fromHash) {
      ctx = fromHash;
      try {
        global.sessionStorage.setItem(KEY, JSON.stringify(ctx));
        // ซ่อนโทเคนออกจากแถบที่อยู่ (กันการคัดลอกลิงก์ไปแชร์)
        global.history.replaceState(null, '', global.location.pathname + global.location.search);
      } catch (e) {}
      return;
    }
    try {
      var saved = global.sessionStorage.getItem(KEY);
      if (saved) ctx = JSON.parse(saved);
    } catch (e) {}
  }
  load();

  function clamp(n, min, max) {
    n = Math.round(Number(n));
    if (!isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  var Learn5G = {
    /** true เมื่อเกมถูกเปิดจากเว็บหลักด้วยบัญชีนักเรียน (ผลจะถูกบันทึก) */
    get active() {
      return !!ctx;
    },
    /** ชื่อเล่นนักเรียน (เอาไปทักทายในเกมได้) */
    get studentName() {
      return ctx ? ctx.name : '';
    },

    /**
     * รายงานผลหนึ่งรอบ/หนึ่งด่าน
     * @param {Object} r
     * @param {string} [r.levelKey]   ชื่อด่าน เช่น 'level-3'
     * @param {number} r.correct      จำนวนข้อที่ถูก
     * @param {number} r.total        จำนวนข้อทั้งหมด
     * @param {number} [r.score]      คะแนนในเกม (0-100000)
     * @param {number} [r.stars]      ดาว 0-3 (เซิร์ฟเวอร์จะไม่ยอมให้เกินความแม่นยำจริง)
     * @param {number} [r.durationSec] เวลาที่ใช้ (วินาที)
     * @param {string[]} [r.mistakes] แท็กหัวข้อที่ตอบผิด เช่น ['ครึ่งชั่วโมง','บวกทด']
     * @returns {Promise<Object|null>} ผลรางวัลจากเซิร์ฟเวอร์ (หรือ null ถ้าไม่ได้บันทึก)
     */
    reportResult: function (r) {
      if (!ctx) return Promise.resolve(null);
      r = r || {};
      var body = {
        token: ctx.token,
        levelKey: String(r.levelKey || 'main').slice(0, 60),
        score: clamp(r.score || 0, 0, 100000),
        correct: clamp(r.correct || 0, 0, 1000),
        total: clamp(r.total || 0, 0, 1000),
        durationSec: clamp(r.durationSec || 0, 0, 7200),
        mistakes: (r.mistakes || []).slice(0, 20).map(function (m) {
          return String(m).slice(0, 60);
        }),
      };
      if (r.stars !== undefined) body.stars = clamp(r.stars, 0, 3);

      return fetch(ctx.api + '/api/play/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
      })
        .then(function (res) {
          return res.ok ? res.json() : null;
        })
        .then(function (out) {
          if (out && global.parent && global.parent !== global) {
            // ให้หน้าเว็บหลักฉลองผล (ดาว/ตราใหม่/ตัวละครโต)
            global.parent.postMessage({ type: 'l5g:result', result: out }, '*');
          }
          return out;
        })
        .catch(function () {
          return null; // เครือข่ายล้มเหลว ไม่ให้กระทบการเล่น
        });
    },
  };

  global.Learn5G = Learn5G;
})(window);
