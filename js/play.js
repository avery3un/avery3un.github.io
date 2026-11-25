/* ==========================================================
   Play 页：三张卡片
   1. on repeat   —— 专辑封面 Cover Flow，首尾循环（数据：data/music.js）
   2. now showing —— 电影胶片，自动慢慢滚动、无限循环（数据：data/movies.js）
   3. my people   —— 贴纸拼贴桌面（数据：data/friends.js）
   所有卡片：鼠标移上去会朝鼠标方向轻微 3D 倾斜，带视差和光泽
   这个文件一般不需要改；要加内容，改 data/ 里的文件就行。
   ========================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function mod(a, n) { return ((a % n) + n) % n; }
  function img(src, alt) {
    var i = el('img');
    i.src = src;
    i.alt = alt || '';
    i.loading = 'lazy';        // 懒加载
    i.decoding = 'async';
    i.draggable = false;
    i.addEventListener('error', function () {
      console.warn('[play] 图片读取失败：' + src);
      i.classList.add('is-missing');
    });
    return i;
  }
  var ICON_PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 3.6v8.8L12.6 8z"/></svg>';
  var ICON_SHUFFLE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 4.5h2.2c1.4 0 2.3.6 3.1 1.8l2.4 3.4c.8 1.2 1.7 1.8 3.1 1.8h2.2M12.5 9.5l2 2-2 2M1.5 11.5h2.2c1 0 1.7-.3 2.3-.9M9.9 5.4c.6-.6 1.3-.9 2.4-.9h2.2M12.5 2.5l2 2-2 2"/></svg>';


  /* ======================================================
     0. 鼠标倾斜：卡片朝鼠标方向倾斜（最大 2°），内容层视差，表面光泽
        松开后用弹簧回正；手机上、减少动态效果时不启用
     ====================================================== */
  var MAX_TILT = 2;        // 最大倾斜角度
  var PARALLAX = 1.75;      // 内容层比卡片多移动的像素 / 每度

  function attachTilt(card, layer) {
    if (!card) return null;
    var glare = el('div', 'card-glare');
    card.appendChild(glare);

    var rx = 0, ry = 0, vx = 0, vy = 0, tx = 0, ty = 0;   // 当前角度、速度、目标角度
    var g = 0, gt = 0;                                   // 光泽强度
    var raf = null;

    function enabled() { return finePointer.matches && !reduceMotion.matches; }

    function apply() {
      card.style.transform = (rx || ry)
        ? 'perspective(900px) rotateX(' + rx.toFixed(3) + 'deg) rotateY(' + ry.toFixed(3) + 'deg)'
        : '';
      if (layer) {
        layer.style.transform = (rx || ry)
          ? 'translate3d(' + (ry * PARALLAX).toFixed(2) + 'px,' + (-rx * PARALLAX).toFixed(2) + 'px,0)'
          : '';
      }
      glare.style.opacity = g.toFixed(3);
    }

    function step() {
      raf = null;
      // 弹簧：拉向目标 + 阻尼
      // 数值越小越慢、越“有阻尼”
      vx = (vx + (tx - rx) * 0.035) * 0.8;
      vy = (vy + (ty - ry) * 0.035) * 0.8;
      rx += vx; ry += vy;
      g += (gt - g) * 0.06;
      var still = Math.abs(tx - rx) < 0.004 && Math.abs(ty - ry) < 0.004 &&
                  Math.abs(vx) < 0.004 && Math.abs(vy) < 0.004 && Math.abs(gt - g) < 0.005;
      if (still) { rx = tx; ry = ty; g = gt; }
      apply();
      if (!still) raf = requestAnimationFrame(step);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(step); }

    function onMove(e) {
      if (e.pointerType !== 'mouse' || !enabled()) return;
      var r = card.getBoundingClientRect();
      var nx = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1);
      var ny = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1);
      tx = -ny * MAX_TILT;     // 鼠标在上方 → 上边往后倒
      ty = nx * MAX_TILT;
      gt = 1;
      card.style.setProperty('--gx', ((nx + 1) * 50).toFixed(1) + '%');
      card.style.setProperty('--gy', ((ny + 1) * 50).toFixed(1) + '%');
      kick();
    }
    function onLeave() { tx = 0; ty = 0; gt = 0; kick(); }

    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerleave', onLeave);

    return function () {
      if (raf) cancelAnimationFrame(raf);
      card.removeEventListener('pointermove', onMove);
      card.removeEventListener('pointerleave', onLeave);
    };
  }


  /* ======================================================
     1. Cover Flow（当前歌曲永远在正中间，首尾循环）
     ====================================================== */
  function mountMusic(root, list) {
    if (!root || !list || !list.length) return null;
    var n = list.length;

    var group = el('div', 'cf-group');      // 封面 + 歌名 + 歌手 + 进度，整体垂直居中
    var view = el('div', 'cf-view');
    var stage = el('div', 'cf-stage');
    view.appendChild(stage);
    var info = el('div', 'cf-info');
    var titleEl = el('p', 'cf-title');
    var artistEl = el('p', 'cf-artist');
    var dots = el('div', 'cf-dots');
    info.appendChild(titleEl);
    info.appendChild(artistEl);
    group.appendChild(view);
    group.appendChild(info);
    group.appendChild(dots);
    root.appendChild(group);

    // 封面图片还没放进来时显示的渐变色（每首一种颜色）
    var GRADIENTS = [
      ['#FF8A65', '#C2185B'], ['#4FC3F7', '#3949AB'], ['#AED581', '#00897B'],
      ['#FFD54F', '#F4511E'], ['#CE93D8', '#5E35B1'], ['#80DEEA', '#00838F']
    ];

    var covers = list.map(function (song, i) {
      var c = el('div', 'cf-cover');
      var g = GRADIENTS[i % GRADIENTS.length];
      c.style.background = 'linear-gradient(135deg, ' + g[0] + ', ' + g[1] + ')';
      c.appendChild(img(song.cover, song.title + ' — ' + song.artist));
      if (song.spotify) {
        var a = el('a', 'cf-play');
        a.href = song.spotify;
        a.target = '_blank';
        a.rel = 'noopener';
        a.setAttribute('aria-label', 'Play ' + song.title + ' on Spotify');
        a.innerHTML = ICON_PLAY;
        c.appendChild(a);
      }
      stage.appendChild(c);

      var d = el('button', 'cf-dot');
      d.type = 'button';
      d.setAttribute('aria-label', 'Song ' + (i + 1) + ': ' + song.title);
      d.addEventListener('click', function () { go(i); });
      dots.appendChild(d);
      return c;
    });

    // pos 是一个不封顶的数字：0 = 第 1 首在中间，1 = 第 2 首……可以一直往前/往后
    var startIdx = 0;
    list.forEach(function (song, i) { if (song.title === window.MUSIC_START) startIdx = i; });
    var pos = startIdx, target = startIdx, active = -1, size = 168, raf = null, swapTimer = null;
    var half = n / 2;
    var fadeStart = Math.min(3, half - 0.6);    // 离中间多远开始淡出（用来遮住首尾接缝）

    function measure() { size = covers[0].offsetWidth || 168; }

    function render() {
      var base = size * 0.66, gap = size * 0.3;
      for (var i = 0; i < n; i++) {
        var c = covers[i];
        var d = mod(i - pos + half, n) - half;      // 到中间的最短距离（循环）
        var ad = Math.abs(d), s = d < 0 ? -1 : 1;
        var x = s * (ad < 1 ? ad * base : base + (ad - 1) * gap);
        var ry = -s * Math.min(ad, 1) * 50;                       // 两侧向内倾斜
        var z = -Math.min(ad, 1) * 150 - Math.max(ad - 1, 0) * 70; // 逐渐变远
        var sc = 1 - Math.min(ad, 3) * 0.05;
        c.style.transform = 'translateX(' + x.toFixed(1) + 'px) translateZ(' + z.toFixed(1) + 'px) rotateY(' + ry.toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
        c.style.zIndex = 100 - Math.round(ad * 10);
        var blur = clamp(ad - 0.3, 0, 3) * 1.1;
        var bright = 1 - Math.min(ad, 3) * 0.2;
        c.style.filter = (blur > 0.05 ? 'blur(' + blur.toFixed(2) + 'px) ' : '') + 'brightness(' + bright.toFixed(3) + ')';
        c.style.opacity = ad <= fadeStart ? '1' : clamp(1 - (ad - fadeStart) / (half - fadeStart), 0, 1).toFixed(2);
        c.style.visibility = ad >= half - 0.02 ? 'hidden' : '';
      }
      var idx = mod(Math.round(pos), n);
      if (idx !== active) setActive(idx);
    }

    // 切歌：歌名和歌手先淡出，再换字淡入
    function setActive(i) {
      var first = active === -1;
      active = i;
      covers.forEach(function (c, k) { c.classList.toggle('is-active', k === i); });
      Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle('is-active', k === i); });
      clearTimeout(swapTimer);
      if (first || reduceMotion.matches) {
        titleEl.textContent = list[i].title;
        artistEl.textContent = list[i].artist;
        return;
      }
      info.classList.add('is-out');
      swapTimer = setTimeout(function () {
        titleEl.textContent = list[active].title;
        artistEl.textContent = list[active].artist;
        info.classList.remove('is-out');
      }, 170);
    }

    function tick() {
      raf = null;
      var k = reduceMotion.matches ? 1 : 0.14;     // 越小越“滑”
      pos += (target - pos) * k;
      if (Math.abs(target - pos) < 0.001) pos = target;
      render();
      if (pos !== target) raf = requestAnimationFrame(tick);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(tick); }
    // 跳到第 i 首：走最近的那条路（可能往左也可能往右）
    function go(i) {
      var cur = Math.round(target);
      var diff = mod(i - cur + half, n) - half;
      target = cur + Math.round(diff);
      kick();
    }
    function step(delta) { target = Math.round(target) + delta; kick(); }

    /* 拖动 / 滑动（带惯性，无限循环） */
    var drag = null, suppressClick = false;
    function onDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag = { id: e.pointerId, x: e.clientX, start: pos, moved: false, lastX: e.clientX, lastT: performance.now(), v: 0, target: e.target };
    }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      if (!drag.moved) {
        if (Math.abs(dx) < 6) return;
        drag.moved = true;
        try { view.setPointerCapture(e.pointerId); } catch (err) {}
        root.classList.add('is-dragging');
      }
      var now = performance.now(), dt = now - drag.lastT;
      if (dt > 0) drag.v = drag.v * 0.6 + ((e.clientX - drag.lastX) / dt) * 0.4;
      drag.lastX = e.clientX; drag.lastT = now;
      pos = drag.start - dx / (size * 0.6);
      target = pos;
      render();
    }
    function onUp(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag;
      drag = null;
      root.classList.remove('is-dragging');
      if (d.moved) {
        suppressClick = true;
        setTimeout(function () { suppressClick = false; }, 0);
        var fling = reduceMotion.matches ? 0 : -d.v * 260 / (size * 0.6);
        target = Math.round(pos + clamp(fling, -3, 3));
        kick();
      } else {
        var cover = d.target.closest && d.target.closest('.cf-cover');
        if (cover && !cover.classList.contains('is-active')) go(covers.indexOf(cover));
      }
    }
    view.addEventListener('pointerdown', onDown);
    view.addEventListener('pointermove', onMove);
    view.addEventListener('pointerup', onUp);
    view.addEventListener('pointercancel', function () {
      drag = null; root.classList.remove('is-dragging'); target = Math.round(pos); kick();
    });
    view.addEventListener('click', function (e) {
      if (suppressClick) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    /* 触控板横向滑动 */
    var wheelTimer;
    function onWheel(e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;   // 竖向滚动留给页面
      e.preventDefault();
      target += e.deltaX / 140;
      kick();
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(function () { target = Math.round(target); kick(); }, 120);
    }
    view.addEventListener('wheel', onWheel, { passive: false });

    /* 键盘左右键（卡片获得焦点或鼠标停在卡片上时） */
    function onKey(e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (document.activeElement !== root && !root.matches(':hover')) return;
      e.preventDefault();
      step(e.key === 'ArrowRight' ? 1 : -1);
    }
    document.addEventListener('keydown', onKey);

    // 重新量封面大小并摆位置：页面加载、封面图片加载完、窗口/卡片尺寸变化时都会做
    function onResize() { measure(); render(); }
    window.addEventListener('resize', onResize);
    var ro = window.ResizeObserver ? new ResizeObserver(onResize) : null;
    if (ro) ro.observe(view);
    stage.querySelectorAll('img').forEach(function (im) {
      if (!im.complete) im.addEventListener('load', onResize, { once: true });
    });
    window.addEventListener('load', onResize);

    measure();
    render();
    var untilt = attachTilt(root, group);

    return function () {
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(wheelTimer);
      clearTimeout(swapTimer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('load', onResize);
      if (ro) ro.disconnect();
      if (untilt) untilt();
    };
  }


  /* ======================================================
     2. 电影胶片：自动慢慢滚动、无限循环
        悬停时减速停下，移开后慢慢恢复；可以拖动/滑动
     ====================================================== */
  var SECONDS_PER_POSTER = 3;   // 每 3 秒移动一张海报的宽度

  function mountMovies(root, list) {
    if (!root || !list || !list.length) return null;
    var reel = el('div', 'reel');
    var track = el('div', 'reel-track');
    reel.appendChild(track);
    root.appendChild(reel);

    function makeFrame(m, isCopy) {
      var f = el('figure', 'reel-frame');
      f.tabIndex = isCopy ? -1 : 0;
      if (isCopy) f.setAttribute('aria-hidden', 'true');
      var p = el('div', 'reel-poster');
      p.appendChild(img(m.poster, m.title + ' poster'));
      var cap = el('figcaption', 'reel-info');
      cap.appendChild(el('p', 'reel-title', m.title));
      var sub = [m.director, m.year].filter(Boolean).join(' · ');
      if (sub) cap.appendChild(el('p', 'reel-sub', sub));
      if (m.note) {
        if (m.kind === 'quote') {
          cap.appendChild(el('p', 'reel-note is-quote', '“' + m.note + '”'));
        } else {
          var note = el('p', 'reel-note is-mine');
          note.appendChild(el('span', 'reel-tag', 'my take'));
          note.appendChild(document.createTextNode(m.note));
          cap.appendChild(note);
        }
      }
      f.appendChild(p);
      f.appendChild(cap);
      track.appendChild(f);
      return f;
    }
    // 放两份：滚到第二份开头时悄悄跳回第一份，看起来就是无限循环
    var frames = list.map(function (m) { return makeFrame(m, false); })
      .concat(list.map(function (m) { return makeFrame(m, true); }));

    var setW = 0, stepW = 0;
    function measure() {
      setW = frames[list.length].offsetLeft - frames[0].offsetLeft;   // 一整套海报的宽度
      stepW = frames.length > 1 ? frames[1].offsetLeft - frames[0].offsetLeft : frames[0].offsetWidth;
    }

    /* 自动滚动 */
    var x = 0;                 // 我们自己记的滚动位置（带小数，滚得更顺）
    var speed = 0;             // 当前速度（像素/毫秒）
    var hovering = false, dragging = false, lastUser = 0, lastT = 0, raf = null;
    var drag = null, v = 0, moved = false, glideV = 0;

    function wrap() {
      if (setW) {
        if (x >= setW + 1) x -= setW;      // 位置范围保持在 [0, 一套宽度]
        else if (x < 0) x += setW;
      }
      reel.scrollLeft = x;
    }

    /* 片名和短评比海报宽：靠近左右边缘时往里挪一点，不被卡片边缘切掉 */
    function fitInfo(f) {
      var info = f.querySelector('.reel-info');
      if (!info) return;
      var box = reel.getBoundingClientRect(), fr = f.getBoundingClientRect();
      var w = info.offsetWidth, cx = fr.left + fr.width / 2, pad = 10, shift = 0;
      if (cx - w / 2 < box.left + pad) shift = box.left + pad - (cx - w / 2);
      else if (cx + w / 2 > box.right - pad) shift = (box.right - pad) - (cx + w / 2);
      info.style.setProperty('--shift', shift.toFixed(1) + 'px');
    }
    frames.forEach(function (f) {
      f.addEventListener('pointerenter', function () { fitInfo(f); });
      f.addEventListener('focus', function () { fitInfo(f); });
    });

    function loop(t) {
      raf = requestAnimationFrame(loop);
      var dt = lastT ? Math.min(t - lastT, 50) : 16;
      lastT = t;
      if (!setW) measure();
      var userBusy = dragging || (t - lastUser < 900);
      var cruise = reduceMotion.matches ? 0 : stepW / (SECONDS_PER_POSTER * 1000);
      var want = (hovering || userBusy) ? 0 : cruise;
      // 平滑加速 / 减速（停下快一点，恢复慢一点）
      speed += (want - speed) * Math.min(1, dt / (want < speed ? 260 : 900));
      var moving = false;
      if (Math.abs(glideV) > 0.01) {          // 鼠标拖动松手后的惯性
        x -= glideV * dt;
        glideV *= Math.pow(0.94, dt / 16);
        moving = true;
      }
      if (speed > 0.0005) { x += speed * dt; moving = true; }
      if (moving) wrap();
    }

    // 用户自己滚动（触屏、触控板）时：先停一下自动滚动，并把位置同步过来
    reel.addEventListener('scroll', function () {
      // 和我们自己设的位置差得多 → 是用户在滚
      if (Math.abs(reel.scrollLeft - x) > 1.5) {
        x = reel.scrollLeft;
        lastUser = performance.now();
        if (setW && x < 1) x += setW;      // 滑到最左边：接到第二份的同一位置，可以继续往左
        else if (setW && x >= setW + 1) x -= setW;
        reel.scrollLeft = x;
      }
      frames.forEach(function (f) {
        if (f.classList.contains('is-active') || f.matches(':hover')) fitInfo(f);
      });
    }, { passive: true });

    root.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hovering = true; });
    root.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hovering = false; });

    /* 鼠标拖动（触屏和触控板用浏览器原生滚动，本来就有惯性） */
    reel.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') { lastUser = performance.now(); return; }
      if (e.button !== 0) return;
      glideV = 0;
      drag = { id: e.pointerId, lastX: e.clientX, lastT: performance.now() };
      moved = false; v = 0;
      drag.sx = e.clientX;
    });
    reel.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (!moved && Math.abs(e.clientX - drag.sx) > 5) {
        moved = true;
        dragging = true;
        reel.classList.add('is-dragging');
        try { reel.setPointerCapture(e.pointerId); } catch (err) {}
      }
      if (!moved) { drag.lastX = e.clientX; return; }
      var now = performance.now(), dt = now - drag.lastT;
      var dx = e.clientX - drag.lastX;
      if (dt > 0) v = v * 0.6 + (dx / dt) * 0.4;
      drag.lastX = e.clientX; drag.lastT = now;
      x -= dx;
      wrap();
    });
    function endDrag(e) {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      dragging = false;
      reel.classList.remove('is-dragging');
      if (moved && !reduceMotion.matches) glideV = v;
      lastUser = performance.now();
    }
    reel.addEventListener('pointerup', endDrag);
    reel.addEventListener('pointercancel', endDrag);

    /* 手机上没有“悬停”：点一下海报显示信息（再点一下收起） */
    reel.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); moved = false; return; }
      var f = e.target.closest('.reel-frame');
      frames.forEach(function (o) { if (o !== f) o.classList.remove('is-active'); });
      if (f) { fitInfo(f); f.classList.toggle('is-active'); }
      // 手机上看信息时先停下，收起后继续滚
      if (!finePointer.matches) hovering = !!(f && f.classList.contains('is-active'));
    });

    function onResize() { measure(); wrap(); }
    window.addEventListener('resize', onResize);

    measure();
    raf = requestAnimationFrame(loop);
    var untilt = attachTilt(root, reel);

    return function () {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      if (untilt) untilt();
    };
  }


  /* ======================================================
     3. 贴纸拼贴桌面（平时轻轻漂浮，拖动时停下）
     ====================================================== */
  function mountFriends(root, list) {
    if (!root || !list || !list.length) return null;
    var board = el('div', 'stk-board');
    var btn = el('button', 'stk-shuffle');
    btn.type = 'button';
    btn.innerHTML = ICON_SHUFFLE + 'shuffle';
    root.appendChild(board);
    root.appendChild(btn);

    var zTop = list.length;
    var items = list.map(function (f, i) {
      var isPhoto = f.type === 'photo';
      var s = el('div', 'stk ' + (isPhoto ? 'stk-photo' : 'stk-cutout'));
      var inner = el('div', 'stk-inner');
      // 每张贴纸漂浮的节奏都不一样
      inner.style.setProperty('--float-dur', rand(3.2, 5.4).toFixed(2) + 's');
      inner.style.setProperty('--float-delay', (-rand(0, 5)).toFixed(2) + 's');
      inner.style.setProperty('--float-y', (-rand(3, 6)).toFixed(1) + 'px');
      if (isPhoto) {
        var frame = el('div', 'stk-frame');
        frame.appendChild(img(f.image, f.label || 'photo with friends'));
        inner.appendChild(frame);
      } else {
        inner.appendChild(img(f.image, f.label || 'friend'));
      }
      s.appendChild(inner);
      if (f.label) s.appendChild(el('span', 'stk-tag', f.label));
      board.appendChild(s);
      return { el: s, fx: 0.5, fy: 0.5, r: 0, z: i + 1 };
    });

    function place(it) {
      var W = board.clientWidth, H = board.clientHeight;
      var w = it.el.offsetWidth, h = it.el.offsetHeight;
      var x = it.fx * Math.max(0, W - w), y = it.fy * Math.max(0, H - h);
      it.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + it.r.toFixed(1) + 'deg)';
      it.el.style.zIndex = it.z;
    }

    /* 随机散开：先分成格子（电脑 3×2，手机 2×3），每个格子里随机偏移，避免全挤在一起 */
    function scatter() {
      var cols = board.clientWidth < 300 ? 2 : 3, rows = Math.ceil(items.length / cols);
      var cells = [];
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) cells.push([c, r]);
      cells.sort(function () { return Math.random() - 0.5; });
      items.forEach(function (it, i) {
        var cell = cells[i % cells.length];
        it.fx = clamp((cell[0] + 0.5) / cols + rand(-0.13, 0.13), 0.02, 0.98);
        it.fy = clamp((cell[1] + 0.5) / rows + rand(-0.2, 0.2), 0.04, 0.96);
        it.r = rand(-18, 18);
        place(it);
      });
    }

    var drag = null;
    items.forEach(function (it) {
      it.el.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        var W = board.clientWidth, H = board.clientHeight;
        var w = it.el.offsetWidth, h = it.el.offsetHeight;
        it.z = ++zTop;
        drag = { it: it, id: e.pointerId, sx: e.clientX, sy: e.clientY,
                 x0: it.fx * Math.max(0, W - w), y0: it.fy * Math.max(0, H - h),
                 maxX: Math.max(1, W - w), maxY: Math.max(1, H - h) };
        it.el.classList.add('is-dragging');
        place(it);
        try { it.el.setPointerCapture(e.pointerId); } catch (err) {}
      });
      it.el.addEventListener('pointermove', function (e) {
        if (!drag || drag.it !== it || e.pointerId !== drag.id) return;
        var x = clamp(drag.x0 + e.clientX - drag.sx, 0, drag.maxX);
        var y = clamp(drag.y0 + e.clientY - drag.sy, 0, drag.maxY);
        it.fx = x / drag.maxX;
        it.fy = y / drag.maxY;
        place(it);
      });
      function end(e) {
        if (!drag || drag.it !== it || e.pointerId !== drag.id) return;
        drag = null;
        it.el.classList.remove('is-dragging');
      }
      it.el.addEventListener('pointerup', end);
      it.el.addEventListener('pointercancel', end);
    });

    btn.addEventListener('click', function () {
      board.classList.add('is-shuffling');
      scatter();
      setTimeout(function () { board.classList.remove('is-shuffling'); }, 700);
    });

    function onResize() { items.forEach(place); }
    window.addEventListener('resize', onResize);

    scatter();
    // 图片加载完尺寸可能变化，再对齐一次
    board.querySelectorAll('img').forEach(function (i) {
      i.addEventListener('load', function () { onResize(); }, { once: true });
    });
    var untilt = attachTilt(root, board);

    return function () {
      window.removeEventListener('resize', onResize);
      if (untilt) untilt();
    };
  }


  /* ---------- 挂载整个 play 页 ---------- */
  function mount(root) {
    var cleanups = [
      mountMusic(root.querySelector('[data-music]'), window.MUSIC),
      mountMovies(root.querySelector('[data-movies]'), window.MOVIES),
      mountFriends(root.querySelector('[data-friends]'), window.FRIENDS)
    ];
    return function destroy() {
      cleanups.forEach(function (fn) { if (fn) fn(); });
    };
  }

  window.PlayPage = { mount: mount };
})();
