// 웹판 브라우저 스크립트(dist/web/assets/site.js): 화면 테마, 좁은 화면 차례, "이 쪽의 내용" 위치 표시, 코드 복사, 검색(Pagefind)
(() => {
  const doc = document.documentElement;
  const body = document.body;
  const root = doc.dataset.root || '';
  const store = {
    get(k) {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, v);
      } catch {}
    },
  };

  // ------------------------------------------------------------ 화면 테마
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const themeBtn = document.querySelector('.theme-btn');
  const theme = () => doc.dataset.theme || (mq.matches ? 'dark' : 'light');
  const syncTheme = () => {
    if (!themeBtn) return;
    const dark = theme() === 'dark';
    const label = dark ? '밝은 화면으로 바꾸기' : '어두운 화면으로 바꾸기';
    themeBtn.setAttribute('aria-label', label);
    themeBtn.title = label;
  };
  themeBtn?.addEventListener('click', () => {
    const next = theme() === 'dark' ? 'light' : 'dark';
    doc.dataset.theme = next;
    store.set('theme', next);
    syncTheme();
  });
  mq.addEventListener?.('change', syncTheme);
  syncTheme();

  // ------------------------------------------------------------ 왼쪽 차례(좁은 화면에서는 메뉴 단추로 연다)
  const sidebar = document.querySelector('.sidebar');
  const menuBtn = document.querySelector('.menu-btn');
  const setNav = (open) => {
    body.classList.toggle('nav-open', open);
    if (menuBtn) {
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? '차례 닫기' : '차례 열기');
    }
  };
  menuBtn?.addEventListener('click', () => setNav(!body.classList.contains('nav-open')));
  document.querySelector('.scrim')?.addEventListener('click', () => setNav(false));
  sidebar?.addEventListener('click', (e) => {
    if (e.target.closest('a')) setNav(false);
  });
  const current = sidebar?.querySelector('[aria-current="page"]');
  if (sidebar && current && current.offsetTop + current.offsetHeight > sidebar.clientHeight - 48) sidebar.scrollTop = current.offsetTop - sidebar.clientHeight / 3;

  // ------------------------------------------------------------ "이 쪽의 내용": 지금 읽는 절 표시
  const spyPairs = [...document.querySelectorAll('.onpage a[href^="#"]')]
    .map((a) => [a, document.getElementById(decodeURIComponent(a.hash.slice(1)))])
    .filter(([, t]) => t);
  let ticking = false;
  const spy = () => {
    ticking = false;
    let active = -1;
    spyPairs.forEach(([, t], i) => {
      if (t.getBoundingClientRect().top < 110) active = i;
    });
    spyPairs.forEach(([a], i) => a.classList.toggle('is-active', i === active));
  };
  if (spyPairs.length) {
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(spy);
        }
      },
      { passive: true },
    );
    spy();
  }

  // ------------------------------------------------------------ 표지(210×297mm iframe)를 틀 폭에 맞게 줄이기
  const frames = document.querySelectorAll('.cover-frame');
  const fit = (el) => {
    const f = el.querySelector('iframe');
    if (f && f.offsetWidth) el.style.setProperty('--s', String(el.clientWidth / f.offsetWidth));
  };
  frames.forEach(fit);
  if (frames.length && 'ResizeObserver' in window) {
    const ro = new ResizeObserver((entries) => entries.forEach((e) => fit(e.target)));
    frames.forEach((el) => ro.observe(el));
  }

  // ------------------------------------------------------------ 코드 복사
  for (const box of document.querySelectorAll('.code')) {
    const pre = box.querySelector('pre');
    if (!pre) continue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy';
    btn.textContent = '복사';
    btn.setAttribute('aria-label', '코드 복사');
    btn.addEventListener('click', async () => {
      const text = pre.innerText.replace(/\n$/, '');
      let ok = false;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        body.appendChild(ta);
        ta.select();
        try {
          ok = document.execCommand('copy');
        } catch {}
        ta.remove();
      }
      btn.textContent = ok ? '복사됨' : '복사 실패';
      btn.classList.add('done');
      setTimeout(() => {
        btn.textContent = '복사';
        btn.classList.remove('done');
      }, 1500);
    });
    box.appendChild(btn);
  }

  // ------------------------------------------------------------ 검색(Pagefind, dist/web/pagefind/)
  const search = document.querySelector('.search');
  const input = search?.querySelector('input');
  const panel = search?.querySelector('.search-panel');
  const searchBtn = document.querySelector('.search-btn');
  if (!search || !input || !panel) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const toHref = (url) => root + String(url).replace(/^\//, '');
  let loading = null;
  const loadPagefind = () =>
    (loading ??= (location.protocol === 'file:' ? Promise.reject(new Error('file')) : import(new URL(`${root}pagefind/pagefind.js`, location.href).href).then(async (pf) => {
      // baseUrl '/': 결과 URL을 색인에 넣은 그대로(/script/…) 받아 toHref가 root를 붙인다. 생략하면 Pagefind가
      // pagefind/의 상위 경로(하위 경로 배포의 /<저장소>/)를 앞에 붙여 하위 경로가 두 번 들어간다
      await pf.options({ baseUrl: '/', excerptLength: 22 });
      pf.init();
      return pf;
    })));
  const show = (html) => {
    panel.innerHTML = html;
    panel.hidden = false;
  };
  const hide = () => {
    panel.hidden = true;
  };
  const LIMIT = 8;
  let seq = 0;
  async function run() {
    const q = input.value.trim();
    const my = ++seq;
    if (!q) {
      hide();
      return;
    }
    let pf;
    try {
      pf = await loadPagefind();
    } catch {
      loading = null;
      show(
        `<p class="search-msg">${
          location.protocol === 'file:' ? '파일로 연 쪽에서는 검색할 수 없습니다. 로컬 서버(bun run serve:web)로 열어 주세요.' : '검색 색인을 읽지 못했습니다.'
        }</p>`,
      );
      return;
    }
    const res = await pf.debouncedSearch(q, {}, 160);
    if (res === null || my !== seq) return;
    if (!res.results.length) {
      show(`<p class="search-msg">“${esc(q)}”에 맞는 결과가 없습니다.</p>`);
      return;
    }
    const data = await Promise.all(res.results.slice(0, LIMIT).map((r) => r.data()));
    if (my !== seq) return;
    const items = data.map((d) => {
      const subs = (d.sub_results || []).filter((s) => s.url !== d.url && s.url.includes('#')).slice(0, 3);
      return `<div class="sr-group"><a class="sr" href="${esc(toHref(d.url))}"><span class="sr-book">${esc(d.meta?.book)}</span><span class="sr-title">${esc(d.meta?.title || d.url)}</span><span class="sr-ex">${d.excerpt}</span></a>${subs
        .map((s) => `<a class="sr sr-sub" href="${esc(toHref(s.url))}"><span class="sr-title">${esc(s.title)}</span><span class="sr-ex">${s.excerpt}</span></a>`)
        .join('')}</div>`;
    });
    const more = res.results.length > LIMIT ? `<p class="search-msg">결과 ${res.results.length}쪽 가운데 ${LIMIT}쪽을 보여 줍니다. 검색어를 더 구체적으로 적어 보세요.</p>` : '';
    show(items.join('') + more);
  }
  const closeSearch = () => {
    hide();
    body.classList.remove('search-open');
  };
  const openSearch = () => {
    body.classList.add('search-open');
    input.focus();
    input.select();
  };
  input.addEventListener('input', run);
  input.addEventListener('focus', () => {
    loadPagefind().catch(() => {
      loading = null;
    });
    if (input.value.trim() && panel.innerHTML) panel.hidden = false;
  });
  input.addEventListener('keydown', (e) => {
    const items = [...panel.querySelectorAll('.sr')];
    if (e.key === 'ArrowDown' && items.length && !panel.hidden) {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === 'Enter' && items.length && !panel.hidden) {
      e.preventDefault();
      location.href = items[0].href;
    } else if (e.key === 'Escape') {
      input.value = '';
      closeSearch();
      input.blur();
    }
  });
  panel.addEventListener('keydown', (e) => {
    const items = [...panel.querySelectorAll('.sr')];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[Math.min(i + 1, items.length - 1)]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (i <= 0) input.focus();
      else items[i - 1].focus();
    } else if (e.key === 'Escape') {
      hide();
      input.focus();
    }
  });
  panel.addEventListener('click', (e) => {
    if (e.target.closest('a')) closeSearch();
  });
  searchBtn?.addEventListener('click', () => {
    if (body.classList.contains('search-open')) closeSearch();
    else openSearch();
  });
  document.addEventListener('click', (e) => {
    if (!search.contains(e.target) && !e.target.closest('.search-btn')) closeSearch();
  });
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? '');
    if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
      e.preventDefault();
      openSearch();
    } else if (e.key === 'Escape' && body.classList.contains('nav-open')) {
      setNav(false);
      menuBtn?.focus();
    }
  });
})();
