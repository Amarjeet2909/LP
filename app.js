'use strict';

/* ============================================================
   SESSION STORE - cleared on every page refresh
   ============================================================ */
var Store = {
  key: 'lightstream_session',
  get:   function() { try { return JSON.parse(sessionStorage.getItem(this.key)) || {}; } catch(e) { return {}; } },
  set:   function(d) { try { sessionStorage.setItem(this.key, JSON.stringify(d)); } catch(e) {} },
  patch: function(p) { var c = this.get(); Object.keys(p).forEach(function(k){ c[k]=p[k]; }); this.set(c); },
  clear: function() { sessionStorage.removeItem(this.key); }
};

/* ============================================================
   UTILS
   ============================================================ */
function qs(s,c)  { return (c||document).querySelector(s); }
function qsa(s,c) { return Array.prototype.slice.call((c||document).querySelectorAll(s)); }

function fmtMoney(n) {
  return '$' + Number(n).toLocaleString('en-US', {minimumFractionDigits:0, maximumFractionDigits:0});
}
function fmtCompact(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if (n >= 1000)    return Math.floor(n/1000) + 'K';
  return String(n);
}
function showToast(msg, type, ms) {
  var el = qs('#toast'); if (!el) return;
  el.textContent = msg;
  el.className = 'toast show toast-' + (type||'info');
  clearTimeout(el._t);
  el._t = setTimeout(function(){ el.className='toast'; }, ms||3500);
}
function openModal(id)  { var m=document.getElementById(id); if(!m) return; m.classList.add('open');    document.body.classList.add('no-scroll'); }
function closeModal(id) { var m=document.getElementById(id); if(!m) return; m.classList.remove('open'); if(!qsa('.modal.open').length) document.body.classList.remove('no-scroll'); }
function smoothTo(id)   { var el=document.getElementById(id); if(el) el.scrollIntoView({behavior:'smooth'}); }
function calcMonthly(p, apr, months) {
  var r = apr/100/12;
  if (r===0) return (p/months).toFixed(2);
  return (p * r * Math.pow(1+r,months) / (Math.pow(1+r,months)-1)).toFixed(2);
}

/* ============================================================
   VALIDATE FIELDS
   ============================================================ */
function validateFields(fields) {
  var valid = true;
  qsa('.field-error').forEach(function(e){ e.remove(); });
  qsa('.has-error').forEach(function(e){ e.classList.remove('has-error'); });
  fields.forEach(function(input) {
    if (!input) return;
    var val = input.value.trim(), msg = '';
    if (input.type==='checkbox') {
      if (!input.checked) msg = 'Required.';
    } else if (!val) {
      msg = 'This field is required.';
    } else if (input.type==='email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      msg = 'Enter a valid email.';
    } else if (input.minLength>0 && val.length<input.minLength) {
      msg = 'Min '+input.minLength+' characters.';
    } else if (input.type==='number') {
      var n=parseFloat(val);
      if (isNaN(n)) msg='Enter a valid number.';
      else if (input.min && n<parseFloat(input.min)) msg='Min value '+fmtMoney(input.min)+'.';
      else if (input.max && n>parseFloat(input.max)) msg='Max value '+fmtMoney(input.max)+'.';
    } else if (input.pattern && !(new RegExp('^'+input.pattern+'$').test(val))) {
      msg = 'Enter a valid value.';
    }
    if (msg) {
      valid = false;
      input.classList.add('has-error');
      var err = document.createElement('div');
      err.className = 'field-error';
      err.textContent = '\u26A0 ' + msg;
      var grp = input.closest('.form-group')||input.parentNode;
      if (grp) grp.appendChild(err);
    }
  });
  return valid;
}

/* ============================================================
   MAIN
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {

  /* ?? LOADER (index only) ?? */
  var loader = qs('#loader');
  if (loader) setTimeout(function(){ loader.classList.add('hidden'); }, 1400);

  /* ?? HEADER SCROLL SHADOW ?? */
  var header = qs('#header');
  if (header) {
    var onScroll = function() {
      header.classList.toggle('scrolled', window.scrollY > 20);
      var btt = qs('#backToTop');
      if (btt) btt.classList.toggle('visible', window.scrollY > 400);
    };
    window.addEventListener('scroll', onScroll, {passive:true});
    onScroll();
  }

  /* ?? HAMBURGER ?? */
  var hamburger = qs('#hamburger');
  var navMenu   = qs('#navMenu');
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', function() {
      var open = hamburger.classList.toggle('open');
      navMenu.classList.toggle('open', open);
    });
    document.addEventListener('click', function(e) {
      if (header && !header.contains(e.target)) {
        hamburger.classList.remove('open');
        navMenu.classList.remove('open');
      }
    });
  }

  /* ?? MOBILE DROPDOWNS ?? */
  qsa('.has-dropdown button.nav-link').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      if (window.innerWidth > 860) return;
      e.stopPropagation();
      var item = btn.closest('.has-dropdown');
      var was  = item.classList.contains('dd-open');
      qsa('.has-dropdown').forEach(function(i){ i.classList.remove('dd-open'); });
      if (!was) item.classList.add('dd-open');
    });
  });

  /* ?? BACK TO TOP ?? */
  var btt = qs('#backToTop');
  if (btt) btt.addEventListener('click', function(){ window.scrollTo({top:0,behavior:'smooth'}); });

  /* ?? SMOOTH SCROLL [data-goto] ?? */
  document.addEventListener('click', function(e) {
    var el = e.target.closest('[data-goto]');
    if (el) { e.preventDefault(); smoothTo(el.dataset.goto); }
  });

  /* ?? FAQ ACCORDION ?? */
  qsa('.faq-item').forEach(function(item) {
    var btn = item.querySelector('.faq-q');
    if (!btn) return;
    btn.addEventListener('click', function() {
      var isOpen = item.classList.contains('open');
      qsa('.faq-item.open').forEach(function(i){ i.classList.remove('open'); });
      if (!isOpen) item.classList.add('open');
    });
  });

  /* ?? MODAL CLOSE ?? */
  document.addEventListener('click', function(e) {
    var t = e.target.closest('[data-close]');
    if (t) closeModal(t.dataset.close);
  });
  document.addEventListener('keydown', function(e) {
    if (e.key==='Escape') qsa('.modal.open').forEach(function(m){ closeModal(m.id); });
  });

  /* ?? AUTH MODAL ?? */
  function activateAuthTab(name) {
    qsa('.auth-tab').forEach(function(t){  t.classList.toggle('active', t.dataset.authTab  === name); });
    qsa('.auth-form').forEach(function(f){ f.classList.toggle('active', f.dataset.authForm === name); });
  }
  var loginBtn  = qs('#loginBtn');
  var chatBtn   = qs('#chatBtn');
  if (loginBtn) loginBtn.addEventListener('click', function(){ openModal('authModal'); activateAuthTab('login'); });
  if (chatBtn)  chatBtn.addEventListener('click',  function(){ showToast('\uD83D\uDCAC Connecting to live chat\u2026 Our team is available Mon\u2013Fri 9AM\u20138PM ET', 'info', 4000); });

  qsa('.auth-tab').forEach(function(tab) {
    tab.addEventListener('click', function(){ activateAuthTab(tab.dataset.authTab); });
  });
  document.addEventListener('click', function(e) {
    var sw = e.target.closest('[data-switch-auth]');
    if (!sw) return;
    e.preventDefault();
    activateAuthTab(sw.dataset.switchAuth);
  });

  /* ?? LOGIN ?? */
  var loginForm = qs('#loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var email = loginForm.querySelector('[name=email]').value;
      var pass  = loginForm.querySelector('[name=password]').value;
      var users = Store.get().users || {};
      if (!users[email])                   { showToast('No account found. Please create one.','error'); return; }
      if (users[email].password !== pass)  { showToast('Incorrect password. Please try again.','error'); return; }
      Store.patch({currentUser:{email:email,name:users[email].name}});
      closeModal('authModal');
      showToast('\u2713 Welcome back, ' + users[email].name + '!', 'success');
      loginForm.reset();
      updateNavUser(users[email].name);
    });
  }

  /* ?? REGISTER ?? */
  var regForm = qs('#registerForm');
  if (regForm) {
    regForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var fn    = regForm.querySelector('[name=firstName]').value.trim();
      var ln    = regForm.querySelector('[name=lastName]').value.trim();
      var email = regForm.querySelector('[name=email]').value.trim();
      var pass  = regForm.querySelector('[name=password]').value;
      var terms = regForm.querySelector('[name=terms]').checked;
      if (!fn||!ln||!email||!pass) { showToast('Please fill in all fields.','error'); return; }
      if (!terms) { showToast('Please accept the Terms to continue.','error'); return; }
      var users = Store.get().users || {};
      if (users[email]) { showToast('Account already exists. Please sign in.','error'); return; }
      users[email] = {name:fn+' '+ln, firstName:fn, lastName:ln, password:pass};
      Store.patch({users:users, currentUser:{email:email,name:fn+' '+ln}});
      closeModal('authModal');
      showToast('\uD83C\uDF89 Welcome to LightStream, '+fn+'!', 'success', 4000);
      regForm.reset();
      updateNavUser(fn+' '+ln);
    });
  }

  /* ?? RESTORE SESSION USER ?? */
  var cu = Store.get().currentUser;
  if (cu) updateNavUser(cu.name);

  function updateNavUser(name) {
    var btn = qs('#loginBtn'); if (!btn) return;
    btn.textContent = name.split(' ')[0];
    btn.onclick = function() {
      Store.patch({currentUser:null});
      showToast('Signed out successfully.','info');
      btn.textContent = 'Sign In';
      btn.onclick = function(){ openModal('authModal'); activateAuthTab('login'); };
    };
  }

  /* ?? PASSWORD TOGGLE ?? */
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.pwd-eye'); if (!btn) return;
    var input = document.getElementById(btn.dataset.target); if (!input) return;
    input.type      = input.type==='password' ? 'text' : 'password';
    btn.textContent = input.type==='password' ? '\uD83D\uDC41' : '\uD83D\uDE48';
  });

  /* ?? PASSWORD STRENGTH ?? */
  var pwdInput = qs('#regPassword');
  var pwdBar   = qs('#pwdStrengthBar');
  var pwdLbl   = qs('#pwdStrengthLabel');
  if (pwdInput && pwdBar && pwdLbl) {
    var levels = [
      {label:'',           color:'transparent',w:'0%'},
      {label:'Weak',       color:'#DC2626',    w:'20%'},
      {label:'Fair',       color:'#D97706',    w:'40%'},
      {label:'Good',       color:'#F59E0B',    w:'60%'},
      {label:'Strong',     color:'#059669',    w:'80%'},
      {label:'Very Strong',color:'#047857',    w:'100%'}
    ];
    pwdInput.addEventListener('input', function() {
      var v=pwdInput.value, s=0;
      if(v.length>=8) s++; if(v.length>=12) s++;
      if(/[A-Z]/.test(v)) s++; if(/[0-9]/.test(v)) s++; if(/[^A-Za-z0-9]/.test(v)) s++;
      var lvl=levels[Math.min(s,5)];
      pwdBar.style.setProperty('--sw',lvl.w); pwdBar.style.setProperty('--sc',lvl.color);
      pwdLbl.textContent=lvl.label; pwdLbl.style.color=lvl.color;
    });
  }

  /* ?? COUNTER ANIMATION ?? */
  var cEls = qsa('[data-count]');
  if (cEls.length && window.IntersectionObserver) {
    var cObs = new IntersectionObserver(function(entries) {
      entries.forEach(function(en) {
        if (!en.isIntersecting || en.target._done) return;
        en.target._done = true;
        var el=en.target, target=parseInt(el.dataset.count),
            fmt=el.dataset.format, sfx=el.dataset.suffix||'',
            t0=performance.now(), dur=2000;
        (function step(now) {
          var p=Math.min((now-t0)/dur,1), e=1-Math.pow(1-p,3), val=Math.floor(e*target), txt='';
          if(fmt==='compact')      txt=fmtCompact(val);
          else if(fmt==='currency')txt=fmtMoney(val);
          else if(fmt==='decimal') txt=(val/10).toFixed(1);
          else txt=val.toLocaleString('en-US');
          el.textContent=txt+sfx;
          if(p<1) requestAnimationFrame(step);
        })(performance.now());
      });
    }, {threshold:0.5});
    cEls.forEach(function(el){ cObs.observe(el); });
  }

  /* ?? SCROLL ANIMATIONS [data-aos] ?? */
  var aEls = qsa('[data-aos]');
  if (aEls.length && window.IntersectionObserver) {
    var aObs = new IntersectionObserver(function(entries) {
      entries.forEach(function(en) {
        if (!en.isIntersecting) return;
        var delay=parseInt(en.target.dataset.aosDelay||0);
        setTimeout(function(){ en.target.classList.add('aos-in'); }, delay);
        aObs.unobserve(en.target);
      });
    }, {threshold:0.12, rootMargin:'0px 0px -40px 0px'});
    aEls.forEach(function(el){ aObs.observe(el); });
  }

  /* ?? CALCULATOR (index.html) ?? */
  var calcA   = qs('#calcAmount');
  var calcR   = qs('#calcRate');
  var calcT   = qs('#calcTerm');
  var calcBtn = qs('#calcBtn');
  var calcM   = qs('#calcMonthly');
  var calcI   = qs('#calcInterest');
  var calcTot = qs('#calcTotal');

  function doCalc() {
    var p=parseFloat(calcA.value)||0, r=parseFloat(calcR.value)||0, m=parseInt(calcT.value)||1;
    if(p<=0||r<=0||m<=0){ showToast('Enter valid values.','error'); return; }
    var monthly=parseFloat(calcMonthly(p,r,m)), total=monthly*m, interest=total-p;
    function animNum(el,target) {
      var t0=performance.now();
      (function step(now){
        var pct=Math.min((now-t0)/700,1), e=1-Math.pow(1-pct,3);
        el.textContent=fmtMoney(Math.floor(e*target));
        if(pct<1) requestAnimationFrame(step);
      })(performance.now());
    }
    if(calcM)   animNum(calcM, monthly);
    if(calcI)   animNum(calcI, interest);
    if(calcTot) animNum(calcTot, total);
  }
  if (calcA && calcBtn) {
    calcBtn.addEventListener('click', doCalc);
    [calcA,calcR,calcT].forEach(function(el){ el.addEventListener('keydown',function(e){if(e.key==='Enter')doCalc();}); });
    doCalc();
  }

  /* ?? SCROLL PROGRESS BAR ?? */
  var pBar = document.createElement('div');
  pBar.style.cssText='position:fixed;top:0;left:0;height:3px;width:0%;background:linear-gradient(90deg,#00853e,#6ee09e);z-index:9999;pointer-events:none;transition:width .1s linear;';
  document.body.appendChild(pBar);
  window.addEventListener('scroll', function() {
    var s=window.scrollY, tot=document.documentElement.scrollHeight-window.innerHeight;
    pBar.style.width = tot>0 ? ((s/tot)*100)+'%' : '0%';
  }, {passive:true});

  /* ?? LIVE VALIDATION CLEAR ?? */
  document.addEventListener('input', function(e) {
    var input=e.target; if(!input.classList.contains('has-error')) return;
    if(input.value.trim()) {
      input.classList.remove('has-error');
      var grp=input.closest&&input.closest('.form-group');
      var err=grp&&grp.querySelector('.field-error');
      if(err) err.remove();
    }
  });

  /* ============================================================
     MULTI-STEP WIZARD (apply.html only)
     ============================================================ */
  var wizardCard = qs('#wizardCard');
  if (!wizardCard) return; /* not on apply page */

  /* Wizard state */
  var wiz = {
    step:    1,
    total:   6,
    purpose: 'Home Improvement',
    amount:  25000,
    term:    60,
    credit:  'good',
    hasCoApp: false,
    personal: {},
    coApp:    {}
  };

  /* ============================================================
     MULTI-STEP WIZARD (apply.html only)
     ============================================================ */
  var wizardCard = qs('#wizardCard');
  if (!wizardCard) return; /* not on apply page */

  var FIXED_APR = 9.99;
  var WIZ_TOTAL = 5; /* steps before thank-you */

  /* Wizard state */
  var wiz = {
    step:    1,
    purpose: 'Home Improvement',
    amount:  25000,
    term:    60,
    personal: {}
  };

  /* Navigation helpers */
  function goToStep(n, rev) {
    var oldPanel = qs('#panel-' + wiz.step);
    var newPanel = qs('#panel-' + n);
    if (!oldPanel || !newPanel) return;
    oldPanel.classList.remove('active');
    newPanel.classList.remove('rev');
    if (rev) newPanel.classList.add('rev');
    newPanel.classList.add('active');
    wiz.step = n;
    updateStepIndicators();
    qs('#wizardCard').scrollIntoView({behavior:'smooth', block:'start'});
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function updateStepIndicators() {
    for (var i = 1; i <= 6; i++) {
      var ind = qs('#step-indicator-' + i);
      if (!ind) continue;
      ind.classList.remove('active', 'completed');
      if (i < wiz.step)        ind.classList.add('completed');
      else if (i === wiz.step) ind.classList.add('active');
      if (wiz.step === 6 && i === 6) { ind.classList.remove('active'); ind.classList.add('completed'); }
    }
  }

  /* === STEP 1 - Purpose === */
  var purposeOpts = qsa('.purpose-opt', qs('#purposeGrid'));
  purposeOpts.forEach(function(opt) {
    opt.addEventListener('click', function() {
      purposeOpts.forEach(function(o){ o.classList.remove('selected'); });
      opt.classList.add('selected');
      wiz.purpose = opt.dataset.value;
    });
  });
  qs('#next-1').addEventListener('click', function() { goToStep(2); });

  /* === STEP 2 - Amount === */
  var amountSlider  = qs('#amountSlider');
  var amountInput   = qs('#amountInput');
  var amountDisplay = qs('#amountDisplay');

  function syncAmount(val) {
    val = Math.min(100000, Math.max(5000, parseInt(val) || 5000));
    wiz.amount = val;
    if (amountDisplay) amountDisplay.textContent = fmtMoney(val);
    if (amountSlider)  amountSlider.value = val;
    if (amountInput)   amountInput.value  = val;
    updateEstPayment();
  }
  if (amountSlider) amountSlider.addEventListener('input', function(){ syncAmount(this.value); });
  if (amountInput)  amountInput.addEventListener('input',  function(){ syncAmount(this.value); });

  qs('#back-2').addEventListener('click', function(){ goToStep(1, true); });
  qs('#next-2').addEventListener('click', function() {
    var val = parseInt((amountInput || {}).value) || 0;
    if (val < 5000 || val > 100000) { showToast('Please enter an amount between $5,000 and $100,000.', 'error'); return; }
    wiz.amount = val;
    goToStep(3);
  });

  /* === STEP 3 - Term === */
  var termOpts = qsa('.term-opt', qs('#termGrid'));

  function updateEstPayment() {
    var el = qs('#estPaymentVal'); if (!el) return;
    el.textContent = fmtMoney(parseFloat(calcMonthly(wiz.amount, FIXED_APR, wiz.term)));
  }

  termOpts.forEach(function(opt) {
    opt.addEventListener('click', function() {
      termOpts.forEach(function(o){ o.classList.remove('selected'); });
      opt.classList.add('selected');
      wiz.term = parseInt(opt.dataset.value);
      updateEstPayment();
    });
  });
  updateEstPayment();

  qs('#back-3').addEventListener('click', function(){ goToStep(2, true); });
  qs('#next-3').addEventListener('click', function(){ goToStep(4); });

  /* === DOB dropdowns === */
  (function initDOB() {
    var selDay  = qs('#f-dob-day');
    var selYear = qs('#f-dob-year');
    if (!selDay || !selYear) return;

    /* Fill days 1-31 */
    for (var d = 1; d <= 31; d++) {
      var o = document.createElement('option');
      o.value = (d < 10 ? '0' : '') + d;
      o.textContent = d;
      selDay.appendChild(o);
    }

    /* Fill years — current year down to 1930 */
    var curYear = new Date().getFullYear();
    for (var y = curYear - 18; y >= 1930; y--) {
      var oy = document.createElement('option');
      oy.value = y;
      oy.textContent = y;
      selYear.appendChild(oy);
    }

    /* Update day count when month/year changes */
    function updateDays() {
      var m = parseInt(qs('#f-dob-month').value) || 0;
      var y = parseInt(selYear.value) || 2000;
      var prev = selDay.value;
      var max = m ? new Date(y, m, 0).getDate() : 31;
      /* remove options beyond max */
      while (selDay.options.length > 1) selDay.remove(1);
      for (var dd = 1; dd <= max; dd++) {
        var od = document.createElement('option');
        od.value = (dd < 10 ? '0' : '') + dd;
        od.textContent = dd;
        selDay.appendChild(od);
      }
      selDay.value = prev <= max ? prev : '';
    }
    qs('#f-dob-month').addEventListener('change', updateDays);
    selYear.addEventListener('change', updateDays);
  })();

  /* SSN auto-format: 123-45-6789 */
  var ssnInput = qs('#f-ssn');
  if (ssnInput) {
    ssnInput.addEventListener('input', function() {
      var raw = this.value.replace(/\D/g, '').substring(0, 9);
      var fmt = raw;
      if (raw.length > 5) fmt = raw.slice(0,3) + '-' + raw.slice(3,5) + '-' + raw.slice(5);
      else if (raw.length > 3) fmt = raw.slice(0,3) + '-' + raw.slice(3);
      this.value = fmt;
    });
  }

  /* Phone auto-format */
  var phoneInput = qs('#f-phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', function() {
      var raw = this.value.replace(/\D/g, '').substring(0, 10);
      var fmt = raw;
      if (raw.length > 6) fmt = '(' + raw.slice(0,3) + ') ' + raw.slice(3,6) + '-' + raw.slice(6);
      else if (raw.length > 3) fmt = '(' + raw.slice(0,3) + ') ' + raw.slice(3);
      else if (raw.length > 0) fmt = '(' + raw;
      this.value = fmt;
    });
  }

  /* === STEP 4 - Personal Info === */
  qs('#back-4').addEventListener('click', function(){ goToStep(3, true); });
  qs('#next-4').addEventListener('click', function() {
    /* Validate DOB */
    var dobM = qs('#f-dob-month').value;
    var dobD = qs('#f-dob-day').value;
    var dobY = qs('#f-dob-year').value;

    var fields = [
      qs('#f-firstName'), qs('#f-lastName'), qs('#f-email'), qs('#f-phone'),
      qs('#f-employment'), qs('#f-ssn'), qs('#f-bank'), qs('#f-banking-age'),
      qs('#f-address'), qs('#f-city'), qs('#f-state'), qs('#f-zip')
    ];
    var ok = validateFields(fields);
    if (!dobM || !dobD || !dobY) {
      ok = false;
      showToast('Please select your full date of birth.', 'error');
    }
    if (!ok) { if (dobM && dobD && dobY) showToast('Please fill in all required fields.', 'error'); return; }

    /* Age check */
    var dob = new Date(parseInt(dobY), parseInt(dobM) - 1, parseInt(dobD));
    var age = (new Date() - dob) / (365.25 * 24 * 3600 * 1000);
    if (age < 18) { showToast('You must be 18 or older to apply.', 'error'); return; }

    wiz.personal = {
      firstName:   qs('#f-firstName').value.trim(),
      lastName:    qs('#f-lastName').value.trim(),
      email:       qs('#f-email').value.trim(),
      phone:       qs('#f-phone').value.trim(),
      dob:         dobM + '/' + dobD + '/' + dobY,
      employment:  qs('#f-employment').value,
      ssn:         qs('#f-ssn').value,
      bank:        qs('#f-bank').value,
      bankingAge:  qs('#f-banking-age').value,
      address:     qs('#f-address').value.trim(),
      city:        qs('#f-city').value.trim(),
      state:       qs('#f-state').value,
      zip:         qs('#f-zip').value.trim()
    };
    buildReview();
    goToStep(5);
  });

  /* === STEP 5 - Review === */
  function maskSSN(ssn) {
    var clean = (ssn || '').replace(/\D/g, '');
    return '\u2022\u2022\u2022-\u2022\u2022-' + (clean.slice(-4) || '????');
  }
  function bankingAgeLabel(val) {
    var map = {'lt1':'Less than 1 year','1-2':'1 - 2 years','3-5':'3 - 5 years','6-10':'6 - 10 years','10+':'10+ years'};
    return map[val] || val;
  }

  function buildReview() {
    var monthly = fmtMoney(parseFloat(calcMonthly(wiz.amount, FIXED_APR, wiz.term)));
    var loanFields = [
      {label:'Loan Purpose',    value: wiz.purpose},
      {label:'Loan Amount',     value: fmtMoney(wiz.amount)},
      {label:'Loan Term',       value: Math.round(wiz.term / 12) + ' Years (' + wiz.term + ' mo)'},
      {label:'Fixed APR',       value: FIXED_APR + '%'},
      {label:'Est. Monthly',    value: monthly + '/mo'},
      {label:'Total Repayable', value: fmtMoney(parseFloat(calcMonthly(wiz.amount, FIXED_APR, wiz.term)) * wiz.term)}
    ];
    var personalFields = [
      {label:'Full Name',    value: wiz.personal.firstName + ' ' + wiz.personal.lastName},
      {label:'Email',        value: wiz.personal.email},
      {label:'Phone',        value: wiz.personal.phone},
      {label:'Date of Birth',value: wiz.personal.dob},
      {label:'Employment',   value: wiz.personal.employment},
      {label:'SSN',          value: maskSSN(wiz.personal.ssn)},
      {label:'Bank',         value: wiz.personal.bank},
      {label:'Banking Since',value: bankingAgeLabel(wiz.personal.bankingAge)},
      {label:'Address',      value: wiz.personal.address + ', ' + wiz.personal.city + ', ' + wiz.personal.state + ' ' + wiz.personal.zip}
    ];
    function renderGrid(id, fields) {
      var grid = qs('#' + id); if (!grid) return;
      grid.innerHTML = fields.map(function(f) {
        return '<div class="wiz-review-field"><div class="wiz-rf-label">' + f.label + '</div><div class="wiz-rf-value">' + f.value + '</div></div>';
      }).join('');
    }
    renderGrid('reviewLoanGrid', loanFields);
    renderGrid('reviewPersonalGrid', personalFields);
  }

  qs('#back-5').addEventListener('click', function(){ goToStep(4, true); });

  qs('#submitBtn').addEventListener('click', function() {
    var consent = qs('#consentCheck');
    if (!consent || !consent.checked) { showToast('Please agree to the terms to continue.', 'error'); return; }

    var btn = qs('#submitBtn');
    btn.innerHTML = '&#9203; Processing your application...';
    btn.disabled = true;

    Store.patch({ application: {
      purpose: wiz.purpose, amount: wiz.amount, term: wiz.term, apr: FIXED_APR,
      personal: Object.assign({}, wiz.personal, {ssn: '***-**-' + (wiz.personal.ssn || '').replace(/\D/g,'').slice(-4)}),
      submittedAt: new Date().toISOString()
    }});

    setTimeout(function() {
      buildThankYou();
      goToStep(6);
    }, 2400);
  });

  /* === STEP 6 - Thank You === */
  function buildThankYou() {
    var container = qs('#thankYouScreen'); if (!container) return;
    var monthly   = fmtMoney(parseFloat(calcMonthly(wiz.amount, FIXED_APR, wiz.term)));
    var totalYrs  = Math.round(wiz.term / 12);
    var refNum    = 'LS-' + Date.now().toString(36).toUpperCase().slice(-8);

    container.innerHTML =
      '<div class="ty-confetti" id="tyConfetti"></div>' +
      '<div class="ty-icon-wrap"><div class="ty-check-ring"><div class="ty-check">&#10003;</div></div></div>' +
      '<div class="ty-badge">Application Submitted!</div>' +
      '<h2 class="ty-title">You\'re All Set, ' + wiz.personal.firstName + '!</h2>' +
      '<p class="ty-sub">Your LightStream loan application has been received and is being reviewed. We\'ll contact you at <strong>' + wiz.personal.email + '</strong> within 1 business day.</p>' +

      '<div class="ty-ref-box">' +
        '<div class="ty-ref-label">Application Reference Number</div>' +
        '<div class="ty-ref-num">' + refNum + '</div>' +
      '</div>' +

      '<div class="ty-loan-summary">' +
        '<div class="ty-ls-item">' +
          '<div class="ty-ls-icon">&#128176;</div>' +
          '<div class="ty-ls-val">' + fmtMoney(wiz.amount) + '</div>' +
          '<div class="ty-ls-lbl">Loan Amount</div>' +
        '</div>' +
        '<div class="ty-ls-divider"></div>' +
        '<div class="ty-ls-item">' +
          '<div class="ty-ls-icon">&#128200;</div>' +
          '<div class="ty-ls-val">' + FIXED_APR + '%</div>' +
          '<div class="ty-ls-lbl">Fixed APR</div>' +
        '</div>' +
        '<div class="ty-ls-divider"></div>' +
        '<div class="ty-ls-item">' +
          '<div class="ty-ls-icon">&#128197;</div>' +
          '<div class="ty-ls-val">' + monthly + '</div>' +
          '<div class="ty-ls-lbl">Est. / Month</div>' +
        '</div>' +
        '<div class="ty-ls-divider"></div>' +
        '<div class="ty-ls-item">' +
          '<div class="ty-ls-icon">&#8987;</div>' +
          '<div class="ty-ls-val">' + totalYrs + ' yr' + (totalYrs > 1 ? 's' : '') + '</div>' +
          '<div class="ty-ls-lbl">Loan Term</div>' +
        '</div>' +
      '</div>' +

      '<div class="ty-steps-title">What happens next?</div>' +
      '<div class="ty-next-steps">' +
        '<div class="ty-ns-item"><div class="ty-ns-num">1</div><div><strong>Application Review</strong><p>Our team reviews your application, typically within 1 business day.</p></div></div>' +
        '<div class="ty-ns-item"><div class="ty-ns-num">2</div><div><strong>Identity Verification</strong><p>We may contact you to verify a few details by email or phone.</p></div></div>' +
        '<div class="ty-ns-item"><div class="ty-ns-num">3</div><div><strong>Approval &amp; Funding</strong><p>Once approved, funds are deposited directly into your bank account &mdash; often same business day.</p></div></div>' +
      '</div>' +

      '<div class="ty-actions">' +
        '<a href="index.html" class="btn btn-green btn-lg">&#8592; Back to LightStream</a>' +
        '<button class="btn btn-outline-green btn-lg" onclick="window.print()">&#128438; Save / Print</button>' +
      '</div>' +

      '<p class="ty-disclaimer">Questions? Call us at <strong>1-800-708-1373</strong> Mon&ndash;Fri 9AM&ndash;8PM ET &middot; Ref: ' + refNum + '</p>';

    /* Simple confetti burst */
    spawnConfetti(qs('#tyConfetti'));
  }

  function spawnConfetti(container) {
    if (!container) return;
    var colors = ['#00853e','#003057','#6ee09e','#c8962a','#007a8c','#e87722'];
    for (var i = 0; i < 60; i++) {
      (function(i) {
        setTimeout(function() {
          var el = document.createElement('div');
          el.className = 'ty-piece';
          el.style.cssText = [
            'left:' + (Math.random() * 100) + '%',
            'background:' + colors[Math.floor(Math.random() * colors.length)],
            'width:' + (6 + Math.random() * 8) + 'px',
            'height:' + (10 + Math.random() * 8) + 'px',
            'border-radius:' + (Math.random() > .5 ? '50%' : '2px'),
            'animation-duration:' + (0.9 + Math.random() * 1.4) + 's',
            'animation-delay:' + (Math.random() * 0.5) + 's'
          ].join(';');
          container.appendChild(el);
          setTimeout(function(){ el.remove(); }, 2500);
        }, i * 30);
      })(i);
    }
  }

  /* Init */
  updateStepIndicators();
  updateEstPayment();

}); /* end DOMContentLoaded */
