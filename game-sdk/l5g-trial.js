/*!
 * Learn5G Trial v1 : ตัวตรวจ "โทเคนทดลองเล่น" สำหรับเกมใน สื่อการสอน 5G
 *
 * เว็บหลักกดปุ่ม "ทดลองเล่น" แล้วเปิดเกมในหน้าต่างทดลองด้วยลิงก์ที่มี  #l5gtrial=<โทเคน>
 * โทเคนเซ็นลายเซ็น ECDSA P-256 โดยเซิร์ฟเวอร์เว็บหลัก มีเวลาหมดอายุในตัว
 * ไฟล์นี้ตรวจลายเซ็นด้วยกุญแจสาธารณะ (ด้านล่าง) ผ่าน WebCrypto ในเบราว์เซอร์ ไม่ต้องเรียกเซิร์ฟเวอร์
 *   - ถูกต้อง + ยังไม่หมดอายุ : เกมข้ามหน้าล็อกอินและเล่นได้เต็มรูปแบบจนโทเคนหมดอายุ
 *   - หมดอายุ/ปลอม/ไม่มี     : ทำงานเหมือนเดิม (ต้องล็อกอินสมาชิก)
 *
 * การใช้ในเกม (ใส่ก่อน auth.js):  <script src="js/l5g-trial.js"></script>
 * แล้วในโค้ดตรวจล็อกอินของเกมก่อนแสดงหน้าล็อกอิน:
 *     const t = window.L5GTrial ? await window.L5GTrial.check() : null;
 *     if (t) { ...ปลดล็อกเกม...; window.L5GTrial.begin(t); return; }
 *
 * หมายเหตุ: เกมทำงานฝั่งเบราว์เซอร์ จึงกันคนที่ตั้งใจแกะโค้ดไม่ได้ 100% (เหมือนหน้าล็อกอินเดิม)
 * แต่ปลอมโทเคนไม่ได้ และโทเคนใช้ได้จำกัดเวลา
 */
(function (global) {
  'use strict';

  // กุญแจสาธารณะของเว็บหลัก (สร้างด้วย: npx tsx scripts/trial-pubkey.ts ในโปรเจกต์ Main)
  var PUBLIC_JWK = { kty: 'EC', crv: 'P-256', x: 'BZelWJpXJF8JAV_4wwryI9fYgNyhArCo_x10qUHdX9o', y: 'iXUok1o5Uv1oVNkQ_DGg3J5qQ8ISZI6kI3MelfXpIpY' };
  var SS_KEY = 'l5g_trial_token';
  var checked = null;
  var current = null;

  function b64uToBytes(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function readToken() {
    var tok = null;
    try {
      var h = (global.location.hash || '').replace(/^#/, '');
      if (h) {
        var p = new URLSearchParams(h);
        tok = p.get('l5gtrial');
        if (tok) {
          try { global.sessionStorage.setItem(SS_KEY, tok); } catch (e) {}
          if (p.get('u') && p.get('p')) {
            try { global.sessionStorage.setItem(SS_KEY + '_cred', JSON.stringify({ u: p.get('u'), p: p.get('p'), su: p.get('su'), k: p.get('k') })); } catch (e) {}
          }
          // ซ่อนโทเคนออกจากแถบที่อยู่
          try { global.history.replaceState(null, '', global.location.pathname + global.location.search); } catch (e) {}
        }
      }
      if (!tok) tok = global.sessionStorage.getItem(SS_KEY);
    } catch (e) {}
    return tok;
  }

  async function verify(tok) {
    try {
      if (!tok || !global.crypto || !global.crypto.subtle) return null;
      var parts = tok.split('.');
      if (parts.length !== 2) return null;
      var key = await global.crypto.subtle.importKey('jwk', PUBLIC_JWK, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      var ok = await global.crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        key,
        b64uToBytes(parts[1]),
        new TextEncoder().encode(parts[0])
      );
      if (!ok) return null;
      var payload = JSON.parse(new TextDecoder().decode(b64uToBytes(parts[0])));
      if (payload.v !== 1 || typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) return null;
      var cred = null;
      try { cred = JSON.parse(global.sessionStorage.getItem(SS_KEY + '_cred') || 'null'); } catch (e) {}
      return { exp: payload.exp, cred: cred };
    } catch (e) {
      return null;
    }
  }

  function check() {
    if (!checked) {
      checked = verify(readToken()).then(function (r) {
        if (!r) { try { global.sessionStorage.removeItem(SS_KEY); } catch (e) {} }
        current = r;
        return r;
      });
    }
    return checked;
  }

  function tell(msg) {
    try { if (global.parent && global.parent !== global) global.parent.postMessage(msg, '*'); } catch (e) {}
  }

  function el(tag, css, text) {
    var n = document.createElement(tag);
    if (css) n.style.cssText = css;
    if (text) n.textContent = text;
    return n;
  }

  /** เริ่มโหมดทดลอง: ซ่อนป้ายผู้ใช้/ปุ่มออกจากระบบ + แสดงป้ายเวลา + ล็อกเกมเมื่อหมดเวลา */
  function begin(info) {
    // ทดลองเล่นจริง 120 วินาทีนับจากเริ่มเกม (โทเคนเผื่อเวลาโหลดไว้อีกเล็กน้อย)
    var exp = Math.min(info.exp * 1000, Date.now() + 120000);
    document.documentElement.classList.add('l5g-trial');
    ['userBadge', 'user-auth-badge', 'user-auth-badge-hud', 'auth-gate-modal'].forEach(function (id) {
      var n = document.getElementById(id);
      if (n && id !== 'auth-gate-modal') n.style.display = 'none';
    });

    var pill = el(
      'div',
      'position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:2147483000;pointer-events:none;' +
        'padding:6px 14px;white-space:nowrap;max-width:92vw;border-radius:999px;background:rgba(20,16,50,.78);color:#fff;font:600 13px/1.2 system-ui,sans-serif;' +
        'box-shadow:0 4px 14px rgba(0,0,0,.35);backdrop-filter:blur(6px)'
    );
    document.body.appendChild(pill);

    function fmt(ms) {
      var s = Math.max(0, Math.ceil(ms / 1000));
      return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }
    function tick() {
      var left = exp - Date.now();
      if (left <= 0) { lock(); return; }
      pill.textContent = 'โหมดทดลองเล่น  เหลือ ' + fmt(left);
      pill.style.background = left < 15000 ? 'rgba(190,30,60,.88)' : 'rgba(20,16,50,.78)';
      setTimeout(tick, 500);
    }

    function lock() {
      try { global.sessionStorage.removeItem(SS_KEY); } catch (e) {}
      var wrap = el(
        'div',
        'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;' +
          'background:rgba(15,10,40,.86);backdrop-filter:blur(8px);font-family:system-ui,sans-serif;color:#fff;text-align:center'
      );
      var box = el('div', 'max-width:360px');
      box.appendChild(el('div', 'font-size:22px;font-weight:700;margin-bottom:8px', 'หมดเวลาทดลองเล่นแล้ว'));
      box.appendChild(el('div', 'opacity:.85;margin-bottom:18px;line-height:1.5', 'สมัครสมาชิกเพื่อเล่นต่อได้ไม่จำกัด ติดต่อเพจ สื่อการสอน 5G'));
      var btn = el('button', 'padding:11px 22px;border:0;border-radius:14px;background:#7140f0;color:#fff;font:700 15px system-ui,sans-serif;cursor:pointer', 'เข้าสู่ระบบสมาชิก');
      btn.onclick = function () { global.location.reload(); };
      box.appendChild(btn);
      wrap.appendChild(box);
      document.body.appendChild(wrap);
      tell({ type: 'l5g:trial-ended' });
    }

    // ล็อกอินด้วยบัญชีทดลองที่ระบบสร้างให้ (ผู้เล่นไม่ต้องใส่เอง)
    if (info.cred && info.cred.su && info.cred.k) {
      try {
        fetch(info.cred.su + '/auth/v1/token?grant_type=password', {
          method: 'POST',
          headers: { apikey: info.cred.k, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: info.cred.u.toLowerCase() + '@internal.mediahub.local', password: info.cred.p })
        }).catch(function () {});
      } catch (e) {}
    }
    tick();
    tell({ type: 'l5g:trial-ready', exp: info.exp });
  }

  global.L5GTrial = {
    check: check,
    begin: begin,
    active: function () { return !!current; },
  };
})(window);
