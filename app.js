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
   MOCK RATE ENGINE
   ============================================================ */
var LENDERS = [
  {name:'LightStream',   code:'LS', cls:'wiz-av-g', note:'Best Rate Available'},
  {name:'SoFi',          code:'SF', cls:'wiz-av-n', note:''},
  {name:'Marcus by GS',  code:'MK', cls:'wiz-av-t', note:''},
  {name:'Discover',      code:'DC', cls:'wiz-av-n', note:''},
  {name:'Upgrade',       code:'UP', cls:'wiz-av-t', note:''}
];
var CREDIT_MULT = {excellent:1.0, good:1.12, fair:1.28, poor:1.55};
var BASE_APR = 6.94;

function generateOffers(data) {
  var mult   = CREDIT_MULT[data.credit] || 1.2;
  var amount = parseFloat(data.amount) || 25000;
  var term   = parseInt(data.term)     || 60;
  return LENDERS.map(function(lender, i) {
    var apr     = +(BASE_APR * mult + Math.random()*1.8*mult + i*0.95).toFixed(2);
    var monthly = calcMonthly(amount, apr, term);
    return {lender:lender, apr:apr, monthly:monthly, amount:amount, term:term};
  }).sort(function(a,b){ return a.apr-b.apr; });
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

  /* ??? Navigation helpers ??? */
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
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function updateStepIndicators() {
    for (var i=1; i<=7; i++) {
      var ind = qs('#step-indicator-' + i);
      if (!ind) continue;
      ind.classList.remove('active','completed');
      if (i < wiz.step)       ind.classList.add('completed');
      else if (i === wiz.step) ind.classList.add('active');
      /* Mark step 7 (results) complete when on it */
      if (wiz.step === 7 && i === 7) { ind.classList.remove('active'); ind.classList.add('completed'); }
    }
  }

  /* ??? STEP 1 - Purpose ??? */
  var purposeOpts = qsa('.purpose-opt', qs('#purposeGrid'));
  purposeOpts.forEach(function(opt) {
    opt.addEventListener('click', function() {
      purposeOpts.forEach(function(o){ o.classList.remove('selected'); });
      opt.classList.add('selected');
      wiz.purpose = opt.dataset.value;
    });
  });

  qs('#next-1').addEventListener('click', function() {
    goToStep(2);
  });

  /* ??? STEP 2 - Amount ??? */
  var amountSlider = qs('#amountSlider');
  var amountInput  = qs('#amountInput');
  var amountDisplay= qs('#amountDisplay');

  function syncAmount(val) {
    val = Math.min(100000, Math.max(5000, parseInt(val)||5000));
    wiz.amount = val;
    if (amountDisplay) amountDisplay.textContent = fmtMoney(val);
    if (amountSlider)  amountSlider.value = val;
    if (amountInput)   amountInput.value  = val;
    updateEstPayment();
  }

  if (amountSlider) {
    amountSlider.addEventListener('input', function(){ syncAmount(this.value); });
  }
  if (amountInput) {
    amountInput.addEventListener('input', function(){ syncAmount(this.value); });
  }

  qs('#back-2').addEventListener('click', function(){ goToStep(1, true); });
  qs('#next-2').addEventListener('click', function() {
    var val = parseInt(amountInput.value)||0;
    if (val < 5000 || val > 100000) {
      showToast('Please enter an amount between $5,000 and $100,000.', 'error');
      return;
    }
    wiz.amount = val;
    goToStep(3);
  });

  /* ??? STEP 3 - Term ??? */
  var termOpts = qsa('.term-opt', qs('#termGrid'));

  function updateEstPayment() {
    var el = qs('#estPaymentVal'); if (!el) return;
    var monthly = calcMonthly(wiz.amount, 7.49, wiz.term);
    el.textContent = fmtMoney(parseFloat(monthly));
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
  qs('#next-3').addEventListener('click', function(){
    goToStep(4);
  });

  /* ??? STEP 4 - Personal Info ??? */
  qs('#back-4').addEventListener('click', function(){ goToStep(3, true); });
  qs('#next-4').addEventListener('click', function() {
    var fields = [
      qs('#f-firstName'), qs('#f-lastName'), qs('#f-email'),
      qs('#f-dob'), qs('#f-phone'), qs('#f-income'),
      qs('#f-employment'), qs('#f-credit'), qs('#f-zip')
    ];
    if (!validateFields(fields)) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    wiz.credit = qs('#f-credit').value;
    wiz.personal = {
      firstName:  qs('#f-firstName').value.trim(),
      lastName:   qs('#f-lastName').value.trim(),
      email:      qs('#f-email').value.trim(),
      dob:        qs('#f-dob').value,
      phone:      qs('#f-phone').value.trim(),
      income:     qs('#f-income').value,
      employment: qs('#f-employment').value,
      credit:     qs('#f-credit').value,
      zip:        qs('#f-zip').value.trim()
    };
    goToStep(5);
  });

  /* ??? STEP 5 - Co-Applicant ??? */
  var coChoices = qsa('[data-co]', qs('#coApplicantChoice'));
  var coFields  = qs('#coApplicantFields');

  function setCoChoice(val) {
    wiz.hasCoApp = (val === 'yes');
    coChoices.forEach(function(c){ c.classList.toggle('selected', c.dataset.co === val); });
    if (coFields) coFields.style.display = wiz.hasCoApp ? 'block' : 'none';
  }
  setCoChoice('yes'); /* default */

  coChoices.forEach(function(c) {
    c.addEventListener('click', function(){ setCoChoice(c.dataset.co); });
  });

  qs('#back-5').addEventListener('click', function(){ goToStep(4, true); });
  qs('#next-5').addEventListener('click', function() {
    if (wiz.hasCoApp) {
      wiz.coApp = {
        firstName:    (qs('#co-firstName')||{}).value||'',
        lastName:     (qs('#co-lastName')||{}).value||'',
        email:        (qs('#co-email')||{}).value||'',
        relationship: (qs('#co-relationship')||{}).value||'',
        income:       (qs('#co-income')||{}).value||''
      };
    }
    buildReview();
    goToStep(6);
  });

  /* ??? STEP 6 - Review ??? */
  function buildReview() {
    var loanFields = [
      {label:'Loan Purpose',  value: wiz.purpose},
      {label:'Loan Amount',   value: fmtMoney(wiz.amount)},
      {label:'Loan Term',     value: Math.round(wiz.term/12) + ' Years (' + wiz.term + ' months)'},
      {label:'Credit Profile',value: wiz.credit.charAt(0).toUpperCase()+wiz.credit.slice(1)},
      {label:'Est. Payment',  value: fmtMoney(parseFloat(calcMonthly(wiz.amount,7.49,wiz.term))) + '/mo'},
      {label:'Co-Applicant',  value: wiz.hasCoApp ? 'Yes - '+wiz.coApp.firstName+' '+wiz.coApp.lastName : 'None'}
    ];
    var personalFields = [
      {label:'Full Name',     value: wiz.personal.firstName+' '+wiz.personal.lastName},
      {label:'Email',         value: wiz.personal.email},
      {label:'Date of Birth', value: wiz.personal.dob},
      {label:'Phone',         value: wiz.personal.phone},
      {label:'Annual Income', value: fmtMoney(wiz.personal.income)},
      {label:'Employment',    value: wiz.personal.employment},
      {label:'ZIP Code',      value: wiz.personal.zip}
    ];

    function renderGrid(id, fields) {
      var grid = qs('#' + id); if (!grid) return;
      grid.innerHTML = fields.map(function(f) {
        return '<div class="wiz-review-field"><div class="wiz-rf-label">'+f.label+'</div><div class="wiz-rf-value">'+f.value+'</div></div>';
      }).join('');
    }
    renderGrid('reviewLoanGrid', loanFields);
    renderGrid('reviewPersonalGrid', personalFields);
  }

  qs('#back-6').addEventListener('click', function(){ goToStep(5, true); });

  qs('#submitBtn').addEventListener('click', function() {
    var consent = qs('#consentCheck');
    if (!consent || !consent.checked) {
      showToast('Please agree to the terms to continue.', 'error');
      return;
    }

    var btn = qs('#submitBtn');
    btn.innerHTML = '\u23F3 Checking your rate\u2026';
    btn.disabled  = true;

    /* Save to session */
    Store.patch({ application: {
      purpose: wiz.purpose, amount: wiz.amount, term: wiz.term,
      credit:  wiz.credit,  personal: wiz.personal, coApp: wiz.coApp,
      submittedAt: new Date().toISOString()
    }});

    setTimeout(function() {
      btn.innerHTML = '\u128274; Check My Rate \u2014 No Credit Impact';
      btn.disabled  = false;
      buildResults();
      goToStep(7);
    }, 2200);
  });

  /* ??? STEP 7 - Results ??? */
  function buildResults() {
    var offers   = generateOffers({credit: wiz.credit, amount: wiz.amount, term: wiz.term});
    var container = qs('#wizOffers');
    var subtitle  = qs('#resultsSubtitle');
    if (!container) return;

    if (subtitle) {
      subtitle.textContent = offers.length + ' lenders pre-qualified you for a '+fmtMoney(wiz.amount)+
        ' '+wiz.purpose+' loan. Select the offer that works best for you.';
    }

    container.innerHTML = offers.map(function(o, i) {
      var isBest = i === 0;
      return '<div class="wiz-offer'+(isBest?' best':'')+'">' +
        (isBest ? '<div class="wiz-offer-best-tag">\u2705 Best Rate &mdash; '+o.lender.note+'</div>' : '') +
        '<div class="wiz-offer-row">' +
          '<div class="wiz-offer-lender">' +
            '<div class="wiz-av '+o.lender.cls+'">'+o.lender.code+'</div>' +
            '<div>' +
              '<strong>'+o.lender.name+'</strong>' +
              '<span>'+wiz.purpose+' &middot; '+Math.round(o.term/12)+'yr Fixed</span>' +
            '</div>' +
          '</div>' +
          '<div class="wiz-offer-rates">' +
            '<div><div class="wiz-offer-rate-big">'+o.apr+'%</div><div class="wiz-offer-rate-sub">Fixed APR</div></div>' +
            '<div><div class="wiz-offer-rate-big">'+fmtMoney(o.monthly)+'</div><div class="wiz-offer-rate-sub">/month</div></div>' +
          '</div>' +
          '<button class="btn '+(isBest?'btn-green':'btn-outline-green')+' btn-sm" onclick="selectWizOffer(\''+o.lender.name+'\',\''+o.apr+'\',\''+o.monthly+'\')">'+
            (isBest ? 'Select Best Rate' : 'View Offer') +
          '</button>' +
        '</div>' +
      '</div>';
    }).join('');

    Store.patch({ lastOffers: offers.map(function(o){ return {name:o.lender.name,apr:o.apr,monthly:o.monthly}; }) });
  }

  /* Purpose option click ? auto-advance */
  purposeOpts.forEach(function(opt) {
    opt.addEventListener('dblclick', function(){ goToStep(2); });
  });

  /* Init step indicators */
  updateStepIndicators();

}); /* end DOMContentLoaded */

/* ?? SELECT OFFER (global, called from inline onclick) ?? */
window.selectWizOffer = function(name, apr, monthly) {
  var fmtM = '$' + Number(monthly).toLocaleString('en-US', {minimumFractionDigits:0, maximumFractionDigits:0});
  showToast('\u2713 Selected '+name+' at '+apr+'% APR \u2014 '+fmtM+'/mo! Redirecting to final application\u2026', 'success', 5000);
  Store.patch({selectedOffer:{name:name,apr:apr,monthly:monthly,selectedAt:new Date().toISOString()}});
};
