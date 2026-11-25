/* ==========================================================
   Avery Sun — site script
   - 页面切换（/about /work /play），不刷新整页
   - 导航白色高亮块滑动
   - 导航吸顶时加模糊背景
   - 贴纸悬停/点击动画
   ========================================================== */
(function () {
  'use strict';

  /* ---------- 设置：想加新页面，在这里加一行，并在 index.html 里加一个 <template id="page-名字"> ---------- */
  var ROUTES = {
    about: 'About',
    work: 'Work',
    play: 'Play'
  };
  var DEFAULT_ROUTE = 'about';
  var SITE_NAME = 'Avery Sun';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- 网址解析：同时支持 username.github.io/ 和 username.github.io/仓库名/ ---------- */
  var routeRe = new RegExp('^(.*?/)(?:(' + Object.keys(ROUTES).join('|') + ')/?)?(?:index\\.html)?$');

  function parsePath(pathname) {
    var m = pathname.match(routeRe);
    return m ? { base: m[1], route: m[2] || null } : { base: '/', route: null };
  }

  var BASE = parsePath(location.pathname).base;

  var view = document.getElementById('view');
  var navWrap = document.querySelector('.nav-wrap');
  var sentinel = document.querySelector('.nav-sentinel');
  var pillNav = document.querySelector('.pill-nav');
  var indicator = document.querySelector('.pill-indicator');
  var navLinks = pillNav.querySelectorAll('a[data-route]');

  var current = null;
  var renderToken = 0;
  var cleanupPage = null;

  /* ---------- 每个页面的额外功能（about 页的工作证 + 拍立得、play 页的三张卡片） ---------- */
  var PAGE_SETUP = {
    about: function (root) {
      swapImages(root);   // 签名、头像、便签、拍立得标签：有图片就换成图片
      var el = root.querySelector('[data-desk]');
      return el && window.AboutDesk ? window.AboutDesk.mount(el) : null;
    },
    play: function (root) {
      var el = root.querySelector('[data-play]');
      return el && window.PlayPage ? window.PlayPage.mount(el) : null;
    }
  };

  /* ---------- 可替换图片：<img data-src="..."> 存在就显示图片、隐藏它前面的占位；
     不存在就继续显示占位（代码画的线条 / 斜体文字） ---------- */
  function swapImages(scope, onAllDone) {
    var imgs = scope.querySelectorAll('img[data-src]');
    var pending = imgs.length;
    if (!pending) { if (onAllDone) onAllDone(); return; }
    imgs.forEach(function (img) {
      function finish(ok) {
        if (ok) {
          img.classList.add('is-loaded');
          if (img.previousElementSibling) img.previousElementSibling.classList.add('is-replaced');
        }
        if (--pending === 0 && onAllDone) onAllDone();
      }
      img.addEventListener('load', function () { finish(true); }, { once: true });
      img.addEventListener('error', function () { finish(false); }, { once: true });
      img.src = img.getAttribute('data-src');
    });
  }

  /* 主标题的手绘批注 */
  (function loadHandDrawn() {
    var headline = document.querySelector('.headline');
    if (!headline) return;
    function release() { headline.classList.remove('hand-pending'); }
    var timer = setTimeout(release, 1200);   // 最多等 1.2 秒
    swapImages(headline, function () { clearTimeout(timer); release(); });
  })();

  /* 底部的手写 let's connect! 和箭头 */
  var footerEl = document.querySelector('.site-footer');
  if (footerEl) swapImages(footerEl);

  /* ---------- 导航高亮块 ---------- */
  function moveIndicator(instant) {
    var active = pillNav.querySelector('a.is-active');
    if (!active) return;
    if (instant) indicator.style.transition = 'none';
    indicator.style.width = active.offsetWidth + 'px';
    indicator.style.transform = 'translateX(' + active.offsetLeft + 'px)';
    if (instant) {
      void indicator.offsetWidth;
      indicator.style.transition = '';
    }
  }

  function setActive(route) {
    navLinks.forEach(function (a) {
      var on = a.dataset.route === route;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    moveIndicator(false);
  }

  /* ---------- 切换内容区 ---------- */
  function render(route, animate) {
    var tpl = document.getElementById('page-' + route);
    if (!tpl) return;
    var token = ++renderToken;

    function swap() {
      if (token !== renderToken) return;
      if (cleanupPage) { cleanupPage(); cleanupPage = null; }
      view.replaceChildren(tpl.content.cloneNode(true));
      view.dataset.page = route;
      if (PAGE_SETUP[route]) cleanupPage = PAGE_SETUP[route](view) || null;
    }

    if (!animate || reduceMotion.matches) {
      swap();
      return;
    }

    view.classList.add('is-leaving');
    setTimeout(function () {
      if (token !== renderToken) return;
      swap();
      view.classList.remove('is-leaving');
      view.classList.add('is-entering');
      void view.offsetWidth;            // 让浏览器先“记住”起始状态
      view.classList.remove('is-entering');
    }, 200);
  }

  function go(route, opts) {
    opts = opts || {};
    if (!ROUTES[route]) route = DEFAULT_ROUTE;

    setActive(route);
    document.title = SITE_NAME + ' — ' + ROUTES[route];

    if (opts.push) {
      try { history.pushState({ route: route }, '', BASE + route); } catch (e) { /* 本地直接打开文件时忽略 */ }
    }

    if (route !== current) {
      current = route;
      render(route, opts.animate !== false);
    }

    // 如果已经往下滚了很多，切换后回到内容区顶部
    if (opts.push && window.scrollY > sentinel.offsetTop) {
      window.scrollTo({ top: sentinel.offsetTop, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    }
  }

  /* ---------- 首次打开：处理 404.html 跳转过来的 ?p=work ---------- */
  var params = new URLSearchParams(location.search);
  var initial = params.get('p');
  if (initial && ROUTES[initial]) {
    params.delete('p');
    var qs = params.toString();
    try { history.replaceState({ route: initial }, '', BASE + initial + (qs ? '?' + qs : '') + location.hash); } catch (e) {}
  } else {
    initial = parsePath(location.pathname).route || DEFAULT_ROUTE;
  }

  go(initial, { push: false, animate: false });
  moveIndicator(true);

  /* ---------- 点击导航 ---------- */
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[data-route]');
    if (!link) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    go(link.dataset.route, { push: true });
  });

  /* 浏览器“后退/前进” */
  window.addEventListener('popstate', function () {
    go(parsePath(location.pathname).route || DEFAULT_ROUTE, { push: false });
  });

  /* 窗口大小变化、字体加载完后，重新对齐高亮块 */
  window.addEventListener('resize', function () { moveIndicator(true); });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { moveIndicator(true); });
  }

  /* ---------- 导航吸顶时加模糊背景 ---------- */
  function updateStuck() {
    navWrap.classList.toggle('is-stuck', sentinel.getBoundingClientRect().top < 0);
  }
  window.addEventListener('scroll', updateStuck, { passive: true });
  updateStuck();

  /* ---------- 贴纸：鼠标移上去或点击时播放动画 ---------- */
  document.querySelectorAll('.sticker').forEach(function (sticker) {
    function play() {
      sticker.classList.remove('is-playing');
      void sticker.offsetWidth;
      sticker.classList.add('is-playing');
      clearTimeout(sticker._timer);
      sticker._timer = setTimeout(function () {
        sticker.classList.remove('is-playing');
      }, 900);
    }
    sticker.addEventListener('mouseenter', play);
    sticker.addEventListener('click', play);
  });

  /* ---------- 底部：滚动到时画出箭头 ---------- */
  var footer = document.querySelector('.site-footer');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          footer.classList.add('in-view');
          io.disconnect();
        }
      });
    }, { threshold: 0.4 });
    io.observe(footer);
  } else {
    footer.classList.add('in-view');
  }

  /* 年份自动更新 */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
