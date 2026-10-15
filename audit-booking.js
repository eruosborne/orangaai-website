// audit-booking.js
// Inline booking form on /admin-audit (the agency funnel's calendar page).
// Day → time → details + five qualifying questions → /api/book → /booked.

(function () {
  'use strict';

  var root = document.getElementById('book');
  if (!root) return;

  var $days    = document.getElementById('bookDays');
  var $slots   = document.getElementById('bookSlots');
  var $form    = document.getElementById('bookForm');
  var $preview = document.getElementById('bookPreview');
  var $tz      = document.getElementById('bookTz');
  var $error   = document.getElementById('bookError');
  var $submit  = document.getElementById('bookSubmit');

  var BRISBANE = 'Australia/Brisbane';
  var ZONES = [
    ['Australia/Brisbane', 'Brisbane / Gold Coast (QLD)'],
    ['Australia/Sydney', 'Sydney, Canberra (NSW, ACT)'],
    ['Australia/Melbourne', 'Melbourne (VIC)'],
    ['Australia/Hobart', 'Hobart (TAS)'],
    ['Australia/Adelaide', 'Adelaide (SA)'],
    ['Australia/Darwin', 'Darwin (NT)'],
    ['Australia/Perth', 'Perth (WA)'],
    ['Pacific/Auckland', 'New Zealand'],
  ];

  var state = { tz: BRISBANE, date: null, slot: null, slotsByDate: {} };

  // Start in the visitor's own timezone.
  try {
    var local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (local) state.tz = local;
  } catch (e) {}
  if (!ZONES.some(function (z) { return z[0] === state.tz; })) ZONES.unshift([state.tz, state.tz.replace(/_/g, ' ')]);
  ZONES.forEach(function (z) {
    var o = document.createElement('option');
    o.value = z[0]; o.textContent = z[1];
    if (z[0] === state.tz) o.selected = true;
    $tz.appendChild(o);
  });
  $tz.addEventListener('change', function () {
    state.tz = $tz.value;
    if (state.date) renderSlots(state.slotsByDate[state.date] || []);
    renderPreview();
  });

  function fmt(iso, opts) {
    opts.timeZone = state.tz;
    return new Date(iso).toLocaleString('en-AU', opts);
  }
  function timeLabel(iso) {
    return fmt(iso, { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase().replace(/\s/g, '');
  }
  function dayLabel(isoDate) {
    var d = new Date(isoDate + 'T12:00:00Z');
    return {
      top: d.toLocaleDateString('en-AU', { weekday: 'short', timeZone: 'UTC' }),
      sub: d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
    };
  }

  // Time and date preview, e.g. "11:30am to 12:00pm, Thursday 8 October 2026".
  function renderPreview() {
    if (!state.slot) { $preview.textContent = 'Pick a day and a time below.'; return; }
    $preview.textContent = timeLabel(state.slot.startISO) + ' to ' + timeLabel(state.slot.endISO) + ', ' +
      fmt(state.slot.startISO, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function chip(top, sub, pressed) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'book-chip';
    b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    b.textContent = top;
    if (sub) { var s = document.createElement('small'); s.textContent = sub; b.appendChild(s); }
    return b;
  }

  function hint(text) {
    $slots.innerHTML = '';
    var p = document.createElement('p');
    p.className = 'book-hint';
    p.textContent = text;
    $slots.appendChild(p);
  }

  function renderSlots(slots) {
    $slots.innerHTML = '';
    if (!slots.length) { hint('No times left on this day. Please pick another.'); return; }
    slots.forEach(function (s) {
      var b = chip(timeLabel(s.startISO), '', state.slot && state.slot.startISO === s.startISO);
      b.addEventListener('click', function () {
        state.slot = s;
        Array.prototype.forEach.call($slots.children, function (c) { c.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        renderPreview();
        $form.hidden = false;
        $error.textContent = '';
      });
      $slots.appendChild(b);
    });
  }

  function pickDay(isoDate, button) {
    state.date = isoDate;
    state.slot = null;
    $form.hidden = true;
    renderPreview();
    Array.prototype.forEach.call($days.children, function (c) { c.setAttribute('aria-pressed', 'false'); });
    button.setAttribute('aria-pressed', 'true');
    hint('Loading times...');
    fetch('/api/availability?date=' + isoDate)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (state.date !== isoDate) return;
        if (data.error) { hint(data.error); return; }
        state.slotsByDate[isoDate] = data.slots || [];
        renderSlots(state.slotsByDate[isoDate]);
      })
      .catch(function () { hint("Couldn't load times. Please try again."); });
  }

  function loadDays() {
    fetch('/api/availability')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        $days.innerHTML = '';
        (data.dates || []).forEach(function (iso, i) {
          var l = dayLabel(iso);
          var b = chip(l.top, l.sub, false);
          b.addEventListener('click', function () { pickDay(iso, b); });
          $days.appendChild(b);
          if (i === 0) pickDay(iso, b);
        });
      })
      .catch(function () {
        $days.innerHTML = '<p class="book-hint">Couldn\'t load the calendar. Please refresh, or email support@orangaai.com.</p>';
      });
  }

  $form.addEventListener('submit', function (e) {
    e.preventDefault();
    $error.textContent = '';
    if (!state.slot) { $error.textContent = 'Please pick a time first.'; return; }
    var f = $form.elements;
    var missing = ['name', 'email', 'business', 'team', 'adminWhen', 'triedAi', 'focus'].filter(function (k) {
      return !f[k].value.trim();
    });
    if (missing.length) {
      $error.textContent = 'Please fill in everything except phone.';
      f[missing[0]].focus();
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(f.email.value.trim())) { $error.textContent = 'That email doesn\'t look right.'; f.email.focus(); return; }

    $submit.disabled = true;
    $submit.textContent = 'Booking...';
    fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startISO: state.slot.startISO,
        endISO: state.slot.endISO,
        name: f.name.value, email: f.email.value, phone: f.phone.value,
        tz: state.tz,
        answers: {
          business: f.business.value, team: f.team.value, adminWhen: f.adminWhen.value,
          triedAi: f.triedAi.value, focus: f.focus.value,
        },
      }),
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok && res.d.ok) {
          var q = '?start=' + encodeURIComponent(res.d.startISO) + '&tz=' + encodeURIComponent(state.tz);
          window.location.href = '/booked' + q;
          return;
        }
        $submit.disabled = false;
        $submit.textContent = 'Book my Admin Audit';
        $error.textContent = res.d.error || 'Something went wrong. Please try again.';
        if (res.d.slotTaken && state.date) {
          var active = $days.querySelector('[aria-pressed="true"]');
          if (active) pickDay(state.date, active);
        }
      })
      .catch(function () {
        $submit.disabled = false;
        $submit.textContent = 'Book my Admin Audit';
        $error.textContent = "Couldn't complete the booking. Please try again.";
      });
  });

  renderPreview();
  loadDays();
})();
