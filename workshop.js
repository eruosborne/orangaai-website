// workshop.js: interest form for /workshop
(function () {
  var form = document.getElementById('workshopForm');
  if (!form) return;
  var err = document.getElementById('wkError');
  var btn = document.getElementById('wkSubmit');

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    err.textContent = '';
    var data = {
      name: form.name.value, email: form.email.value, phone: form.phone.value, business: form.business.value,
      source: (new URLSearchParams(location.search)).get('utm_source') || ''
    };
    if (data.name.trim().length < 2) { err.textContent = 'Please enter your name.'; return; }
    if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) { err.textContent = 'Please enter a valid email.'; return; }
    if (data.phone.replace(/\D/g, '').length < 8) { err.textContent = 'Please enter your mobile number.'; return; }
    btn.disabled = true; btn.textContent = 'Saving your spot...';
    fetch('/api/workshop-register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok) {
          form.hidden = true;
          document.getElementById('wkHead').hidden = true;
          document.getElementById('wkDone').hidden = false;
          return;
        }
        err.textContent = (res.j && res.j.error) || 'Something went wrong. Please try again.';
        btn.disabled = false; btn.textContent = 'Save my spot';
      })
      .catch(function () {
        err.textContent = 'Something went wrong. Please try again.';
        btn.disabled = false; btn.textContent = 'Save my spot';
      });
  });
})();
