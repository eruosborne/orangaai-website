/* ============================================================
   Oranga AI: shared site script
   Nav state, scroll reveals, and the Oranga Core chatbot KB.
   Loaded once by every page (replaces the old inline duplicates).
   The booking flow lives in booking-chatbot.js and hooks #chatForm.
   ============================================================ */
(function () {
  'use strict';

  /* --- Nav border on scroll (optional element) --- */
  var nav = document.getElementById('nav');
  if (nav) {
    window.addEventListener('scroll', function () {
      nav.classList.toggle('scrolled', window.scrollY > 8);
    }, { passive: true });
  }

  /* --- Mobile nav toggle --- */
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      var open = navLinks.classList.toggle('open');
      navToggle.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    navLinks.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        navLinks.classList.remove('open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* --- Scroll reveal --- */
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if (!('IntersectionObserver' in window)) {
      reveals.forEach(function (el) { el.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      reveals.forEach(function (el) { io.observe(el); });
    }
  }

  /* ============================================================
     CHATBOT
     ============================================================ */
  var launcher = document.getElementById('chatLauncher');
  var panel = document.getElementById('chatPanel');
  var closeBtn = document.getElementById('chatClose');
  var messagesEl = document.getElementById('chatMessages');
  var suggestionsEl = document.getElementById('chatSuggestions');
  var formEl = document.getElementById('chatForm');
  var inputEl = document.getElementById('chatInput');

  // No chatbot markup on this page, nothing more to wire up.
  if (!panel || !messagesEl || !formEl || !inputEl) return;

  var BOOK_BTN = "<button type='button' onclick='if(window.startBookingFlow)window.startBookingFlow()' style='background:#3B5BDB;color:#fff;border:none;padding:8px 18px;border-radius:20px;font-weight:600;cursor:pointer;font-size:14px;display:inline-flex;align-items:center;gap:6px;margin-top:6px;'>📅 Book a call</button>";

  var KB = [
    {
      keywords: ['hi', 'hello', 'hey', 'howdy', 'greetings', 'kia ora', 'sup', 'yo', 'g day', 'good morning', 'good afternoon', 'good evening'],
      answer: "Kia ora, I'm Oranga AI's assistant. Ask me about Oranga Core, how it works, whether it's a fit for your business, or how to book a free strategy call."
    },
    {
      keywords: ['what is oranga', 'who are you', 'what do you do', 'about oranga', 'about you', 'what is this', 'tell me about', 'explain what', 'describe what', 'overview', 'summary', 'what is oranga core', 'what exactly', 'what is core'],
      answer: "Oranga AI installs <strong>Oranga Core</strong>, an AI system built for trade businesses. It's one workspace that knows your business, does the routine work, and never acts alone on anything that matters. We build it, install it, tune it to how you actually run, and stand behind it."
    },
    {
      keywords: ['oranga', 'maori', 'name mean', 'meaning', 'wellbeing', 'thriving'],
      answer: "<strong>Oranga</strong> is a Māori word meaning <em>wellbeing</em> and <em>thriving</em>. Built on the Gold Coast, for businesses that run lean and move fast."
    },
    {
      keywords: ['layers', 'four layers', 'how does it work', 'how it works', 'what does it do', 'parts', 'components', 'capabilities', 'what can it do', 'features'],
      answer: "Oranga Core is built around four layers:<br><br><strong>1. Knowledge:</strong> your business written down once, read before every session, so it never needs re-briefing.<br><strong>2. Playbooks:</strong> repeatable jobs it runs on request (the <em>mailroom</em> and the <em>strategist</em> ship built).<br><strong>3. Scheduled work:</strong> the <em>dawn run</em> clears your list before you open your laptop.<br><strong>4. Guardrails:</strong> six actions it never takes without a person."
    },
    {
      keywords: ['knowledge', 'knows the business', 'brief', 'briefing', 're-explain', 'context', 'remember'],
      answer: "The knowledge layer is your business written down once: what you do, who you serve, how you write, who's on the team. Oranga Core reads it before every session, so you never explain yourself to a chatbot from scratch again."
    },
    {
      keywords: ['playbook', 'playbooks', 'mailroom', 'strategist', 'inbox', 'email', 'drafts', 'jobs', 'tasks'],
      answer: "Playbooks are repeatable jobs written as plain instructions. Two ship built:<br><br><strong>The mailroom:</strong> sorts your inbox, runs small errands, and drafts replies in your own voice. It never sends; a person always does.<br><strong>The strategist:</strong> takes a goal (not a task), works out the real problem, and runs your other playbooks to get there.<br><br>New playbooks get added as your repeated work becomes clear."
    },
    {
      keywords: ['dawn run', 'scheduled', 'schedule', 'overnight', 'morning', 'before i start', 'while away', 'automatic', 'timer', 'runs on its own'],
      answer: "The <strong>dawn run</strong> is scheduled work: before you open your laptop, it works through what's outstanding, finishes what it safely can, and leaves one short note: <em>done, needs you, couldn't move</em>. And if something breaks, it says so loudly, it never mistakes an error for “nothing to do.”"
    },
    {
      keywords: ['guardrail', 'guardrails', 'safe', 'safety', 'rogue', 'never', 'control', 'mistake', 'wrong', 'trust', 'risk', 'acts alone', 'send', 'oversight', 'permission'],
      answer: "Oranga Core prepares everything right up to the line, then a person takes the final step, every time. There are <strong>six actions it never takes alone</strong>: contact anyone outside the business, move money, change anyone's job, do anything that can't be undone, sign or commit the business to anything, or weaken its own oversight."
    },
    {
      keywords: ['who is this for', 'right fit', 'do you work with', 'industry', 'target', 'clients', 'who do you work with', 'tradie', 'tradies', 'dental', 'allied health', 'real estate', 'cleaning', 'coaching', 'small business', 'right for me', 'suited', 'for me', 'my business', 'business type'],
      answer: "Oranga Core is built first for trade business owners: electrical, plumbing, civil and construction, concrete, landscaping. Still on the tools, still running lean, with the admin between real jobs eating into the night. It suits other owner-operated service businesses too, if that's the shape of your problem."
    },
    {
      keywords: ['process', 'how do you work', 'steps', 'install', 'installation', 'setup', 'set up', 'onboard', 'onboarding', 'what happens', 'next steps', 'after i sign up', 'get started how'],
      answer: "An install runs in six steps:<br><br><strong>1. Intake:</strong> understanding your business, tools, and real pinch points.<br><strong>2. Build:</strong> your knowledge layer drafted from your own mail and documents; tools linked; your writing style captured.<br><strong>3. Test:</strong> proven on real low-stakes work first, including a deliberate test that a broken connection fails loudly.<br><strong>4. Handover:</strong> you and your team know how to run it.<br><strong>5. 30 days support:</strong> we tune it against real work as it beds in.<br><strong>6. After that:</strong> it's yours to run, no subscription."
    },
    {
      keywords: ['price', 'pricing', 'cost', 'how much', 'rate', 'fee', 'budget', 'monthly', 'pay', 'payment', 'charge', 'invest', 'investment', 'afford', 'total', 'retainer', 'expensive', 'cheap', 'per month'],
      answer: "Oranga Core is <strong>$5,000 AUD flat</strong>, installed, including 30 days of support while it beds in. No monthly retainer, no subscription. It's a one-off cost, cheaper than hiring an office admin, and you're not paying it again every year."
    },
    {
      keywords: ['contract', 'lock', 'locked in', 'cancel', 'cancellation', 'commitment', 'tied', 'exit', 'quit', 'flexible', 'lock-in', 'no contract'],
      answer: "No lock-in contracts. If it's not working for you, we'd rather know and fix it. The goal is for the system to earn its keep, if it isn't, that's a conversation worth having."
    },
    {
      keywords: ['book', 'meeting', 'consultation', 'demo', 'call', 'strategy call', 'free call', 'schedule a call', 'speak to', 'talk', 'get started', 'sign up', 'ready', 'interested', 'keen', 'tell me more', 'want to know'],
      answer: "Easy, book a free 30-minute strategy call. We go through your business, find where time and leads are leaking, and show you exactly what Oranga Core would handle. No pitch, no pressure." + "<br>" + BOOK_BTN
    },
    {
      keywords: ['contact', 'email', 'reach', 'get in touch', 'support'],
      answer: "Two ways: book a free strategy call via the chat for the fastest answer, or email <a href='mailto:support@orangaai.com'>support@orangaai.com</a>."
    },
    {
      keywords: ['founder', 'team', 'who runs', 'who built', 'who made', 'eru', 'osborne', 'background', 'experience', 'credentials', 'about the team'],
      answer: "Oranga AI is founded by <strong>Eru Osborne</strong>: 15 years building IT systems for a university, from help desk to senior systems engineer, before building them for owner-operated businesses. Oranga Core is built the way it is (knowledge written down, hard guardrails) because that's how real systems are meant to work."
    },
    {
      keywords: ['different', 'unique', 'competitors', 'why hire', 'why should i', 'convince me', 'what makes you', 'better than', 'vs', 'versus', 'alternative', 'chatbot', 'chatgpt subscription', 'stand out', 'why oranga'],
      answer: "A generic chatbot starts from zero every conversation and just answers questions. Oranga Core reads your real knowledge before every session, <em>finishes</em> the work then hands the last step to a person, runs scheduled work while you're away, learns to write like you, and has six locked actions it will never take alone. It's a system we install and stand behind, not a subscription you're left to configure."
    },
    {
      keywords: ['result', 'outcome', 'roi', 'guarantee', 'expect', 'success', 'proof', 'worked', 'helped', 'saved', 'time back', 'hours'],
      answer: "The goal isn't “digital transformation,” it's getting three hours of a Tuesday back. Every install is built to clear routine work off your plate and stop things slipping through the cracks. The strategy call is where we show you where your time and leads are leaking and what fixing it is worth."
    },
    {
      keywords: ['location', 'where are you', 'remote', 'based', 'country', 'gold coast', 'australia', 'new zealand', 'nz', 'local'],
      answer: "Built on the Gold Coast, Australia. Discovery, builds, and ongoing support happen over video and async, no travel needed."
    },
    {
      keywords: ['integration', 'tools', 'crm', 'stack', 'connect', 'works with', 'whatsapp', 'slack', 'teams', 'spreadsheet', 'calendar', 'existing tools', 'compatible', 'systems'],
      answer: "Oranga Core links to the tools you already run: mail, calendars, CRMs, Slack or Teams, spreadsheets. Alerts land as a single clear message on your chosen channel; it never invents a second way of reaching anyone. Not sure your stack will play nicely? That's what the strategy call is for."
    }
  ];

  var SUGGESTIONS = [
    "What is Oranga Core?",
    "How does it work?",
    "Is it safe?",
    "Who is it for?",
    "Book a call"
  ];

  function addMessage(text, who, opts) {
    opts = opts || {};
    var msg = document.createElement('div');
    msg.className = 'msg ' + who;
    if (opts.html) msg.innerHTML = text; else msg.textContent = text;
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return msg;
  }

  function showTyping() {
    var t = document.createElement('div');
    t.className = 'msg bot typing';
    t.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(t);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return t;
  }

  function renderSuggestions(list) {
    if (!suggestionsEl) return;
    suggestionsEl.innerHTML = '';
    list.forEach(function (q) {
      var chip = document.createElement('button');
      chip.className = 'suggestion-chip';
      chip.type = 'button';
      chip.textContent = q;
      chip.addEventListener('click', function () {
        if (q === 'Book a call' && typeof window.startBookingFlow === 'function') {
          suggestionsEl.innerHTML = '';
          window.startBookingFlow();
          return;
        }
        handleUserMessage(q);
        suggestionsEl.innerHTML = '';
      });
      suggestionsEl.appendChild(chip);
    });
  }

  function findAnswer(query) {
    var q = ' ' + query.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
    var best = null, bestScore = 0;
    KB.forEach(function (entry) {
      var score = 0;
      entry.keywords.forEach(function (kw) {
        var k = kw.toLowerCase();
        if (q.indexOf(' ' + k + ' ') !== -1) score += 10 + k.length * 0.5;
        else if (q.indexOf(k) !== -1) score += 4 + k.length * 0.2;
      });
      if (score > bestScore) { bestScore = score; best = entry; }
    });
    return bestScore >= 3 ? best.answer : null;
  }

  function handleUserMessage(text) {
    var trimmed = (text || '').trim();
    if (!trimmed) return;
    addMessage(trimmed, 'user');
    inputEl.value = '';
    var typing = showTyping();
    var delay = 400 + Math.min(800, trimmed.length * 12);
    setTimeout(function () {
      typing.remove();
      var answer = findAnswer(trimmed);
      if (answer) {
        addMessage(answer, 'bot', { html: true });
      } else {
        addMessage("I don't have a clean answer for that one, but our team will. The fastest way is to book a call via the chat or email <a href='mailto:support@orangaai.com'>support@orangaai.com</a>. Or try one of these:", 'bot', { html: true });
        renderSuggestions(SUGGESTIONS.slice(0, 4));
      }
    }, delay);
  }
  window.handleUserMessage = handleUserMessage;

  function openChat() {
    panel.classList.add('open');
    if (launcher) launcher.classList.add('open');
    inputEl.focus();
    if (!messagesEl.dataset.greeted) {
      messagesEl.dataset.greeted = '1';
      setTimeout(function () {
        addMessage("Kia ora, I'm Oranga AI's assistant. Ask me anything about Oranga Core, how it works, or how to book a call.", 'bot', { html: true });
        renderSuggestions(SUGGESTIONS);
      }, 240);
    }
  }
  function closeChat() {
    panel.classList.remove('open');
    if (launcher) launcher.classList.remove('open');
  }
  // Open the chat and jump straight into the booking flow (used by strategy-call CTAs).
  function openBookingChat() {
    openChat();
    if (typeof window.startBookingFlow === 'function') {
      setTimeout(window.startBookingFlow, 280);
    }
  }
  window.openChat = openChat;
  window.closeChat = closeChat;
  window.openBookingChat = openBookingChat;

  if (launcher) {
    launcher.addEventListener('click', function () {
      if (panel.classList.contains('open')) closeChat(); else openChat();
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', closeChat);
  formEl.addEventListener('submit', function (e) {
    e.preventDefault();
    handleUserMessage(inputEl.value);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('open')) closeChat();
  });

  /* --- Proactive chat teaser --- */
  var teaser = document.getElementById('chatTeaser');
  var teaserClose = document.getElementById('chatTeaserClose');
  if (teaser) {
    var TEASER_KEY = 'orangaChatTeaserSeen';
    var teaserTimer = null;
    if (!sessionStorage.getItem(TEASER_KEY)) {
      teaserTimer = setTimeout(function () {
        teaser.classList.add('show');
      }, 6000);
    }
    function dismissTeaser() {
      teaser.classList.remove('show');
      sessionStorage.setItem(TEASER_KEY, '1');
      if (teaserTimer) clearTimeout(teaserTimer);
    }
    teaser.addEventListener('click', function () {
      dismissTeaser();
      openChat();
    });
    if (teaserClose) {
      teaserClose.addEventListener('click', function (e) {
        e.stopPropagation();
        dismissTeaser();
      });
    }
    if (launcher) launcher.addEventListener('click', dismissTeaser);
  }
})();
