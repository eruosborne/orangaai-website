// newsletter.js: email sign-up form for /newsletter
(function () {
  var form = document.getElementById('newsletterForm');
  if (!form) return;
  var err = document.getElementById('nlError');
  var done = document.getElementById('nlDone');
  var btn = document.getElementById('nlSubmit');
  form.addEventListener('input', function (e) { if (e.target.getAttribute('aria-invalid')) e.target.removeAttribute('aria-invalid'); });

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    err.textContent = '';
    var q = new URLSearchParams(location.search);
    var data = { email: form.email.value.trim(), source: q.get('utm_source') || q.get('ref') || '' };
    if (!/^\S+@\S+\.\S+$/.test(data.email)) {
      err.textContent = 'Please enter a valid email.';
      form.email.setAttribute('aria-invalid', 'true'); form.email.focus();
      return;
    }
    btn.disabled = true; btn.textContent = 'Signing you up...';
    fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok) {
          if (window.fbq) fbq('trackCustom', 'NewsletterSignup');
          if (window.gtag) gtag('event', 'newsletter_signup', { page: location.pathname });
          form.querySelector('.book-fields').hidden = true;
          btn.hidden = true;
          done.hidden = false;
          done.textContent = "You're in. I'll send the first issue soon.";
          return;
        }
        err.textContent = (res.j && res.j.error) || 'Something went wrong. Please try again.';
        btn.disabled = false; btn.textContent = 'Sign me up';
      })
      .catch(function () {
        err.textContent = 'Something went wrong. Please try again.';
        btn.disabled = false; btn.textContent = 'Sign me up';
      });
  });
})();
