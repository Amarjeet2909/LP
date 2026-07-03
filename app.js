/* ============================================================
   CREDIBLE APP.JS — All interactivity + sessionStorage only
   Data lives in sessionStorage and is cleared on every refresh
   ============================================================ */

'use strict';

// ─────────────────────────────────────────────
// SESSION STORE  (cleared automatically on tab close / refresh)
// ─────────────────────────────────────────────
const Store = {
  key: 'credible_session',
  get() {
    try { return JSON.parse(sessionStorage.getItem(this.key)) || {}; }
    catch { return {}; }
  },
  set(data) {
    try { sessionStorage.setItem(this.key, JSON.stringify(data)); }
    catch { /* quota exceeded – silently ignore */ }
  },
  patch(partial) { this.set({ ...this.get(), ...partial }); },
  clear() { sessionStorage.removeItem(this.key); }
};

// ─────────────────────────────────────────────
// UTILITY HELPERS
// ─────────────────────────────────────────────
function $(sel, ctx = document)  { return ctx.querySelector(sel); }
function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

function formatCurrency(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatCompact(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

function showToast(msg, type = 'info', duration = 3200) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast show toast-${type}`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.className = 'toast'; }, duration);
}

function openModal(id) {
  const m = $(`#${id}`);
  if (!m) return;
  m.classList.add('open');
  document.body.classList.add('no-scroll');
}

function closeModal(id) {
  const m = $(`#${id}`);
  if (!m) return;
  m.classList.remove('open');
  if (!$$('.modal.open').length) document.body.classList.remove('no-scroll');
}

function scrollToSection(id) {
  const el = $(`#${id}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─────────────────────────────────────────────
// LOADER
// ─────────────────────────────────────────────
(function initLoader() {
  const loader = $('#loader');
  if (!loader) return;
  // Hide after animation completes
  setTimeout(() => loader.classList.add('hidden'), 1600);
})();

// ─────────────────────────────────────────────
// ANNOUNCEMENT BAR
// ─────────────────────────────────────────────
(function initAnnouncementBar() {
  const bar   = $('#announcementBar');
  const close = $('#closeAnnouncement');
  if (!bar || !close) return;

  // Hide permanently for session if already closed
  if (Store.get().announcementClosed) {
    bar.classList.add('hidden');
    return;
  }

  close.addEventListener('click', () => {
    bar.classList.add('hidden');
    Store.patch({ announcementClosed: true });
  });
})();

// ─────────────────────────────────────────────
// HEADER — sticky scroll effect + mobile hamburger
// ─────────────────────────────────────────────
(function initHeader() {
  const header    = $('#header');
  const hamburger = $('#hamburger');
  const navMenu   = $('#navMenu');
  if (!header) return;

  // Scroll shadow
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
    // Back-to-top visibility
    const btt = $('#backToTop');
    if (btt) btt.classList.toggle('visible', window.scrollY > 400);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Hamburger
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      navMenu.classList.toggle('open', isOpen);
    });
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!header.contains(e.target)) {
        hamburger.classList.remove('open');
        navMenu.classList.remove('open');
      }
    });
  }

  // Dropdown toggle on mobile (click) / hover handled by CSS on desktop
  $$('.has-dropdown button.nav-link').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (window.innerWidth > 900) return;
      e.stopPropagation();
      const item = btn.closest('.has-dropdown');
      const wasOpen = item.classList.contains('dd-open');
      $$('.has-dropdown').forEach(i => i.classList.remove('dd-open'));
      if (!wasOpen) item.classList.add('dd-open');
    });
  });
})();

// ─────────────────────────────────────────────
// BACK TO TOP
// ─────────────────────────────────────────────
(function initBackToTop() {
  const btt = $('#backToTop');
  if (!btt) return;
  btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

// ─────────────────────────────────────────────
// SMOOTH SCROLL — [data-goto] attributes
// ─────────────────────────────────────────────
(function initSmoothScroll() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-goto]');
    if (!el) return;
    e.preventDefault();
    scrollToSection(el.dataset.goto);
  });
})();

// ─────────────────────────────────────────────
// HERO TABS — switching between loan form types
// ─────────────────────────────────────────────
(function initHeroTabs() {
  const tabs = $$('.card-tab');
  const forms = $$('.loan-form');
  if (!tabs.length) return;

  function activateTab(tabName) {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
    forms.forEach(f => f.classList.toggle('active', f.dataset.type === tabName));
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => activateTab(tab.dataset.tab));
  });

  // Restore last active tab from session
  const saved = Store.get().activeTab;
  if (saved) activateTab(saved);

  // Product cards trigger hero tab
  $$('[data-tab-target][data-goto-hero]').forEach(btn => {
    btn.addEventListener('click', () => {
      activateTab(btn.dataset.tabTarget);
      Store.patch({ activeTab: btn.dataset.tabTarget });
      scrollToSection('hero');
    });
  });
})();

// ─────────────────────────────────────────────
// FORM VALIDATION HELPER
// ─────────────────────────────────────────────
function validateForm(form) {
  let valid = true;
  // Clear previous errors
  $$('.field-error', form).forEach(e => e.remove());
  $$('.has-error', form).forEach(e => e.classList.remove('has-error'));

  form.querySelectorAll('[required]').forEach(input => {
    const val = input.value.trim();
    let msg = '';

    if (!val) {
      msg = 'This field is required.';
    } else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      msg = 'Please enter a valid email address.';
    } else if (input.minLength && val.length < input.minLength) {
      msg = `Minimum ${input.minLength} characters required.`;
    } else if (input.type === 'number') {
      const n = parseFloat(val);
      if (isNaN(n)) {
        msg = 'Please enter a valid number.';
      } else if (input.min && n < parseFloat(input.min)) {
        msg = `Minimum value is ${formatCurrency(input.min)}.`;
      } else if (input.max && n > parseFloat(input.max)) {
        msg = `Maximum value is ${formatCurrency(input.max)}.`;
      }
    } else if (input.type === 'checkbox' && !input.checked) {
      msg = 'You must accept to continue.';
    }

    if (msg) {
      valid = false;
      input.classList.add('has-error');
      const err = document.createElement('div');
      err.className = 'field-error';
      err.textContent = '⚠ ' + msg;
      input.closest('.form-group').appendChild(err);
    }
  });
  return valid;
}

// ─────────────────────────────────────────────
// MOCK RATE GENERATION
// ─────────────────────────────────────────────
const LENDERS = [
  { name: 'SoFi Bank',        code: 'SF', color: 'av-blue'   },
  { name: 'LightStream',      code: 'LT', color: 'av-green'  },
  { name: 'Marcus by GS',     code: 'MK', color: 'av-purple' },
  { name: 'Discover',         code: 'DC', color: 'av-blue'   },
  { name: 'Upgrade',          code: 'UP', color: 'av-green'  },
  { name: 'Best Egg',         code: 'BE', color: 'av-purple' },
  { name: 'Earnest',          code: 'ER', color: 'av-blue'   },
  { name: 'Citizens Bank',    code: 'CB', color: 'av-green'  },
];

const CREDIT_MULTIPLIER = { excellent: 1.0, good: 1.12, fair: 1.28, poor: 1.48, bad: 1.72 };
const BASE_RATES = { personal: 6.49, student: 4.99, mortgage: 6.55 };

function generateOffers(formType, data) {
  const base   = BASE_RATES[formType] || 8.0;
  const mult   = CREDIT_MULTIPLIER[data.credit] || 1.2;
  const amount = parseFloat(data.amount || data.home_value || 15000);
  const term   = parseInt(data.term || 60);

  // Shuffle lenders and pick 4-6
  const shuffled = [...LENDERS].sort(() => Math.random() - .5).slice(0, Math.floor(Math.random() * 3) + 4);

  return shuffled.map((lender, i) => {
    const spread   = (Math.random() * 3.5 * mult);
    const apr      = +(base * mult + spread + i * .6).toFixed(2);
    const monthly  = calcMonthlyPayment(amount, apr, term);
    return { lender, apr, monthly, amount, term };
  }).sort((a, b) => a.apr - b.apr);
}

function calcMonthlyPayment(principal, annualRate, months) {
  const r = annualRate / 100 / 12;
  if (r === 0) return (principal / months).toFixed(2);
  return (principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1)).toFixed(2);
}

// ─────────────────────────────────────────────
// BUILD RESULTS MODAL HTML
// ─────────────────────────────────────────────
function buildResultsHTML(formType, formData, offers) {
  const typeLabels = { personal: 'Personal Loan', student: 'Student Loan', mortgage: 'Mortgage' };
  const amount = parseFloat(formData.amount || formData.home_value || 0);

  const offerRows = offers.map((o, i) => {
    const isBest = i === 0;
    return `
      <div class="result-offer ${isBest ? 'result-offer--best' : ''}">
        ${isBest ? '<div class="ro-badge">&#11088; Best Rate — Lowest APR</div>' : ''}
        <div class="ro-lender">
          <div class="lender-av ${o.lender.color}">${o.lender.code}</div>
          <div>
            <strong>${o.lender.name}</strong>
            <span>${typeLabels[formType]} · ${o.term / 12}yr Fixed</span>
          </div>
        </div>
        <div class="ro-rates">
          <div>
            <div class="ro-rate-big">${o.apr}%</div>
            <div class="ro-rate-sub">Fixed APR</div>
          </div>
          <div>
            <div class="ro-rate-big">${formatCurrency(o.monthly)}</div>
            <div class="ro-rate-sub">/ month</div>
          </div>
          <div>
            <div class="ro-rate-big">${formatCurrency(amount)}</div>
            <div class="ro-rate-sub">Loan Amount</div>
          </div>
        </div>
        <button class="btn ${isBest ? 'btn-primary' : 'btn-outline'} btn-sm"
          onclick="handleSelectOffer('${o.lender.name}', '${o.apr}', '${o.monthly}')">
          ${isBest ? 'Select Best Rate' : 'View Offer'}
        </button>
      </div>`;
  }).join('');

  const savings = (parseFloat(offers[offers.length - 1].apr) - parseFloat(offers[0].apr)).toFixed(2);

  return `
    <div class="results-header">
      <h2>&#127881; Your Personalized Offers Are Ready</h2>
      <p>${offers.length} lenders want to work with you — sorted by lowest rate. Choosing the best rate saves you up to <strong>${savings}% APR</strong>.</p>
    </div>
    <div class="results-grid">
      ${offerRows}
    </div>
    <p class="results-disclaimer">
      &#128274; Rates shown are pre-qualified estimates based on your inputs. Final rates confirmed after formal application.
      Checking these rates did <strong>not</strong> affect your credit score.
    </p>`;
}

// Make globally available for inline onclick
window.handleSelectOffer = function(lender, apr, monthly) {
  closeModal('resultsModal');
  showToast(`✓ Selected ${lender} at ${apr}% APR — ${formatCurrency(monthly)}/mo. Complete your application to get funded!`, 'success', 5000);
  Store.patch({ selectedOffer: { lender, apr, monthly, selectedAt: new Date().toISOString() } });
};

// ─────────────────────────────────────────────
// LOAN FORMS SUBMISSION
// ─────────────────────────────────────────────
(function initLoanForms() {
  $$('.loan-form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateForm(form)) return;

      const formType = form.dataset.type;
      const data     = Object.fromEntries(new FormData(form).entries());

      // Save to session
      Store.patch({ [`form_${formType}`]: data, lastFormType: formType });

      // Show loading state
      const btn = form.querySelector('[type=submit]');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span class="spinner">⏳</span> Checking rates…';
      btn.disabled  = true;

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled  = false;

        const offers  = generateOffers(formType, data);
        const content = $('#resultsContent');
        if (content) content.innerHTML = buildResultsHTML(formType, data, offers);
        openModal('resultsModal');

        Store.patch({ lastOffers: offers.map(o => ({ name: o.lender.name, apr: o.apr, monthly: o.monthly })) });
      }, 1800);
    });
  });
})();

// ─────────────────────────────────────────────
// AUTH MODAL
// ─────────────────────────────────────────────
(function initAuth() {
  const loginBtn       = $('#loginBtn');
  const getStartedBtn  = $('#getStartedBtn');
  const chatBtn        = $('#chatBtn');

  if (loginBtn)      loginBtn.addEventListener('click',      () => { openModal('authModal'); activateAuthTab('login'); });
  if (getStartedBtn) getStartedBtn.addEventListener('click', () => { openModal('authModal'); activateAuthTab('register'); });
  if (chatBtn)       chatBtn.addEventListener('click',       () => showToast('💬 Opening live chat… Our team is here 7 days a week!', 'info'));

  function activateAuthTab(name) {
    $$('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.authTab === name));
    $$('.auth-form').forEach(f => f.classList.toggle('active', f.dataset.authForm === name));
  }

  // Tab clicks
  $$('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => activateAuthTab(tab.dataset.authTab));
  });

  // Switch links inside forms
  document.addEventListener('click', (e) => {
    const sw = e.target.closest('[data-switch-auth]');
    if (!sw) return;
    e.preventDefault();
    activateAuthTab(sw.dataset.switchAuth);
  });

  // Login submit
  const loginForm = $('#loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateForm(loginForm)) return;
      const email = loginForm.querySelector('[name=email]').value;
      const users = Store.get().users || {};
      if (!users[email]) {
        showToast('No account found with that email. Please sign up first.', 'error');
        return;
      }
      // Password check (plain for demo — not for production)
      if (users[email].password !== loginForm.querySelector('[name=password]').value) {
        showToast('Incorrect password. Please try again.', 'error');
        return;
      }
      Store.patch({ currentUser: { email, name: users[email].name } });
      closeModal('authModal');
      showToast(`✓ Welcome back, ${users[email].name}!`, 'success');
      loginForm.reset();
      updateNavForLoggedIn(users[email].name);
    });
  }

  // Register submit
  const regForm = $('#registerForm');
  if (regForm) {
    regForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateForm(regForm)) return;
      const firstName = regForm.querySelector('[name=firstName]').value.trim();
      const lastName  = regForm.querySelector('[name=lastName]').value.trim();
      const email     = regForm.querySelector('[name=email]').value.trim();
      const password  = regForm.querySelector('[name=password]').value;
      const fullName  = `${firstName} ${lastName}`;

      const users = Store.get().users || {};
      if (users[email]) {
        showToast('An account with this email already exists. Please log in.', 'error');
        return;
      }
      users[email] = { name: fullName, firstName, lastName, password, createdAt: new Date().toISOString() };
      Store.patch({ users, currentUser: { email, name: fullName } });
      closeModal('authModal');
      showToast(`🎉 Account created! Welcome to Credible, ${firstName}!`, 'success', 4000);
      regForm.reset();
      updateNavForLoggedIn(fullName);
    });
  }

  // Restore session login state
  const session = Store.get();
  if (session.currentUser) updateNavForLoggedIn(session.currentUser.name);

  function updateNavForLoggedIn(name) {
    const btn = $('#loginBtn');
    if (btn) {
      btn.textContent = name.split(' ')[0];
      btn.onclick = () => {
        Store.patch({ currentUser: null });
        showToast('Signed out successfully.', 'info');
        btn.textContent = 'Log In';
        btn.onclick = () => { openModal('authModal'); activateAuthTab('login'); };
      };
    }
  }
})();

// ─────────────────────────────────────────────
// PASSWORD VISIBILITY TOGGLE
// ─────────────────────────────────────────────
(function initPasswordToggles() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.pwd-eye');
    if (!btn) return;
    const input = $(`#${btn.dataset.target}`);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    btn.textContent = input.type === 'password' ? '👁' : '🙈';
  });
})();

// ─────────────────────────────────────────────
// PASSWORD STRENGTH METER
// ─────────────────────────────────────────────
(function initPasswordStrength() {
  const input = $('#regPassword');
  const bar   = $('#pwdStrengthBar');
  const label = $('#pwdStrengthLabel');
  if (!input || !bar || !label) return;

  input.addEventListener('input', () => {
    const v = input.value;
    let score = 0;
    if (v.length >= 8)                         score++;
    if (v.length >= 12)                        score++;
    if (/[A-Z]/.test(v))                       score++;
    if (/[0-9]/.test(v))                       score++;
    if (/[^A-Za-z0-9]/.test(v))               score++;

    const levels = [
      { label: '',          color: 'transparent', w: '0%'   },
      { label: 'Weak',      color: '#DC2626',      w: '20%'  },
      { label: 'Fair',      color: '#D97706',      w: '40%'  },
      { label: 'Good',      color: '#F59E0B',      w: '60%'  },
      { label: 'Strong',    color: '#059669',      w: '80%'  },
      { label: 'Very Strong', color: '#047857',    w: '100%' },
    ];
    const lvl = levels[Math.min(score, 5)];
    bar.style.setProperty('--sw', lvl.w);
    bar.style.setProperty('--sc', lvl.color);
    label.textContent = lvl.label;
    label.style.color = lvl.color;
  });
})();

// ─────────────────────────────────────────────
// MODAL CLOSE — backdrop clicks + close buttons
// ─────────────────────────────────────────────
(function initModalClose() {
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-close]');
    if (target) closeModal(target.dataset.close);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $$('.modal.open').forEach(m => closeModal(m.id));
  });
})();

// ─────────────────────────────────────────────
// FAQ ACCORDION
// ─────────────────────────────────────────────
(function initFAQ() {
  $$('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item   = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      $$('.faq-item.open').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
})();

// ─────────────────────────────────────────────
// COUNTER ANIMATION
// ─────────────────────────────────────────────
(function initCounters() {
  const els = $$('[data-count]');
  if (!els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || entry.target._counted) return;
      entry.target._counted = true;
      animateCounter(entry.target);
    });
  }, { threshold: .5 });

  els.forEach(el => observer.observe(el));

  function animateCounter(el) {
    const target  = parseInt(el.dataset.count);
    const format  = el.dataset.format;
    const suffix  = el.dataset.suffix || '';
    const duration = 2000;
    const start    = performance.now();

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      const value    = Math.floor(eased * target);

      let display = '';
      if (format === 'compact')  display = formatCompact(value);
      else if (format === 'currency') display = formatCurrency(value);
      else if (format === 'decimal')  display = (value / 10).toFixed(1);
      else display = value.toLocaleString('en-US');

      el.textContent = display + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
})();

// ─────────────────────────────────────────────
// SCROLL ANIMATIONS (lightweight AOS-like)
// ─────────────────────────────────────────────
(function initAOS() {
  const els = $$('[data-aos]');
  if (!els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const delay = parseInt(entry.target.dataset.aosDelay || 0);
      setTimeout(() => entry.target.classList.add('aos-in'), delay);
      observer.unobserve(entry.target);
    });
  }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });

  els.forEach(el => observer.observe(el));
})();

// ─────────────────────────────────────────────
// LOAN CALCULATOR
// ─────────────────────────────────────────────
(function initCalculator() {
  const amountEl  = $('#calcAmount');
  const rateEl    = $('#calcRate');
  const termEl    = $('#calcTerm');
  const btn       = $('#calcBtn');
  const monthlyEl = $('#calcMonthly');
  const interestEl= $('#calcInterest');
  const totalEl   = $('#calcTotal');

  if (!amountEl) return;

  function calculate() {
    const principal = parseFloat(amountEl.value) || 0;
    const rate      = parseFloat(rateEl.value)   || 0;
    const months    = parseInt(termEl.value)      || 1;

    if (principal <= 0 || rate <= 0 || months <= 0) {
      showToast('Please enter valid values for all fields.', 'error');
      return;
    }

    const monthly  = parseFloat(calcMonthlyPayment(principal, rate, months));
    const total    = monthly * months;
    const interest = total - principal;

    // Animate display
    animateValue(monthlyEl, monthly, formatCurrency);
    animateValue(interestEl, interest, formatCurrency);
    animateValue(totalEl, total, formatCurrency);

    Store.patch({ lastCalc: { principal, rate, months, monthly, total, interest } });
  }

  function animateValue(el, target, fmt) {
    const start    = 0;
    const duration = 800;
    const startTs  = performance.now();
    function step(now) {
      const t = Math.min((now - startTs) / duration, 1);
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(Math.floor(e * target));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  btn.addEventListener('click', calculate);

  // Recalculate on Enter
  [amountEl, rateEl, termEl].forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') calculate(); });
  });

  // Initial calculation
  calculate();
})();

// ─────────────────────────────────────────────
// ACTIVE NAV LINK — highlight on scroll
// ─────────────────────────────────────────────
(function initActiveNavOnScroll() {
  const sections = $$('section[id]');
  if (!sections.length) return;

  const onScroll = () => {
    let current = '';
    sections.forEach(sec => {
      if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
    });
    $$('.nav-link[data-goto]').forEach(link => {
      link.classList.toggle('active', link.dataset.goto === current);
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
})();

// ─────────────────────────────────────────────
// FORM INPUT — live remove error on change
// ─────────────────────────────────────────────
(function initLiveValidation() {
  document.addEventListener('input', (e) => {
    const input = e.target;
    if (!input.classList.contains('has-error')) return;
    if (input.value.trim()) {
      input.classList.remove('has-error');
      const err = input.closest('.form-group')?.querySelector('.field-error');
      if (err) err.remove();
    }
  });
})();

// ─────────────────────────────────────────────
// SECTION SCROLL PROGRESS INDICATOR (subtle top bar)
// ─────────────────────────────────────────────
(function initScrollProgress() {
  const bar = document.createElement('div');
  bar.style.cssText = `
    position: fixed; top: 0; left: 0; height: 3px; width: 0%;
    background: linear-gradient(90deg, #1251AE, #60A5FA);
    z-index: 9999; transition: width .1s linear; pointer-events: none;
  `;
  document.body.appendChild(bar);

  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    const total    = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = total > 0 ? `${(scrolled / total) * 100}%` : '0%';
  }, { passive: true });
})();

// ─────────────────────────────────────────────
// STARTUP — log session info to console
// ─────────────────────────────────────────────
(function startup() {
  console.log('%cCredible Demo', 'font-size:1.4rem;font-weight:900;color:#1251AE');
  console.log('%cAll data stored in sessionStorage — cleared on refresh/tab close.', 'color:#6B7280');
  console.log('%cSession key: credible_session', 'color:#6B7280');
})();
