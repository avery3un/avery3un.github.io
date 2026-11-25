/* ==========================================================
   About 页：工作证 + 藏在后面的拍立得
   - 悬停：拍立得从工作证后面滑出一截
   - 点击：完全抽出、放大；再点一次或点空白处，塞回原位
   - 拖动：拖到任意位置
   - tidy up：全部回到初始位置
   ========================================================== */
(function () {
  'use strict';

  /* ---------- 初始摆放（想调整位置/角度改这里）----------
     顺序和 index.html 里的拍立得一致：bts, climb, cook, travel, nature, craft, kid
     side：从工作证的哪一边露出来（top / bottom / left / right）
     at：沿着那条边的位置（左右两边：-0.5 = 工作证顶边，0.5 = 底边；上下两边：-0.5 = 左边，0.5 = 右边）
         超过 ±0.5 就是从角上探出来
     peek：露出工作证外面的比例（0.55 = 露出 55%）
     r：角度（度）
     z：叠放顺序，数字大的压在上面                                     */
  // 电脑：左右各 3 张（上、中、下），小时候那张在正上方偏右；左右平衡但不完全对称
  var LAYOUT_DESKTOP = [
    { side: 'left',  at: -0.47, peek: 0.56, r: -12, z: 1 },   // bts     左上
    { side: 'right', at: -0.52, peek: 0.60, r:  12, z: 1 },   // climb   右上
    { side: 'left',  at:  0.06, peek: 0.70, r:   7, z: 2 },   // cook    左中
    { side: 'right', at:  0.08, peek: 0.80, r:  -6, z: 2 },   // travel  右中
    { side: 'left',  at:  0.60, peek: 0.52, r:  -5, z: 3 },   // nature  左下
    { side: 'right', at:  0.66, peek: 0.56, r:   9, z: 3 },   // craft   右下（避开便签）
    { side: 'top',   at:  0.14, peek: 0.62, r:  -4, z: 4 }    // kid     正上方偏右，从卡片后面探出头
  ];
  // 手机：工作证几乎占满宽度，所以拍立得从上下露出来（上 4 张、下 3 张）
  var LAYOUT_MOBILE = [
    { side: 'top',    at: -0.29, peek: 0.68, r: -10, z: 1 },  // bts
    { side: 'top',    at:  0.29, peek: 0.68, r:  10, z: 2 },  // climb
    { side: 'top',    at: -0.10, peek: 0.62, r:   5, z: 3 },  // cook
    { side: 'bottom', at: -0.29, peek: 0.66, r:   7, z: 1 },  // travel
    { side: 'bottom', at: -0.04, peek: 0.62, r:  -5, z: 2 },  // nature
    { side: 'bottom', at:  0.22, peek: 0.60, r:   4, z: 3 },  // craft
    { side: 'top',    at:  0.10, peek: 0.72, r:  -4, z: 4 }   // kid（上方偏右）
  ];

  var HOVER_OUT = 0.30;      // 悬停时再滑出约 30%

  function rad(d) { return d * Math.PI / 180; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function mount(desk) {
    var pass = desk.querySelector('[data-pass]');
    var tidyBtn = desk.querySelector('[data-tidy]');
    var backdrop = desk.querySelector('[data-backdrop]');
    var els = Array.prototype.slice.call(desk.querySelectorAll('[data-pol]'));
    if (!pass || !els.length) return null;

    var alive = true;
    var G = null;          // 当前尺寸
    var zTop = 30;         // 被拖动过的拍立得放在工作证（20）上面
    var openItem = null;
    var resizeTimer;

    var items = els.map(function (el, i) {
      return { el: el, i: i, base: null, x: 0, y: 0, r: 0, moved: false, z: i + 1 };
    });

    /* ---------- 计算位置 ---------- */
    var note = pass.querySelector('.sticky-note');

    function basePosition(L, g) {
      var x, y;
      var peek = L.peek != null ? L.peek : 0.55;
      if (L.side === 'top' || L.side === 'bottom') {
        x = L.at * g.cw;
        y = (L.side === 'top' ? -1 : 1) * (g.ch / 2 + g.ph * (peek - 0.5));
      } else {
        x = (L.side === 'left' ? -1 : 1) * (g.cw / 2 + g.pw * (peek - 0.5));
        y = L.at * g.ch;
      }
      // 悬停时：沿着“从工作证中心指向这张”的方向再滑出 30%
      var len = Math.hypot(x, y) || 1, ux = x / len, uy = y / len;
      var out = HOVER_OUT * (Math.abs(ux) * g.pw + Math.abs(uy) * g.ph);
      return { x: x, y: y, r: L.r, z: L.z || 1, dx: ux * out, dy: uy * out };
    }

    function measureOnce() {
      var W = desk.clientWidth;
      var mobile = W < 600;
      var cw = pass.offsetWidth, ch = pass.querySelector('.crew-pass').offsetHeight;
      var pw = els[0].offsetWidth, ph = els[0].offsetHeight;
      var g = { W: W, cw: cw, ch: ch, pw: pw, ph: ph, mobile: mobile, layout: mobile ? LAYOUT_MOBILE : LAYOUT_DESKTOP };
      g.bases = items.map(function (it) { return basePosition(g.layout[it.i % g.layout.length], g); });

      // 所有拍立得（加上悬停滑出的距离、便签）往上、往下、往左右各需要多少空间
      var slack = 14;                                  // 旋转后角会多出来一点
      var maxX = cw / 2, up = ch / 2, down = ch / 2;
      g.bases.forEach(function (b) {
        var hx = mobile ? 0 : Math.abs(b.dx), hy = mobile ? 0 : Math.abs(b.dy);
        maxX = Math.max(maxX, Math.abs(b.x) + pw / 2 + hx + slack);
        up = Math.max(up, -b.y + ph / 2 + hy + slack);
        down = Math.max(down, b.y + ph / 2 + hy + slack);
      });
      if (note) down = Math.max(down, -ch / 2 + note.offsetTop + note.offsetHeight + slack);
      g.needW = maxX * 2;
      g.cy = Math.round(up + 40);                      // 工作证中心离照片区顶部多远（上面留 40px 给 tidy up）
      g.H = Math.round(g.cy + down);
      return g;
    }

    function measure() {
      // 先用默认大小量一次；如果屏幕放不下，就把整个照片区按比例缩小
      desk.style.fontSize = '';
      var g = measureOnce();
      if (g.needW > g.W) {
        var base = parseFloat(getComputedStyle(desk).fontSize);
        desk.style.fontSize = (base * g.W / g.needW).toFixed(2) + 'px';
        g = measureOnce();
      }
      desk.style.height = g.H + 'px';
      desk.style.setProperty('--cy', g.cy + 'px');     // 工作证和拍立得都以这里为中心
      pass.style.marginLeft = (-g.cw / 2) + 'px';
      pass.style.marginTop = (-g.ch / 2) + 'px';
      return g;
    }

    function apply(it) {
      var st = it.el.style;
      var open = it === openItem;
      // 点开时放在整个照片区的正中间
      var x = open ? 0 : it.x, y = open ? (G.H / 2 - G.cy) : it.y, r = open ? 0 : it.r;
      st.setProperty('--x', x + 'px');
      st.setProperty('--y', y + 'px');
      st.setProperty('--r', r + 'deg');
      st.setProperty('--s', open ? openScale() : 1);
      st.setProperty('--z', it.z);

      // 悬停时的滑出：把“往外”的方向换算到拍立得自己的旋转坐标里
      var hx = 0, hy = 0, hr = 0;
      if (!it.moved) {
        var a = rad(-it.r);
        hx = it.base.dx * Math.cos(a) - it.base.dy * Math.sin(a);
        hy = it.base.dx * Math.sin(a) + it.base.dy * Math.cos(a);
        hr = -it.r * 0.55;          // 角度变小
      } else {
        hy = -6; hr = -it.r * 0.3;  // 拖出来的：只轻轻浮起
      }
      st.setProperty('--hx', hx.toFixed(1) + 'px');
      st.setProperty('--hy', hy.toFixed(1) + 'px');
      st.setProperty('--hr', hr.toFixed(2) + 'deg');
    }

    function openScale() {
      var target = G.mobile ? Math.min(G.W * 0.72, 260) : 300;
      var byHeight = (G.H - 40) / G.ph;
      return Math.min(target / G.pw, byHeight).toFixed(3);
    }

    function layoutAll() {
      G = measure();
      items.forEach(function (it, i) {
        it.base = G.bases[i];
        if (!it.moved) { it.x = it.base.x; it.y = it.base.y; it.r = it.base.r; it.z = it.base.z; }
        else {
          it.x = clamp(it.x, -G.W / 2 + G.pw * 0.3, G.W / 2 - G.pw * 0.3);
          it.y = clamp(it.y, -G.H / 2 + G.ph * 0.3, G.H / 2 - G.ph * 0.3);
        }
        apply(it);
      });
    }

    /* ---------- 点开 / 收回 ---------- */
    function openIt(it) {
      if (openItem && openItem !== it) closeIt();
      openItem = it;
      it.el.classList.add('is-open');
      desk.classList.add('has-open');
      apply(it);
    }
    function closeIt() {
      if (!openItem) return;
      var it = openItem;
      openItem = null;
      it.el.classList.remove('is-open');
      desk.classList.remove('has-open');
      apply(it);
    }

    /* ---------- 拖动 & 点击 ---------- */
    var press = null;

    function onDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      var it = items[els.indexOf(e.currentTarget)];
      press = { it: it, id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: it.x, oy: it.y, dragging: false };
      try { it.el.setPointerCapture(e.pointerId); } catch (err) {}
    }

    function onMove(e) {
      if (!press || e.pointerId !== press.id) return;
      var dx = e.clientX - press.sx, dy = e.clientY - press.sy;
      var it = press.it;
      if (!press.dragging) {
        if (Math.hypot(dx, dy) < 6) return;
        press.dragging = true;
        if (openItem === it) {          // 拖动已点开的那张：先在当前位置“落下”
          openItem = null;
          it.el.classList.remove('is-open');
          desk.classList.remove('has-open');
          press.ox = it.x = 0; press.oy = it.y = 0; it.r = 0;
        }
        it.moved = true;
        it.z = ++zTop;
        it.el.classList.add('is-dragging');
      }
      e.preventDefault();
      it.x = clamp(press.ox + dx, -G.W / 2 + G.pw * 0.3, G.W / 2 - G.pw * 0.3);
      it.y = clamp(press.oy + dy, -G.H / 2 + G.ph * 0.3, G.H / 2 - G.ph * 0.3);
      apply(it);
    }

    function onUp(e) {
      if (!press || e.pointerId !== press.id) return;
      var it = press.it, wasDrag = press.dragging;
      press = null;
      if (wasDrag) {
        it.el.classList.remove('is-dragging');
        apply(it);
      } else if (openItem === it) {
        closeIt();
      } else {
        openIt(it);
      }
    }

    function onCancel() {
      if (!press) return;
      press.it.el.classList.remove('is-dragging');
      press = null;
    }

    /* 点空白处 / 按 Esc：收回 */
    function onDocClick(e) {
      if (openItem && !e.target.closest('[data-pol]')) closeIt();
    }
    function onKey(e) { if (e.key === 'Escape') closeIt(); }

    /* tidy up：全部回到初始位置 */
    function tidy() {
      closeIt();
      items.forEach(function (it, i) {
        it.moved = false;
        it.z = it.base.z;
        it.x = it.base.x; it.y = it.base.y; it.r = it.base.r;
        apply(it);
      });
      zTop = 30;
    }

    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { if (alive) layoutAll(); }, 120);
    }

    /* 照片读取失败时标出来 */
    els.forEach(function (el) {
      var img = el.querySelector('.pol-photo img');
      if (!img) return;
      img.addEventListener('error', function () {
        img.parentNode.classList.add('is-missing');
        console.warn('[about] 照片读取失败：' + img.getAttribute('src'));
      });
    });
    var passImg = pass.querySelector('.pass-photo img');
    if (passImg) passImg.addEventListener('error', function () {
      console.warn('[about] 证件照读取失败：' + passImg.getAttribute('src'));
    });

    els.forEach(function (el) {
      el.addEventListener('pointerdown', onDown);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onCancel);
    });
    if (tidyBtn) tidyBtn.addEventListener('click', tidy);
    if (backdrop) backdrop.addEventListener('click', closeIt);
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);

    layoutAll();
    // 字体加载完尺寸可能会变，再排一次
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { if (alive) layoutAll(); });
    }

    return function destroy() {
      alive = false;
      clearTimeout(resizeTimer);
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }

  window.AboutDesk = { mount: mount };
})();
