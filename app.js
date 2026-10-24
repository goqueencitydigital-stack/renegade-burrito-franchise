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
