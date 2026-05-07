// booking-chatbot.js
// Replaces the Oranga AI chat widget's Q&A flow with a booking-first conversation.
// Requires: /api/availability  and  /api/book  Vercel serverless functions.
// Add  <script src="/booking-chatbot.js" defer></script>  to index.html (before </body>).

(function () {
  'use strict';

  // ─── Conversation state ────────────────────────────────────────────────────
  var state = {
    step: 'idle',        // idle | day_select | slot_select | collect_name | collect_email | collect_phone | confirm | done
    selectedDate: null,  // 'YYYY-MM-DD'
    selectedStart: null, // ISO string
    selectedEnd: null,   // ISO string
    displayDate: null,   // 'Mon 12 May'
    displayTime: null,   // '10:00 AM'
    name: null,
    email: null,
    phone: null,
  };

  // ─── DOM references (populated in init) ────────────────────────────────────
  var $messages, $form, $input, $suggestions;

  // ─── Low-level DOM helpers ──────────────────────────────────────────────────
  function addMsg(html, who) {
    var typing = $messages.querySelector('.msg.typing');
    if (typing) typing.remove();
    var div = document.createElement('div');
    div.className = 'msg ' + who;
    div.innerHTML = html;
    $messages.appendChild(div);
    $messages.scrollTop = $messages.scrollHeight;
  }

  function showTyping() {
    var div = document.createElement('div');
    div.className = 'msg bot typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    $messages.appendChild(div);
    $messages.scrollTop = $messages.scrollHeight;
  }

  function removeTyping() {
    var typing = $messages.querySelector('.msg.typing');
    if (typing) typing.remove();
  }

  function clearSuggestions() {
    $suggestions.innerHTML = '';
  }

  function setSuggestions(chips) {
    clearSuggestions();
    chips.forEach(function (chip) {
      var btn = document.createElement('button');
      btn.className = 'suggestion-chip';
      btn.type = 'button';
      btn.textContent = chip.label;
      btn.dataset.value = chip.value !== undefined ? chip.value : chip.label;
      $suggestions.appendChild(btn);
    });
  }

  function botReply(html, delayMs) {
    delayMs = delayMs !== undefined ? delayMs : 700;
    showTyping();
    return new Promise(function (resolve) {
      setTimeout(function () {
        removeTyping();
        addMsg(html, 'bot');
        resolve();
      }, delayMs);
    });
  }

  // ─── Date/time helpers ──────────────────────────────────────────────────────
  var TZ = 'Australia/Brisbane';

  function todayInBrisbane() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
  }

  // Return up to `count` weekday ISO dates starting from tomorrow (Brisbane time).
  function getNextWeekdays(count) {
    count = count || 10;
    var todayStr = todayInBrisbane();
    var parts = todayStr.split('-').map(Number);
    var cursor = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1)); // tomorrow UTC midnight
    var days = [];
    while (days.length < count) {
      var dow = cursor.getUTCDay();
      if (dow >= 1 && dow <= 5) {
        days.push(cursor.toISOString().slice(0, 10));
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return days;
  }

  function formatDateLabel(isoDate) {
    // 'Mon 12 May'
    var d = new Date(isoDate + 'T12:00:00Z');
    return d.toLocaleDateString('en-AU', {
      weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
    });
  }

  function formatTimeLabel(isoStr) {
    // '9:30 am' → '9:30 AM' in Brisbane
    return new Date(isoStr).toLocaleTimeString('en-AU', {
      timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true,
    }).toUpperCase();
  }

  // ─── Flow steps ─────────────────────────────────────────────────────────────

  function greet() {
    state.step = 'idle';
    $input.placeholder = 'Type a message…';
    botReply(
      "Hi! 👋 I'm the Oranga AI assistant.<br>" +
      "I can book you a free 30-minute intro call with our team. When would you like to meet?",
      500
    ).then(function () {
      setSuggestions([{ label: '📅 Book a call', value: '__book__' }]);
    });
  }

  function startBookingFlow() {
    state.step = 'day_select';
    return botReply(
      "Great! Let's get you booked in. 📅<br>Which day works best for you?"
    ).then(function () {
      var days = getNextWeekdays(10);
      setSuggestions(days.map(function (iso) {
        return { label: formatDateLabel(iso), value: iso };
      }));
    });
  }

  function handleDaySelect(isoDate) {
    state.selectedDate = isoDate;
    state.displayDate = formatDateLabel(isoDate);
    clearSuggestions();
    addMsg(state.displayDate, 'user');

    state.step = 'slot_select';
    showTyping();

    return fetch('/api/availability?date=' + isoDate)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        removeTyping();
        if (!data.slots || data.slots.length === 0) {
          addMsg(
            "No slots are available on <strong>" + state.displayDate + "</strong> — please pick another date.",
            'bot'
          );
          state.step = 'day_select';
          var days = getNextWeekdays(10);
          setSuggestions(days.map(function (iso) {
            return { label: formatDateLabel(iso), value: iso };
          }));
          return;
        }
        addMsg(
          "Here are the open slots on <strong>" + state.displayDate + "</strong>:",
          'bot'
        );
        setSuggestions(data.slots.map(function (slot) {
          return {
            label: formatTimeLabel(slot.startISO),
            value: JSON.stringify({ s: slot.startISO, e: slot.endISO }),
          };
        }));
      })
      .catch(function () {
        removeTyping();
        addMsg("Couldn't load availability right now — please try again.", 'bot');
        state.step = 'day_select';
        var days = getNextWeekdays(10);
        setSuggestions(days.map(function (iso) {
          return { label: formatDateLabel(iso), value: iso };
        }));
      });
  }

  function handleSlotSelect(slotJson) {
    var slot = JSON.parse(slotJson);
    state.selectedStart = slot.s;
    state.selectedEnd = slot.e;
    state.displayTime = formatTimeLabel(slot.s);
    clearSuggestions();
    addMsg(state.displayTime, 'user');

    state.step = 'collect_name';
    return botReply(
      "Perfect — <strong>" + state.displayTime + "</strong> on <strong>" + state.displayDate + "</strong>.<br>" +
      "What's your full name?"
    ).then(function () {
      $input.placeholder = 'Your full name…';
    });
  }

  function handleNameInput(text) {
    state.name = text.trim();
    addMsg(text, 'user');
    state.step = 'collect_email';
    return botReply(
      "Nice to meet you, " + state.name + "! 👋<br>What's your email address?"
    ).then(function () {
      $input.placeholder = 'your@email.com';
    });
  }

  function handleEmailInput(text) {
    var email = text.trim();
    if (!/\S+@\S+\.\S+/.test(email)) {
      addMsg(text, 'user');
      return botReply("That doesn't look quite right — could you double-check your email?");
    }
    state.email = email;
    addMsg(text, 'user');
    state.step = 'collect_phone';
    return botReply(
      "Got it! One last thing — what's your phone number?<br>" +
      "<small style='color:#86868B'>(Optional — type <em>skip</em> to leave it out)</small>"
    ).then(function () {
      $input.placeholder = 'Phone number, or type skip…';
    });
  }

  function handlePhoneInput(text) {
    var val = text.trim();
    state.phone = (val.toLowerCase() === 'skip' || val === '') ? null : val;
    addMsg(text, 'user');

    state.step = 'confirm';
    var lines = [
      '📅 <strong>' + state.displayDate + '</strong> at <strong>' + state.displayTime + '</strong>',
      '👤 ' + state.name,
      '📧 ' + state.email,
    ];
    if (state.phone) lines.push('📱 ' + state.phone);

    return botReply(
      "Here's your booking summary:<br><br>" +
      lines.join('<br>') +
      "<br><br>Ready to confirm?"
    ).then(function () {
      $input.placeholder = 'Type your message…';
      setSuggestions([
        { label: '✅ Confirm booking', value: '__confirm__' },
        { label: '✏️ Start over',      value: '__restart__' },
      ]);
    });
  }

  function handleConfirm() {
    clearSuggestions();
    addMsg('Confirm booking', 'user');
    state.step = 'done';
    showTyping();

    return fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startISO: state.selectedStart,
        endISO:   state.selectedEnd,
        name:     state.name,
        email:    state.email,
        phone:    state.phone,
      }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        removeTyping();
        var data = result.data;

        if (result.ok && data.ok) {
          var meetPart = data.meetLink
            ? '<br><br>📹 <a href="' + data.meetLink + '" target="_blank" ' +
              'style="color:#5DDBA9;font-weight:600">Join Google Meet</a>'
            : '';
          addMsg(
            '🎉 You\'re booked!<br>' +
            'A calendar invite has been sent to <strong>' + state.email + '</strong>.' +
            meetPart +
            '<br><br>We look forward to speaking with you!',
            'bot'
          );
          setSuggestions([{ label: '🏠 Back to website', value: '__home__' }]);

        } else if (data.slotTaken) {
          addMsg("That slot was just taken 😅 — let's pick another time.", 'bot');
          resetState();
          startBookingFlow();

        } else {
          addMsg('Something went wrong: ' + (data.error || 'Please try again.'), 'bot');
          state.step = 'idle';
          setSuggestions([{ label: '🔄 Try again', value: '__book__' }]);
        }
      })
      .catch(function () {
        removeTyping();
        addMsg("Couldn't complete the booking — please try again.", 'bot');
        state.step = 'idle';
        setSuggestions([{ label: '🔄 Try again', value: '__book__' }]);
      });
  }

  function resetState() {
    state.step = 'idle';
    state.selectedDate = null;
    state.selectedStart = null;
    state.selectedEnd = null;
    state.displayDate = null;
    state.displayTime = null;
    state.name = null;
    state.email = null;
    state.phone = null;
  }

  // ─── Central dispatcher ────────────────────────────────────────────────────
  function dispatch(text) {
    var lower = text.toLowerCase().trim();

    // Special chip values
    if (text === '__confirm__') { handleConfirm(); return; }
    if (text === '__book__')    { startBookingFlow(); return; }
    if (text === '__home__')    { window.location.href = '/'; return; }
    if (text === '__restart__') {
      resetState();
      clearSuggestions();
      $messages.innerHTML = '';
      greet();
      return;
    }

    switch (state.step) {

      case 'idle':
        addMsg(text, 'user');
        if (/book|call|meet|appointment|schedule|available|time|slot|intro/i.test(lower)) {
          startBookingFlow();
        } else {
          botReply(
            "I'm here to help you book a free intro call with our team! Would you like to schedule one?"
          ).then(function () {
            setSuggestions([{ label: '📅 Book a call', value: '__book__' }]);
          });
        }
        break;

      case 'day_select':
        if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
          handleDaySelect(text);
        } else {
          addMsg(text, 'user');
          botReply("Please choose one of the available dates above. 👆");
        }
        break;

      case 'slot_select':
        try {
          var parsed = JSON.parse(text);
          if (parsed.s && parsed.e) {
            handleSlotSelect(text);
          } else {
            throw new Error('bad slot');
          }
        } catch (e) {
          addMsg(text, 'user');
          botReply("Please choose one of the available time slots above. 👆");
        }
        break;

      case 'collect_name':
        if (text.trim().length < 2) {
          addMsg(text, 'user');
          botReply("Could you share your full name?");
        } else {
          handleNameInput(text);
        }
        break;

      case 'collect_email':
        handleEmailInput(text);
        break;

      case 'collect_phone':
        handlePhoneInput(text);
        break;

      case 'confirm':
        if (/yes|confirm|ok|sure|go ahead|yep|yup/i.test(lower)) {
          handleConfirm();
        } else if (/no|cancel|restart|start over|change/i.test(lower)) {
          resetState();
          $messages.innerHTML = '';
          greet();
        } else {
          addMsg(text, 'user');
          botReply("Please tap <strong>✅ Confirm booking</strong> or <strong>✏️ Start over</strong> above.");
        }
        break;

      case 'done':
        addMsg(text, 'user');
        botReply("Your booking is all set! Is there anything else I can help you with?");
        break;

      default:
        addMsg(text, 'user');
        startBookingFlow();
    }
  }

  // ─── Init ──────────────────────────────────────────────────────────────────
  function init() {
    $messages    = document.getElementById('chatMessages');
    $form        = document.getElementById('chatForm');
    $input       = document.getElementById('chatInput');
    $suggestions = document.getElementById('chatSuggestions');

    if (!$messages || !$form || !$input || !$suggestions) {
      console.warn('[booking-chatbot] Chat widget DOM elements not found — check IDs.');
      return;
    }

    // Swap in the Oranga AI logo on the chat avatar and launcher button.
    var avatar = document.querySelector('.chat-avatar');
    if (avatar) {
      avatar.style.backgroundImage = 'url("/images/oranga-logo.png")';
      avatar.style.backgroundSize  = 'cover';
      avatar.style.backgroundPosition = 'center';
    }
    var launcher = document.getElementById('chatLauncher');
    if (launcher) {
      // Black circle with the logo centred — looks clean on both dark and light
      // page backgrounds as the user scrolls.
      launcher.style.backgroundColor    = '#000000';
      launcher.style.backgroundImage    = 'url("/images/oranga-logo-transparent.png")';
      launcher.style.backgroundSize     = '90% 90%';
      launcher.style.backgroundPosition = 'center';
      launcher.style.backgroundRepeat   = 'no-repeat';
      // Hide any inline SVG children so only the logo shows.
      Array.prototype.forEach.call(launcher.children, function (c) { c.style.display = 'none'; });
    }

    // Clone the form to strip any existing submit listeners, then re-add ours.
    var newForm = $form.cloneNode(true);
    $form.parentNode.replaceChild(newForm, $form);
    $form  = newForm;
    $input = document.getElementById('chatInput'); // re-grab after clone

    $form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = $input.value.trim();
      if (!text) return;
      $input.value = '';
      dispatch(text);
    });

    // Delegated click handler for dynamically-added suggestion chips.
    $suggestions.addEventListener('click', function (e) {
      var chip = e.target.closest('.suggestion-chip');
      if (!chip) return;
      var value = chip.dataset.value !== undefined ? chip.dataset.value : chip.textContent.trim();
      dispatch(value);
    });

    // When the chat launcher is clicked → greet on first open.
    if (launcher) {
      launcher.addEventListener('click', function () {
        setTimeout(function () {
          if ($messages.children.length === 0) greet();
        }, 120); // wait for CSS open animation
      });
    }

    // If the panel is already open on page load, greet immediately.
    var panel = document.getElementById('chatPanel');
    if (panel && panel.classList.contains('open') && $messages.children.length === 0) {
      greet();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
