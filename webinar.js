// webinar.js: registration form for /webinar
(function () {
  var form = document.getElementById('webinarForm');
  if (!form) return;
  var err = document.getElementById('wbError');
  var btn = document.getElementById('wbSubmit');
  // mark the field that needs fixing, move focus to it, clear the mark once it's edited
  function bad(field, msg) {
    err.textContent = msg;
    if (field) { field.setAttribute('aria-invalid', 'true'); field.setAttribute('aria-describedby', err.id); field.focus(); }
  }
  form.addEventListener('input', function (e) { if (e.target.getAttribute('aria-invalid')) e.target.removeAttribute('aria-invalid'); });
  var tz = 'Australia/Brisbane';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch (e) {}

  // Show the start time in the visitor's own timezone when it isn't Brisbane.
  try {
    if (tz !== 'Australia/Brisbane') {
      var start = new Date('2026-11-05T09:00:00Z');
      var when = start.toLocaleString('en-AU', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' }) + ' at ' +
        start.toLocaleString('en-AU', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' }).toLowerCase();
      document.getElementById('localTime').textContent = 'In your time: ' + when + '.';
    }
  } catch (e) {}

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    err.textContent = '';
    var data = {
      name: form.name.value, email: form.email.value, phone: form.phone.value, tz: tz,
      source: (new URLSearchParams(location.search)).get('utm_source') || ''
    };
    if (data.name.trim().length < 2) { return bad(form.name, 'Please enter your name.'); }
    if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) { return bad(form.email, 'Please enter a valid email.'); }
    if (data.phone.replace(/\D/g, '').length < 8) { return bad(form.phone, 'Please enter your mobile number.'); }
    btn.disabled = true; btn.textContent = 'Saving your seat...';
    fetch('/api/webinar-register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok) { window.location.href = '/webinar-confirmed'; return; }
        err.textContent = (res.j && res.j.error) || 'Something went wrong. Please try again.';
        btn.disabled = false; btn.textContent = 'Save my seat';
      })
      .catch(function () {
        err.textContent = 'Something went wrong. Please try again.';
        btn.disabled = false; btn.textContent = 'Save my seat';
      });
  });
})();
