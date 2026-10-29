// booking-chatbot.js
// Chat widget extras: logo injection, and a hand-off from the chat to the
// Bottleneck Audit booking form. Booking itself happens on /admin-audit (the agency
// funnel's calendar page), so there is one booking path with one set of questions.

(function () {
  'use strict';

  var BOOK_URL = '/admin-audit#book';

  // Close the chat and go to the booking form (scroll if it's already on this page).
  function goToBooking() {
    var form = document.getElementById('book');
    if (form) {
      if (typeof window.closeChat === 'function') window.closeChat();
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    window.location.href = BOOK_URL;
  }

  function init() {
    var $messages = document.getElementById('chatMessages');
    var $form     = document.getElementById('chatForm');
    var $input    = document.getElementById('chatInput');

    var avatar = document.querySelector('.chat-avatar');
    if (avatar) {
      avatar.style.backgroundImage    = 'url("/images/oranga-logo.png")';
      avatar.style.backgroundSize     = 'cover';
      avatar.style.backgroundPosition = 'center';
    }
    var launcher = document.getElementById('chatLauncher');
    if (launcher) {
      launcher.style.backgroundColor    = '#1B2124';
      launcher.style.backgroundImage    = 'url("/images/oranga-logo-transparent.png")';
      launcher.style.backgroundSize     = '90% 90%';
      launcher.style.backgroundPosition = 'center';
      launcher.style.backgroundRepeat   = 'no-repeat';
      Array.prototype.forEach.call(launcher.children, function (c) { c.style.display = 'none'; });
    }

    if (!$messages || !$form || !$input) return;

    // Capture phase, before the Q&A chatbot: a booking request goes to the form.
    // Everything else passes through to the Q&A chatbot unchanged.
    $form.addEventListener('submit', function (e) {
      var text = $input.value.trim();
      if (!text || !/\b(book|booking|call|meet|meeting|appointment|schedule|audit)\b/i.test(text)) return;
      e.preventDefault();
      e.stopPropagation();
      $input.value = '';
      var you = document.createElement('div');
      you.className = 'msg user';
      you.textContent = text;
      $messages.appendChild(you);
      var bot = document.createElement('div');
      bot.className = 'msg bot';
      bot.innerHTML = "Taking you to the booking form. Pick a time for your free Bottleneck Audit and answer five quick questions.";
      $messages.appendChild(bot);
      $messages.scrollTop = $messages.scrollHeight;
      setTimeout(goToBooking, 900);
    }, true);
  }

  // Used by the Q&A chatbot's "Book a call" buttons and chips.
  window.startBookingFlow = goToBooking;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
