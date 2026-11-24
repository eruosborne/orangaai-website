// bf-booking.js
// Booking on /black-friday (free install, 14-day trial, 2026-11-20).
// Calendar first (2026-11-24): pick a day and time, then name, email, phone and business name → /api/book (offer: 'bf')
// → /black-friday-booked. Lead fires on the first time picked. No qualifying questions: that happens on the call.

(function () {
  'use strict';

  var root = document.getElementById('book');
  if (!root) return;

  var $details = document.getElementById('bfDetails');
  var $cal     = document.getElementById('bfCalendar');
  var $days    = document.getElementById('bookDays');
  var $more    = document.getElementById('bookMoreDays');
  var $slots   = document.getElementById('bookSlots');
  var $preview = document.getElementById('bookPreview');
  var $tz      = document.getElementById('bookTz');
  var $err2    = document.getElementById('bfError2');
  var $submit  = document.getElementById('bookSubmit');

  var OFFER = 'bf';
  var FIRST_DAYS = 14;
  var SUBMIT_LABEL = $submit.textContent;
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

  var state = { tz: 'Australia/Brisbane', date: null, slot: null, slotsByDate: {}, person: null, loaded: false, leadSent: false };

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

  function track(evt, params) {
    if (typeof window.fbq === 'function') window.fbq('track', evt, params || {});
    if (window.gtag) window.gtag('event', evt.toLowerCase(), { page: 'black-friday' });
  }

  // ---------- step 2: calendar ----------
  function fmt(iso, opts) { opts.timeZone = state.tz; return new Date(iso).toLocaleString('en-AU', opts); }
  function timeLabel(iso) { return fmt(iso, { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase().replace(/\s/g, ''); }
  function dayLabel(isoDate) {
    var d = new Date(isoDate + 'T12:00:00Z');
    return {
      top: d.toLocaleDateString('en-AU', { weekday: 'short', timeZone: 'UTC' }),
      sub: d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
    };
  }
  function renderPreview() {
    if (!state.slot) { $preview.textContent = 'Pick a day and a time.'; return; }
    $preview.textContent = timeLabel(state.slot.startISO) + ' to ' + timeLabel(state.slot.endISO) + ', ' +
      fmt(state.slot.startISO, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function chip(top, sub, pressed) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'book-chip';
    b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    b.textContent = top;
    if (sub) { var s = document.createElement('small'); s.textContent = sub; b.appendChild(s); }
    return b;
  }
  function hint(text) {
    $slots.innerHTML = '';
    var p = document.createElement('p'); p.className = 'book-hint'; p.textContent = text;
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
        $submit.disabled = false;
        $err2.textContent = '';
        if (!state.leadSent) { state.leadSent = true; track('Lead', { content_name: 'Black Friday install' }); }
      });
      $slots.appendChild(b);
    });
  }
  function pickDay(isoDate, button) {
    state.date = isoDate; state.slot = null; $submit.disabled = true;
    renderPreview();
    Array.prototype.forEach.call($days.querySelectorAll('.book-chip'), function (c) { c.setAttribute('aria-pressed', 'false'); });
    button.setAttribute('aria-pressed', 'true');
    hint('Loading times...');
    fetch('/api/availability?offer=' + OFFER + '&date=' + isoDate)
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
    state.loaded = true;
    fetch('/api/availability?offer=' + OFFER)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        $days.innerHTML = '';
        var dates = data.dates || [];
        dates.forEach(function (iso, i) {
          var l = dayLabel(iso);
          var b = chip(l.top, l.sub, false);
          if (i >= FIRST_DAYS) b.hidden = true;
          b.addEventListener('click', function () { pickDay(iso, b); });
          $days.appendChild(b);
          if (i === 0) pickDay(iso, b);
        });
        if (dates.length > FIRST_DAYS) {
          $more.hidden = false;
          $more.onclick = function () {
            Array.prototype.forEach.call($days.querySelectorAll('.book-chip[hidden]'), function (c) { c.hidden = false; });
            $more.hidden = true;
          };
        }
      })
      .catch(function () {
        state.loaded = false;
        $days.innerHTML = '<p class="book-hint">Couldn\'t load the calendar. Please refresh, or email support@orangaai.com.</p>';
      });
  }

  $details.addEventListener('submit', function (e) {
    e.preventDefault();
    $err2.textContent = '';
    if (!state.slot) { $err2.textContent = 'Please pick a time first.'; return; }
    var f = $details.elements;
    var missing = ['name', 'email', 'phone', 'businessName'].filter(function (k) { return !f[k].value.trim(); });
    if (missing.length) { $err2.textContent = 'Please fill in everything.'; f[missing[0]].focus(); return; }
    if (!/^\S+@\S+\.\S+$/.test(f.email.value.trim())) { $err2.textContent = 'That email doesn\'t look right.'; f.email.focus(); return; }
    state.person = { name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), answers: { businessName: f.businessName.value.trim() } };
    $submit.disabled = true;
    $submit.textContent = 'Booking...';
    fetch('/api/book', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offer: OFFER,
        startISO: state.slot.startISO, endISO: state.slot.endISO,
        name: state.person.name, email: state.person.email, phone: state.person.phone,
        tz: state.tz, answers: state.person.answers,
      }),
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok && res.d.ok) {
          window.location.href = '/black-friday-booked?start=' + encodeURIComponent(res.d.startISO) + '&tz=' + encodeURIComponent(state.tz);
          return;
        }
        $submit.disabled = false; $submit.textContent = SUBMIT_LABEL;
        $err2.textContent = res.d.error || 'Something went wrong. Please try again.';
        if (res.d.slotTaken && state.date) {
          var active = $days.querySelector('[aria-pressed="true"]');
          if (active) pickDay(state.date, active);
        }
      })
      .catch(function () {
        $submit.disabled = false; $submit.textContent = SUBMIT_LABEL;
        $err2.textContent = "Couldn't complete the booking. Please try again.";
      });
  });

  renderPreview();
  loadDays();
})();
