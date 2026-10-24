(function(){
  window.dataLayer = window.dataLayer || [];
  function track(ev, params){ window.dataLayer.push(Object.assign({event: ev}, params || {})); }

  // mobile menu
  var mb = document.querySelector('.menu-btn'), ul = document.querySelector('.nav ul');
  if (mb && ul) mb.addEventListener('click', function(){
    var o = ul.classList.toggle('open'); mb.setAttribute('aria-expanded', o ? 'true' : 'false');
  });

  // UTM + click-id capture (persist for the session so it survives page changes)
  var keys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid'];
  // Attribution is carried between pages on the query string (no browser storage).
  var qs = new URLSearchParams(location.search), store = {};
  keys.concat(['landing_page','referrer']).forEach(function(k){ if (qs.get(k)) store[k] = qs.get(k); });
  if (!store.landing_page) store.landing_page = location.pathname;
  if (!store.referrer) store.referrer = document.referrer || '(direct)';
  var carry = new URLSearchParams();
  Object.keys(store).forEach(function(k){ carry.set(k, store[k]); });
  document.querySelectorAll('a[href$=".html"]').forEach(function(a){
    a.setAttribute('href', a.getAttribute('href').split('?')[0] + '?' + carry.toString());
  });
  // CTA tracking
  document.querySelectorAll('[data-cta]').forEach(function(a){
    a.addEventListener('click', function(){ track('franchise_cta_click', {cta_label: a.dataset.cta, page: location.pathname}); });
  });

  // multi-step form
  var form = document.getElementById('inquiry');
  if (!form) return;
  keys.concat(['landing_page','referrer']).forEach(function(k){
    var h = form.querySelector('[name="' + k + '"]'); if (h) h.value = store[k] || '';
  });
  // prefill from the fit quiz
  ['experience','role','capital','timeline'].forEach(function(k){
    var v = qs.get(k), el = form.querySelector('select[name="' + k + '"]');
    if (v && el && Array.from(el.options).some(function(o){ return o.value === v || o.text === v; })) el.value = v;
  });
  var sets = Array.from(form.querySelectorAll('fieldset')), bars = Array.from(document.querySelectorAll('.progress span'));
  var label = document.querySelector('.step-label'), back = form.querySelector('.back'), next = form.querySelector('.next'), submit = form.querySelector('.submit');
  var i = 0, started = false;
  function show(n){
    sets.forEach(function(s, k){ s.classList.toggle('active', k === n); });
    bars.forEach(function(b, k){ b.classList.toggle('on', k <= n); });
    label.textContent = 'Step ' + (n + 1) + ' of ' + sets.length;
    back.style.visibility = n === 0 ? 'hidden' : 'visible';
    next.style.display = n === sets.length - 1 ? 'none' : '';
    submit.style.display = n === sets.length - 1 ? '' : 'none';
  }
  function valid(set){
    var ok = true;
    set.querySelectorAll('[required]').forEach(function(f){
      var e = set.querySelector('[data-err="' + f.name + '"]'), good;
      if (f.type === 'checkbox') good = f.checked;
      else if (f.type === 'email') good = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim());
      else if (f.type === 'tel') good = f.value.replace(/\D/g,'').length >= 10;
      else good = f.value.trim() !== '';
      if (e) e.textContent = good ? '' : (f.dataset.msg || 'Required');
      f.setAttribute('aria-invalid', good ? 'false' : 'true');
      if (!good) ok = false;
    });
    return ok;
  }
  form.addEventListener('input', function(){ if (!started){ started = true; track('franchise_form_start', {form_id: 'franchise_inquiry'}); } });
  next.addEventListener('click', function(){
    if (!valid(sets[i])) return;
    track('franchise_form_step', {step_number: i + 1}); i++; show(i);
    form.scrollIntoView({behavior: 'smooth', block: 'start'});
  });
  back.addEventListener('click', function(){ i = Math.max(0, i - 1); show(i); });
  form.addEventListener('submit', function(ev){
    ev.preventDefault();
    if (!valid(sets[i])) return;
    var d = Object.fromEntries(new FormData(form).entries());
    d.consent_timestamp = new Date().toISOString();
    track('franchise_inquiry_submit', {market: d.market_state || '', utm_source: d.utm_source || ''});
    // TODO: post to the approved CRM endpoint.
    form.style.display = 'none';
    document.querySelector('.success').classList.add('on');
  });
  show(0);
})();

(function(){
  window.dataLayer = window.dataLayer || [];
  function track(ev, p){ window.dataLayer.push(Object.assign({event: ev}, p || {})); }
  function validate(scope){
    var ok = true;
    scope.querySelectorAll('[required]').forEach(function(f){
      if (f.type === 'radio') return;
      var e = scope.querySelector('[data-err="' + f.name + '"]'), good;
      if (f.type === 'checkbox') good = f.checked;
      else if (f.type === 'email') good = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim());
      else if (f.type === 'tel') good = f.value.replace(/\D/g,'').length >= 10;
      else good = f.value.trim() !== '';
      if (e) e.textContent = good ? '' : (f.dataset.msg || 'Required');
      f.setAttribute('aria-invalid', good ? 'false' : 'true');
      if (!good) ok = false;
    });
    return ok;
  }

  // fit quiz
  var quiz = document.getElementById('fitquiz');
  if (quiz) quiz.addEventListener('submit', function(ev){
    ev.preventDefault();
    var names = ['experience','role','capital','timeline','region'], ans = {}, score = 0, missing = 0;
    names.forEach(function(n){
      var c = quiz.querySelector('input[name="' + n + '"]:checked');
      if (!c) { missing++; return; }
      ans[n] = c.value; ans[n + '_score'] = +c.dataset.score; score += +c.dataset.score;
    });
    var err = document.getElementById('quiz-err');
    if (missing) { err.textContent = 'Please answer all five questions.'; return; }
    err.textContent = '';
    var tier = (score >= 12 && ans.capital_score >= 2 && ans.experience_score >= 2) ? 'strong' : (score >= 7 ? 'good' : 'early');
    track('franchise_fit_quiz_complete', {fit_tier: tier, fit_score: score});
    document.querySelectorAll('.quiz-apply').forEach(function(a){
      var u = new URL(a.getAttribute('href'), location.href);
      ['experience','role','capital','timeline'].forEach(function(k){ u.searchParams.set(k, ans[k]); });
      a.setAttribute('href', u.pathname.split('/').pop() + u.search);
    });
    quiz.hidden = true;
    var r = document.getElementById('r-' + tier); r.hidden = false;
    r.scrollIntoView({behavior: 'smooth', block: 'start'});
  });

  // brochure form
  var bf = document.getElementById('brochure-form');
  if (bf) bf.addEventListener('submit', function(ev){
    ev.preventDefault();
    if (!validate(bf)) return;
    track('franchise_brochure_request', {market: bf.querySelector('[name="b_state"]').value});
    // TODO: post to the approved CRM endpoint, which emails the download link.
    bf.style.display = 'none';
    document.getElementById('brochure-ok').classList.add('on');
  });

  // gallery lightbox
  var lb = document.querySelector('.lightbox');
  if (lb && lb.showModal) {
    var img = lb.querySelector('img'), cap = lb.querySelector('p');
    document.querySelectorAll('.g-open').forEach(function(b){
      b.addEventListener('click', function(){ img.src = b.dataset.src; img.alt = b.dataset.cap; cap.textContent = b.dataset.cap; lb.showModal(); });
    });
    lb.querySelector('.lb-close').addEventListener('click', function(){ lb.close(); });
    lb.addEventListener('click', function(e){ if (e.target === lb) lb.close(); });
  }
})();
