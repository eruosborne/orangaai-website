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

  var BOOK_BTN = "<button type='button' class='btn btn-primary' onclick='if(window.startBookingFlow)window.startBookingFlow()' style='margin-top:6px;'>Book a call</button>";

  var KB = [
    {
      keywords: ['hi', 'hello', 'hey', 'howdy', 'greetings', 'kia ora', 'sup', 'yo', 'g day', 'good morning', 'good afternoon', 'good evening'],
      answer: "Kia ora, I'm Oranga AI's assistant. Ask me about Oranga Core, how it works, whether it's a fit for your business, or how to book a free strategy call."
    },
    {
      keywords: ['what is oranga', 'who are you', 'what do you do', 'about oranga', 'about you', 'what is this', 'tell me about', 'explain what', 'describe what', 'overview', 'summary', 'what is oranga core', 'what exactly', 'what is core'],
      answer: "<strong>Oranga Core</strong> is an AI system that runs on your laptop and does the admin between jobs: inbox, follow-ups, scheduling and quoting. It's built around your business and how you write, and it prepares everything but never sends, spends or signs anything without your approval. We build it, install it and walk you through it."
    },
    {
      keywords: ['oranga', 'maori', 'name mean', 'meaning', 'wellbeing', 'thriving'],
      answer: "<strong>Oranga</strong> is a Māori word meaning <em>wellbeing</em> and <em>thriving</em>. Built on the Gold Coast, for owners who want their evenings back."
    },
    {
      keywords: ['layers', 'four layers', 'how does it work', 'how it works', 'what does it do', 'parts', 'components', 'capabilities', 'what can it do', 'features'],
      answer: "Oranga Core has four parts:<br><br><strong>1. Knowledge:</strong> your business written down once (what you sell, who you sell to, how you write). It reads this before every job, so you never re-explain yourself.<br><strong>2. Playbooks:</strong> repeatable jobs written as plain steps, like sorting your inbox or building a quote. It follows them the same way every time.<br><strong>3. Scheduled work:</strong> the <em>dawn run</em> clears what it safely can before you open your laptop.<br><strong>4. Guardrails:</strong> six actions it never takes without you."
    },
    {
      keywords: ['knowledge', 'knows the business', 'brief', 'briefing', 're-explain', 'context', 'remember'],
      answer: "The knowledge part is your business written down once: what you do, who you serve, your prices, how you write, who's on the team. Oranga Core reads it before every job, so it starts with your business in mind instead of from scratch."
    },
    {
      keywords: ['playbook', 'playbooks', 'mailroom', 'strategist', 'inbox', 'drafts', 'jobs', 'tasks', 'quote', 'quoting', 'build a playbook', 'new playbook'],
      answer: "A playbook is a repeatable job written as plain steps. For quoting it might be: read the enquiry, check my rates, write the quote. It follows those steps the same way every time.<br><br>You don't code it. You describe how you do the job, it asks you questions, and it writes the playbook for you.<br><br>Two ship built:<br><strong>The mailroom:</strong> sorts your inbox, runs small errands, and drafts replies in your own voice. It never sends; you do.<br><strong>The strategist:</strong> takes a goal, works out the real problem, and runs your other playbooks to get there."
    },
    {
      keywords: ['dawn run', 'scheduled', 'schedule', 'overnight', 'morning', 'before i start', 'while away', 'automatic', 'timer', 'runs on its own'],
      answer: "The <strong>dawn run</strong> is scheduled work: before you open your laptop, it works through what's outstanding, finishes what it safely can, and leaves one short note: <em>done, needs you, couldn't move</em>. If something breaks, it says so loudly. It never mistakes an error for “nothing to do.”"
    },
    {
      keywords: ['guardrail', 'guardrails', 'safe', 'safety', 'rogue', 'never', 'control', 'mistake', 'wrong', 'trust', 'risk', 'acts alone', 'send', 'oversight', 'permission', 'without asking', 'approve'],
      answer: "Oranga Core prepares everything right up to the line, then you take the final step, every time. Replies sit as drafts until you send them. There are <strong>six actions it never takes alone</strong>: contact anyone outside the business, move money, change anyone's job, do anything that can't be undone, sign or commit the business to anything, or weaken its own oversight."
    },
    {
      keywords: ['who is this for', 'who is it for', 'who is it built for', 'who is core for', 'right fit', 'do you work with', 'industry', 'target', 'clients', 'who do you work with', 'tradie', 'tradies', 'trades', 'hospitality', 'consulting', 'services', 'small business', 'right for me', 'suited', 'for me', 'my business', 'business type', 'owner operator'],
      answer: "Oranga Core is for owner-operators of established businesses who are still working in the business and doing the admin at night: trades, hospitality, consulting and other service businesses. If you're up late on quotes, follow-ups and replies after a full day, that's the shape of the problem it fixes."
    },
    {
      keywords: ['not for', 'not a fit', 'startup', 'start up', 'just starting', 'too small', 'new business', 'who should not'],
      answer: "It's not the right fit for startups, or for businesses that don't have admin piling up yet. It's also not the first step if you mainly want more leads: get the admin foundation sorted first, then growth work builds on top. We'll tell you straight on the call if it's not a fit."
    },
    {
      keywords: ['process', 'how do you work', 'steps', 'install', 'installation', 'setup', 'set up', 'onboard', 'onboarding', 'what happens', 'next steps', 'after i sign up', 'get started how', 'how long'],
      answer: "The install is done remotely, built around your actual business and walked through with you:<br><br><strong>1. Map your business:</strong> a guided interview builds the knowledge base.<br><strong>2. Connect your tools:</strong> mail, calendar and accounts, so it works on your real work.<br><strong>3. Switch on the mailroom:</strong> it sorts your inbox and prepares replies in your voice.<br><strong>4. Dawn run (optional):</strong> a timed job that clears what it safely can before you start.<br><strong>5. Guardrails and handover:</strong> you're walked through it, then it's yours to run.<br><br>Most installs take less than a working day, somewhere between about 3 and 8 hours depending on the tools you use. Anything beyond that, like more seats or a custom playbook, is scoped separately."
    },
    {
      keywords: ['price', 'pricing', 'cost', 'how much', 'rate', 'fee', 'budget', 'monthly', 'pay', 'payment', 'charge', 'invest', 'investment', 'afford', 'total', 'retainer', 'expensive', 'cheap', 'per month'],
      answer: "The install is a one-off flat fee, with one seat included, so you know the cost up front. There are two optional extras: always-on hosting with phone access, and ongoing maintenance if you'd like us to look after it (no lock-in). We go through the exact numbers on the free strategy call, once you've seen how it would fit your business." + "<br>" + BOOK_BTN
    },
    {
      keywords: ['guarantee', 'refund', 'money back', 'money-back', 'risk free', 'risk-free', 'what if it doesn', 'not work for me'],
      answer: "Yes. The install comes with a 30-day money-back guarantee: if it hasn't given you real time back or a noticeable productivity boost within 30 days of handover, you get a full refund."
    },
    {
      keywords: ['contract', 'lock', 'locked in', 'cancel', 'cancellation', 'commitment', 'tied', 'exit', 'quit', 'flexible', 'lock-in', 'no contract', 'subscription'],
      answer: "The install is a one-off, not a subscription. Ongoing maintenance is optional and has no lock-in. And the 30-day money-back guarantee means you're not stuck if it doesn't deliver."
    },
    {
      keywords: ['hosting', 'remote access', 'phone', 'laptop off', 'laptop is off', 'always on', 'always-on', 'maintenance', 'extras', 'add on', 'add-on', 'custom', 'more seats', 'seats', 'extra'],
      answer: "Beyond the standard install there are a few optional extras:<br><br><strong>Always-on hosting with phone access:</strong> so scheduled work runs even when your laptop is off, and you can check in from your phone.<br><strong>Ongoing maintenance:</strong> if you'd like us to look after it, no lock-in.<br><strong>Custom builds:</strong> more seats, or a bespoke playbook for a job unique to your business.<br><br>We scope and price these on the strategy call." + "<br>" + BOOK_BTN
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
      keywords: ['different', 'unique', 'competitors', 'why hire', 'why should i', 'convince me', 'what makes you', 'better than', 'vs', 'versus', 'alternative', 'chatbot', 'chatgpt', 'stand out', 'why oranga', 'tried ai', 'tried chatgpt'],
      answer: "General AI tools are a blank box: you have to set them up around your business and your voice, and most owners don't have the time. Oranga Core is installed for you, built around your business, and it prepares the work while you approve anything that matters. Six actions are locked, so it can't send, spend or sign on its own."
    },
    {
      keywords: ['result', 'outcome', 'roi', 'expect', 'success', 'proof', 'worked', 'helped', 'saved', 'time back', 'hours', 'evenings', 'case study', 'testimonial', 'clients so far'],
      answer: "The goal is your evenings back: admin finished before you get home, and every enquiry answered fast, even on a 12-hour day. One civil construction business had Oranga Core find a payment condition buried in a 30-page contract, and recovered $20,000 they wouldn't otherwise have chased. The strategy call is where we work out what fixing your admin would be worth."
    },
    {
      keywords: ['technical', 'tech savvy', 'ai savvy', 'not good with computers', 'learn', 'difficult', 'complicated', 'hard to use', 'non technical', 'non-technical', 'easy to use', 'i am not'],
      answer: "You don't need to be technical. It's installed and walked through with you, and you talk to it in plain English, like a new hire in their first week. If it isn't sure what you mean, it asks."
    },
    {
      keywords: ['quiz', 'admin exposure', 'score', 'assessment', 'how exposed'],
      answer: "There's a free 6-question quiz that shows how exposed your admin is. <a href='/admin-exposure'>Take the quiz</a> and you'll get a score in about a minute."
    },
    {
      keywords: ['location', 'where are you', 'remote', 'based', 'country', 'gold coast', 'australia', 'new zealand', 'nz', 'local'],
      answer: "Built on the Gold Coast, Australia. The install happens over video and async, so we work with owners across Australia and New Zealand, no travel needed."
    },
    {
      keywords: ['integration', 'tools', 'crm', 'stack', 'connect', 'works with', 'xero', 'gmail', 'google', 'calendar', 'existing tools', 'compatible', 'systems', 'accounts'],
      answer: "Oranga Core connects to your mail, calendar and accounts, so it works on your real business, not a demo. Other tools depend on your setup, so we confirm what's possible on the strategy call."
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
