/*!
 * 海底 · haidi.fun 前台脚本
 * 原生 JS，无框架、无依赖；负责路由、面板切换、内容渲染、移动端抽屉
 */
(function () {
  'use strict';

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  const ORDER = { home: 0, about: 1, works: 2, blog: 3, contact: 4 };
  const TITLES = {
    home: '海底',
    about: '关于本站 · 海底',
    works: '作品集 · 海底',
    blog: '技术博客 · 海底',
    contact: '联系我 · 海底',
  };
  const CONTENT_URL = 'data/content.json';

  const panels = {};
  $$('[data-panel]').forEach((el) => { panels[el.dataset.panel] = el; });

  const state = {
    current: 'home',
    first: true,
    posts: [],
    projects: [],
    tag: 'all',
    keyword: '',
    workLevel: 'all',
    contentLoaded: false,
  };

  const LEVEL_ORDER = { '基础': 1, '进阶': 2, '综合': 3, '研究': 4 };

  const esc = (s) => (window.HDMD ? HDMD.escapeHtml(s) : String(s == null ? '' : s));

  /* ---------------- 提示条 ---------------- */
  let toastTimer = 0;
  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-show'), 2200);
  }

  /* ---------------- 落英粒子 ---------------- */
  function initPetals() {
    const wrap = $('#petals');
    if (!wrap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#f2abe7', '#9fa3ec', '#86d2e1', '#fec31e'];
    const count = window.innerWidth < 861 ? 12 : 26;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const petal = document.createElement('span');
      const size = 4 + Math.random() * 6;
      petal.className = 'petal';
      petal.style.left = (Math.random() * 100).toFixed(2) + '%';
      petal.style.width = size.toFixed(1) + 'px';
      petal.style.height = size.toFixed(1) + 'px';
      petal.style.background = colors[i % colors.length];
      petal.style.opacity = (0.32 + Math.random() * 0.42).toFixed(2);
      petal.style.setProperty('--dur', (12 + Math.random() * 12).toFixed(1) + 's');
      petal.style.setProperty('--delay', (-Math.random() * 22).toFixed(1) + 's');
      petal.style.setProperty('--drift', (Math.random() * 14 - 4).toFixed(1) + 'vw');
      frag.appendChild(petal);
    }
    wrap.appendChild(frag);
  }

  /* ---------------- 首页打字效果（不阻塞内容） ---------------- */
  function initTyper() {
    const el = $('#typer');
    if (!el) return;
    const full = el.textContent;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let done = false;
    try { done = sessionStorage.getItem('hd-typed') === '1'; } catch (e) { /* 隐私模式 */ }
    if (done) return;

    el.textContent = '';
    let i = 0;
    const tick = () => {
      i += 1;
      el.textContent = full.slice(0, i);
      if (i < full.length) {
        setTimeout(tick, 95);
      } else {
        try { sessionStorage.setItem('hd-typed', '1'); } catch (e) { /* ignore */ }
      }
    };
    setTimeout(tick, 420);
  }

  /* ---------------- 面板切换 ---------------- */
  function setNavActive(name) {
    $$('.nav__item').forEach((item) => {
      const on = item.dataset.route === name;
      item.classList.toggle('is-active', on);
      if (on) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
  }

  function loadHeroes(panel) {
    $$('img[data-src]', panel).forEach((img) => {
      if (img.dataset.loaded) return;
      img.src = img.dataset.src;
      img.dataset.loaded = '1';
    });
  }

  function activate(name, animate) {
    const next = panels[name];
    if (!next) return;
    const same = !state.first && state.current === name;
    const dir = ORDER[name] >= ORDER[state.current] ? 1 : -1;

    if (!same) {
      if (!animate || state.first) {
        Object.keys(panels).forEach((key) => {
          const panel = panels[key];
          const on = panel === next;
          panel.classList.toggle('is-active', on);
          panel.style.transition = 'none';
          panel.style.transform = '';
          panel.style.visibility = '';
          panel.setAttribute('aria-hidden', on ? 'false' : 'true');
          if ('inert' in panel) panel.inert = !on;
        });
        void next.offsetWidth;
        Object.keys(panels).forEach((key) => { panels[key].style.transition = ''; });
      } else {
        const prev = panels[state.current];
        const forward = dir > 0;

        // 其余面板立即归位并隐藏，避免连点时残影堆积
        Object.keys(panels).forEach((key) => {
          const panel = panels[key];
          if (panel === next || panel === prev) return;
          panel.classList.remove('is-active');
          panel.style.transition = 'none';
          panel.style.visibility = 'hidden';
          panel.style.transform = '';
          panel.style.zIndex = '';
          panel.setAttribute('aria-hidden', 'true');
          if ('inert' in panel) panel.inert = true;
        });

        // 旧面板滑出：与旧版一致的「左滑翻页」手感
        if (prev && prev !== next) {
          prev.classList.remove('is-active');
          prev.style.transition = 'none';
          prev.style.visibility = 'visible';
          prev.style.transform = 'translate3d(0,0,0)';
          prev.style.zIndex = '1';
          void prev.offsetWidth;
          prev.style.transition = '';
          prev.style.transform = forward ? 'translate3d(-100%,0,0)' : 'translate3d(100%,0,0)';
          clearTimeout(prev._hide);
          prev._hide = setTimeout(() => {
            if (prev.classList.contains('is-active')) return;
            prev.style.transition = 'none';
            prev.style.visibility = 'hidden';
            prev.style.transform = '';
            prev.style.zIndex = '';
            void prev.offsetWidth;
            prev.style.transition = '';
          }, 820);
          prev.setAttribute('aria-hidden', 'true');
          if ('inert' in prev) prev.inert = true;
        }

        // 新面板滑入
        clearTimeout(next._hide);
        next.style.transition = 'none';
        next.style.visibility = 'visible';
        next.style.transform = forward ? 'translate3d(100%,0,0)' : 'translate3d(-100%,0,0)';
        next.classList.add('is-active');
        next.style.zIndex = '2';
        next.setAttribute('aria-hidden', 'false');
        if ('inert' in next) next.inert = false;
        void next.offsetWidth;

        next.style.transition = '';
        next.style.transform = '';
        clearTimeout(next._cleanup);
        next._cleanup = setTimeout(() => {
          next.style.visibility = '';
          next.style.zIndex = '';
        }, 850);
      }

      state.current = name;
      state.first = false;
      loadHeroes(next);
      const body = $('.panel__body', next);
      if (body) body.scrollTop = 0;
    }

    setNavActive(name);
    document.title = TITLES[name] || TITLES.home;
  }

  /* ---------------- 内容渲染 ---------------- */
  function fmtDate(value) {
    const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[1] + '.' + m[2] + '.' + m[3] : String(value || '');
  }

  function excerpt(body) {
    return String(body || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[#>*_`|-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 78);
  }

  function linkAttrs(url) {
    return /^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '';
  }

  function renderWorks() {
    const wrap = $('#workList');
    if (!wrap) return;
    const all = state.projects
      .filter((p) => !p.draft)
      .slice()
      .sort((a, b) => (LEVEL_ORDER[a.level] || 9) - (LEVEL_ORDER[b.level] || 9));
    const items = state.workLevel === 'all' ? all : all.filter((p) => p.level === state.workLevel);
    if (!items.length) {
      wrap.innerHTML = '<p class="empty">这个阶段的项目还在整理中。</p>';
      return;
    }
    wrap.innerHTML = items.map((p) => {
      const cover = p.cover
        ? '<img src="' + esc(p.cover) + '" alt="' + esc(p.title) + '" width="480" height="270" loading="lazy" decoding="async">'
        : '';
      const status = p.statusText
        ? '<span class="work__status ' + (p.status === 'online' ? 'is-online' : 'is-offline') + '">' + esc(p.statusText) + '</span>'
        : '';
      const tags = (p.tags || []).slice(0, 3).map((t) => '<span class="tag">' + esc(t) + '</span>').join('');
      const level = p.level ? '<span class="work__level" data-level="' + esc(p.level) + '">' + esc(p.level) + '</span>' : '';
      return (
        '<article class="card work">' +
          '<a class="work__open" href="#/works/' + encodeURIComponent(p.id) + '" aria-label="查看项目：' + esc(p.title) + '"></a>' +
          '<div class="work__cover">' + cover + status + '</div>' +
          '<div class="work__body">' +
            level +
            '<h3 class="work__title"><a href="#/works/' + encodeURIComponent(p.id) + '">' + esc(p.title) + '</a></h3>' +
            '<p class="work__summary">' + esc(p.summary || excerpt(p.body)) + '</p>' +
            '<div class="work__tags">' + tags + '</div>' +
            '<span class="work__more">项目详情<i></i></span>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  function buildWorkLevels() {
    const wrap = $('#workLevels');
    if (!wrap) return;
    const items = state.projects.filter((p) => !p.draft);
    const levels = ['基础', '进阶', '综合', '研究'];
    const rows = ['<button type="button" class="level' + (state.workLevel === 'all' ? ' is-active' : '') +
      '" data-level="all" aria-pressed="' + (state.workLevel === 'all') + '"><b>00</b>全部<i>' + items.length + '</i></button>'];
    levels.forEach((lv, idx) => {
      const count = items.filter((p) => p.level === lv).length;
      if (!count) return;
      const on = state.workLevel === lv;
      rows.push('<button type="button" class="level' + (on ? ' is-active' : '') + '" data-level="' + lv +
        '" aria-pressed="' + on + '"><b>0' + (idx + 1) + '</b>' + lv + '<i>' + count + '</i></button>');
    });
    wrap.innerHTML = rows.join('');
  }

  /* ---------------- 项目详情 ---------------- */
  function showWorksList() {
    const list = $('#workListWrap');
    const view = $('#workView');
    if (!list || !view) return;
    list.hidden = false;
    view.hidden = true;
    if (panels.works) panels.works.classList.remove('is-detail');
    document.title = TITLES.works;
  }

  function showWork(id) {
    const view = $('#workView');
    const list = $('#workListWrap');
    if (!view || !list) return;
    if (!state.contentLoaded) return;

    const all = state.projects.filter((p) => !p.draft);
    const index = all.findIndex((p) => p.id === id);
    if (index === -1) {
      showWorksList();
      toast('这个项目不存在或已下线');
      return;
    }
    const p = all[index];
    const article = p.article ? state.posts.filter((x) => !x.draft && x.id === p.article)[0] : null;
    const prev = index > 0 ? all[index - 1] : null;
    const next = index < all.length - 1 ? all[index + 1] : null;

    const tags = (p.tags || []).map((t) => '<span class="tag">' + esc(t) + '</span>').join('');
    const metrics = (p.metrics || []).map((m) =>
      '<div class="metric"><span class="metric__value">' + esc(m.value) + '</span><span class="metric__label">' + esc(m.label) + '</span></div>'
    ).join('');
    const gallery = (p.gallery || []).map((g) =>
      '<figure class="gallery__item">' +
        '<button class="gallery__btn" type="button" data-full="' + esc(g.src) + '" data-caption="' + esc(g.caption || '') + '">' +
          '<img src="' + esc(g.src) + '" alt="' + esc(g.caption || p.title) + '" loading="lazy" decoding="async">' +
        '</button>' +
        '<figcaption>' + esc(g.caption || '') + '</figcaption>' +
      '</figure>'
    ).join('');
    const links = (p.links || []).map((l) => {
      const url = window.HDMD ? HDMD.safeUrl(l.url) : l.url;
      return url ? '<a class="btn btn--light btn--sm" href="' + esc(url) + '"' + linkAttrs(url) + '>' + esc(l.label) + '</a>' : '';
    }).join('');

    view.innerHTML =
      '<a class="back" href="#/works"><svg width="16" height="16" aria-hidden="true"><use href="#i-back"/></svg>返回作品集</a>' +
      '<div class="work-view__head">' +
        '<div class="work-view__intro">' +
          '<p class="work-view__kicker">PROJECT' + (p.period ? ' · ' + esc(p.period) : '') + '</p>' +
          '<h1 class="work-view__title">' + esc(p.title) + '</h1>' +
          '<p class="work-view__summary">' + esc(p.summary) + '</p>' +
          '<div class="work-view__meta">' +
            (p.level ? '<span class="level-chip" data-level="' + esc(p.level) + '">' + esc(p.level) + '</span>' : '') +
            (p.statusText ? '<span class="work__status-inline">' + esc(p.statusText) + '</span>' : '') +
            (p.role ? '<span class="work-view__role">' + esc(p.role) + '</span>' : '') +
            tags +
          '</div>' +
          '<div class="work-view__actions">' +
            (article ? '<a class="btn btn--solid btn--sm" href="#/blog/' + encodeURIComponent(article.id) + '">阅读实现复盘</a>' : '') +
            links +
          '</div>' +
        '</div>' +
        (p.cover ? '<figure class="work-view__cover"><img src="' + esc(p.cover) + '" alt="' + esc(p.title) + '" width="480" height="270" decoding="async"></figure>' : '') +
      '</div>' +
      (metrics ? '<div class="metrics">' + metrics + '</div>' : '') +
      '<div class="md work-view__body">' + (window.HDMD ? HDMD.render(p.body) : esc(p.body)) + '</div>' +
      (gallery ? '<h2 class="h3 work-view__gallery-title">结果截图</h2><div class="gallery">' + gallery + '</div>' : '') +
      '<nav class="work-nav" aria-label="项目切换">' +
        (prev ? '<a href="#/works/' + encodeURIComponent(prev.id) + '"><span>上一个项目</span>' + esc(prev.title) + '</a>' : '<span></span>') +
        (next ? '<a class="work-nav__next" href="#/works/' + encodeURIComponent(next.id) + '"><span>下一个项目</span>' + esc(next.title) + '</a>' : '') +
      '</nav>';

    list.hidden = true;
    view.hidden = false;
    if (panels.works) panels.works.classList.add('is-detail');
    document.title = p.title + ' · 海底';
    const body = $('#worksBody');
    if (body) body.scrollTop = 0;
  }

  /* ---------------- 图片灯箱 ---------------- */
  function openLightbox(src, caption) {
    const box = $('#lightbox');
    const img = $('#lightboxImg');
    if (!box || !img) return;
    img.src = src;
    img.alt = caption || '';
    $('#lightboxCap').textContent = caption || '';
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add('is-open'));
    document.body.classList.add('is-lightbox');
  }

  function closeLightbox() {
    const box = $('#lightbox');
    if (!box || box.hidden) return;
    box.classList.remove('is-open');
    document.body.classList.remove('is-lightbox');
    setTimeout(() => { box.hidden = true; }, 220);
  }

  function buildTagFilters() {
    const wrap = $('#tagFilters');
    if (!wrap) return;
    const tags = [];
    state.posts.forEach((p) => {
      if (p.draft) return;
      (p.tags || []).forEach((t) => { if (tags.indexOf(t) === -1) tags.push(t); });
    });
    wrap.innerHTML = ['全部'].concat(tags).map((t) => {
      const value = t === '全部' ? 'all' : t;
      const on = state.tag === value;
      return '<button type="button" class="filter' + (on ? ' is-active' : '') +
        '" data-tag="' + esc(value) + '" aria-pressed="' + on + '">' + esc(t) + '</button>';
    }).join('');
  }

  function renderPosts() {
    const list = $('#postList');
    if (!list) return;
    const keyword = state.keyword.trim().toLowerCase();
    const items = state.posts
      .filter((p) => !p.draft)
      .slice()
      .sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        return String(b.date || '').localeCompare(String(a.date || ''));
      })
      .filter((p) => state.tag === 'all' || (p.tags || []).indexOf(state.tag) !== -1)
      .filter((p) => {
        if (!keyword) return true;
        return (p.title + ' ' + (p.summary || '') + ' ' + (p.tags || []).join(' ')).toLowerCase().indexOf(keyword) !== -1;
      });

    if (!items.length) {
      list.innerHTML = '<li><p class="empty">没有找到匹配的文章</p></li>';
      return;
    }

    list.innerHTML = items.map((p, index) => {
      const tags = (p.tags || []).map((t) => '<span class="tag">' + esc(t) + '</span>').join('');
      const featured = index === 0;
      return (
        '<li><a class="post-link' + (featured ? ' is-featured' : '') + '" href="#/blog/' + encodeURIComponent(p.id) + '">' +
          '<span class="post-link__meta">' +
            (featured ? '<span class="post-link__badge">最新</span>' : '') +
            (p.level ? '<span class="post-link__level" data-level="' + esc(p.level) + '">' + esc(p.level) + '</span>' : '') +
            '<time datetime="' + esc(p.date) + '">' + esc(fmtDate(p.date)) + '</time>' + tags +
          '</span>' +
          '<span class="post-link__title">' + esc(p.title) + '</span>' +
          '<span class="post-link__summary">' + esc(p.summary || excerpt(p.body)) + '</span>' +
          '<span class="post-link__go" aria-hidden="true">阅读全文 <i></i></span>' +
        '</a></li>'
      );
    }).join('');
  }

  function showList() {
    const list = $('#blogList');
    const view = $('#postView');
    if (!list || !view) return;
    list.hidden = false;
    view.hidden = true;
    if (panels.blog) panels.blog.classList.remove('is-detail');
    document.title = TITLES.blog;
  }

  function showPost(id) {
    const view = $('#postView');
    const list = $('#blogList');
    if (!view || !list) return;
    if (!state.contentLoaded) return;

    const post = state.posts.filter((p) => !p.draft && p.id === id)[0];
    if (!post) {
      showList();
      toast('这篇文章不存在或已下线');
      return;
    }

    const tags = (post.tags || []).map((t) => '<span class="tag">' + esc(t) + '</span>').join('');
    view.innerHTML =
      '<a class="back" href="#/blog"><svg width="16" height="16" aria-hidden="true"><use href="#i-back"/></svg>返回列表</a>' +
      '<h1 class="post-view__title">' + esc(post.title) + '</h1>' +
      '<div class="post-view__meta"><time datetime="' + esc(post.date) + '">' + esc(fmtDate(post.date)) + '</time>' +
        (post.level ? '<span class="level-chip" data-level="' + esc(post.level) + '">' + esc(post.level) + '</span>' : '') +
        '<span class="post-view__tags">' + tags + '</span></div>' +
      '<div class="md">' + (window.HDMD ? HDMD.render(post.body) : esc(post.body)) + '</div>';

    list.hidden = true;
    view.hidden = false;
    if (panels.blog) panels.blog.classList.add('is-detail');
    document.title = post.title + ' · 海底';
    const body = $('#blogBody');
    if (body) body.scrollTop = 0;
  }

  /* ---------------- 路由 ---------------- */
  function route() {
    const raw = location.hash.replace(/^#\/?/, '');
    const parts = raw.split('/');
    const seg = parts[0] || 'home';

    if (seg === 'blog' && parts[1]) {
      activate('blog', !state.first);
      showPost(decodeURIComponent(parts[1]));
      return;
    }

    if (seg === 'blog') {
      activate('blog', !state.first);
      showList();
      return;
    }

    if (seg === 'works' && parts[1]) {
      activate('works', !state.first);
      showWork(decodeURIComponent(parts[1]));
      return;
    }

    if (seg === 'works') {
      activate('works', !state.first);
      showWorksList();
      return;
    }

    activate(ORDER[seg] !== undefined ? seg : 'home', !state.first);
  }

  /* ---------------- 移动端抽屉 ---------------- */
  function setDrawer(open) {
    const side = $('#side');
    const backdrop = $('#backdrop');
    const btn = $('#menuBtn');
    if (!side || !backdrop) return;
    side.classList.toggle('is-open', open);
    backdrop.hidden = !open;
    requestAnimationFrame(() => backdrop.classList.toggle('is-open', open));
    if (btn) {
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    }
    if (open) {
      const active = $('.nav__item.is-active', side);
      if (active) active.focus({ preventScroll: true });
    }
  }

  function initUi() {
    const menuBtn = $('#menuBtn');
    const backdrop = $('#backdrop');
    const side = $('#side');

    // 跳转链接只移动焦点，不参与 hash 路由
    const skip = $('.skip');
    if (skip) {
      skip.addEventListener('click', (e) => {
        e.preventDefault();
        const main = $('#main');
        if (main) main.focus();
      });
    }

    if (menuBtn) menuBtn.addEventListener('click', () => setDrawer(!side.classList.contains('is-open')));
    if (backdrop) backdrop.addEventListener('click', () => setDrawer(false));
    if (side) {
      side.addEventListener('click', (e) => {
        if (e.target.closest('.nav__item')) setDrawer(false);
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeLightbox();
        setDrawer(false);
      }
    });

    // 图片放大：作品画廊与文章配图
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('.gallery__btn, .md img');
      if (trigger) {
        const full = trigger.dataset ? trigger.dataset.full : '';
        const caption = trigger.dataset ? trigger.dataset.caption : '';
        if (full) {
          e.preventDefault();
          openLightbox(full, caption);
        } else if (trigger.tagName === 'IMG') {
          openLightbox(trigger.getAttribute('src'), trigger.getAttribute('alt'));
        }
        return;
      }
      if (e.target.closest('#lightboxClose') || e.target.id === 'lightbox') closeLightbox();
    });
    window.addEventListener('hashchange', () => {
      setDrawer(false);
      route();
    });

    $$('[data-share]').forEach((btn) => btn.addEventListener('click', share));

    const search = $('#postSearch');
    if (search) {
      let timer = 0;
      search.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          state.keyword = search.value;
          renderPosts();
        }, 130);
      });
    }

    const filters = $('#tagFilters');
    if (filters) {
      filters.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter');
        if (!btn) return;
        state.tag = btn.dataset.tag;
        $$('.filter', filters).forEach((b) => {
          const on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', String(on));
        });
        renderPosts();
      });
    }

    const levels = $('#workLevels');
    if (levels) {
      levels.addEventListener('click', (e) => {
        const btn = e.target.closest('.level');
        if (!btn) return;
        state.workLevel = btn.dataset.level;
        buildWorkLevels();
        renderWorks();
      });
    }
  }

  async function share() {
    const url = location.origin + location.pathname;
    const data = { title: '海底 · 技术博客', text: 'Python / 测试 / 数据 / AI 的学习记录', url: url };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast('链接已复制，去分享吧');
    } catch (err) {
      toast('请复制地址栏链接分享');
    }
  }

  /* ---------------- 内容加载 ---------------- */
  async function loadContent() {
    try {
      const res = await fetch(CONTENT_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      state.projects = Array.isArray(data.projects) ? data.projects : [];
      state.posts = Array.isArray(data.posts) ? data.posts : [];
      state.contentLoaded = true;

      renderWorks();
      buildTagFilters();
      renderPosts();
      buildWorkLevels();
      renderHomeStats(data.updated);

      const icp = data.site && data.site.icp;
      if (icp) {
        const line = $('#icpLine');
        if (line) {
          line.innerHTML = '<a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">' + esc(icp) + '</a>';
          line.hidden = false;
        }
      }

      route();
    } catch (err) {
      const msg = '<li><p class="empty">内容加载失败，请刷新重试。<br><span class="small">若在本地双击打开，请改用本地服务器访问。</span></p></li>';
      const list = $('#postList');
      const works = $('#workList');
      if (list) list.innerHTML = msg;
      if (works) works.innerHTML = msg;
      if (window.console) console.error('[haidi] 内容加载失败：', err);
    }
  }

  /* ---------------- 开场：一字一字 ---------------- */
  function initIntro() {
    const el = $('#intro');
    const target = $('#introType');
    const bar = $('#introBar');
    if (!el) return;
    let seen = false;
    try { seen = sessionStorage.getItem('hd-intro') === '1'; } catch (e) { /* 隐私模式 */ }
    if (seen || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.remove();
      return;
    }
    const text = '千里之行，始于足下。';
    document.body.classList.add('is-intro');
    if (target) target.textContent = '';
    let closed = false;
    const done = () => {
      if (closed) return;
      closed = true;
      el.classList.add('is-done');
      document.body.classList.remove('is-intro');
      try { sessionStorage.setItem('hd-intro', '1'); } catch (e) { /* ignore */ }
      setTimeout(() => el.remove(), 750);
    };
    let i = 0;
    const type = () => {
      if (closed) return;
      if (!target) { done(); return; }
      if (i < text.length) {
        target.textContent = text.slice(0, ++i);
        if (bar) bar.style.width = ((i / text.length) * 100).toFixed(1) + '%';
        setTimeout(type, 128);
      } else {
        setTimeout(done, 800);
      }
    };
    setTimeout(type, 320);
    el.addEventListener('click', done);
    document.addEventListener('keydown', done, { once: true });
  }

  /* ---------------- 首页数据条 ---------------- */
  function renderHomeStats(updated) {
    const stats = $('#homeStats');
    if (!stats || !state.contentLoaded) return;
    const projects = state.projects.filter((p) => !p.draft).length;
    const posts = state.posts.filter((p) => !p.draft).length;
    const month = String(updated || '').slice(0, 7).replace('-', '.');
    stats.innerHTML =
      '<span><b>' + projects + '</b>个项目</span><i></i>' +
      '<span><b>' + posts + '</b>篇文章</span><i></i>' +
      '<span>' + (month ? '最近更新 ' + esc(month) : '持续更新') + '</span>';
    stats.hidden = false;
  }

  /* ---------------- 左下角播放器 ---------------- */
  function initMusicPlayer() {
    const root = $('#player');
    const audio = $('#playerAudio');
    const disc = $('#playerDisc');
    const toggleBtn = $('#playerToggle');
    const titleEl = $('#playerTitle');
    const indexEl = $('#playerIndex');
    const bar = $('#playerBar');
    if (!root || !audio || !disc || !toggleBtn) return;

    const tracks = [
      { title: '海底', src: 'music/hd.mp3' },
      { title: '雷雨季节', src: 'music/lyjj.mp3' },
      { title: '胡广生', src: 'music/hgs.mp3' },
    ];
    let index = 0;

    function renderTrack() {
      const track = tracks[index];
      if (titleEl) titleEl.textContent = track.title;
      if (indexEl) indexEl.textContent = String(index + 1).padStart(2, '0');
      if (bar) bar.style.width = '0%';
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: '海底',
            album: '海底 · 2026',
          });
        } catch (e) { /* ignore */ }
      }
    }

    function play() {
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }

    function syncUI() {
      const on = !audio.paused && !audio.ended;
      root.classList.toggle('is-playing', on);
      toggleBtn.setAttribute('aria-label', on ? '暂停' : '播放');
    }

    function setTrack(next, autoplay) {
      index = (next + tracks.length) % tracks.length;
      audio.src = tracks[index].src;
      audio.load();
      renderTrack();
      if (!autoplay) audio.pause();
      if (autoplay) play();
    }

    audio.addEventListener('play', syncUI);
    audio.addEventListener('pause', syncUI);
    audio.addEventListener('timeupdate', () => {
      if (!bar || !isFinite(audio.duration) || !audio.duration) return;
      bar.style.width = Math.min(100, (audio.currentTime / audio.duration) * 100).toFixed(2) + '%';
    });
    audio.addEventListener('ended', () => setTrack(index + 1, true));

    root.addEventListener('click', (e) => {
      const action = e.target.closest('[data-player]');
      if (action) {
        const kind = action.getAttribute('data-player');
        if (kind === 'prev') setTrack(index - 1, !audio.paused);
        if (kind === 'next') setTrack(index + 1, !audio.paused);
        if (kind === 'toggle') {
          if (audio.paused) play();
          else { audio.pause(); syncUI(); }
        }
        return;
      }
      if (e.target.closest('#playerDisc')) {
        if (audio.paused) play();
        else { audio.pause(); syncUI(); }
      }
    });

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', play);
        navigator.mediaSession.setActionHandler('pause', () => audio.pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => setTrack(index - 1, !audio.paused));
        navigator.mediaSession.setActionHandler('nexttrack', () => setTrack(index + 1, !audio.paused));
      } catch (e) { /* ignore */ }
    }

    audio.volume = 0.7;
    setTrack(0, false);
    syncUI();
  }

  /* ---------------- 启动 ---------------- */
  initIntro();
  initPetals();
  initTyper();
  initUi();
  initMusicPlayer();
  route();
  loadContent();

  // 页面空闲 6 秒后再预取其余面板头图，让后续切换更快（省流量模式跳过）
  function prefetchHeroes() {
    const conn = navigator.connection || {};
    if (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')) return;
    Object.keys(panels).forEach((key) => loadHeroes(panels[key]));
  }
  setTimeout(prefetchHeroes, 6000);
})();
