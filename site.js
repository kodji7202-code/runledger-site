/* RunLedger site: vanilla JS, no dependencies, no network requests.
   <html class="js motion"> is set by an inline script in <head>; "motion" is absent when the
   visitor prefers reduced motion, so every animation below is skipped and content stays static. */
(function () {
  "use strict";
  var d = document, root = d.documentElement, motion = root.classList.contains("motion");
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var clamp = function (v) { return Math.max(0, Math.min(1, v)); };

  /* Mobile menu */
  var hdr = $(".hdr"), tog = $(".tog");
  function setMenu(open) {
    hdr.classList.toggle("open", open);
    d.body.classList.toggle("lock", open);
    tog.setAttribute("aria-expanded", open);
    tog.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  if (tog) {
    tog.addEventListener("click", function () { setMenu(tog.getAttribute("aria-expanded") !== "true"); });
    $$(".nav a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    d.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && hdr.classList.contains("open")) { setMenu(false); tog.focus(); }
    });
    var mq = window.matchMedia("(min-width: 960px)");
    var onMq = function () { if (mq.matches) setMenu(false); };
    if (mq.addEventListener) mq.addEventListener("change", onMq); else mq.addListener(onMq);
  }

  /* Copy buttons */
  function fallbackCopy(text) {
    var t = d.createElement("textarea");
    t.value = text; t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;opacity:0";
    d.body.appendChild(t); t.select();
    var ok = false;
    try { ok = d.execCommand("copy"); } catch (e) { ok = false; }
    d.body.removeChild(t);
    return ok;
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }
  $$("[data-copy]").forEach(function (btn) {
    var label = $(".cmd__tx span", btn), status = btn.parentNode.querySelector(".sr"), timer;
    btn.addEventListener("click", function () {
      copyText(btn.getAttribute("data-copy")).then(function (ok) {
        btn.classList.toggle("done", ok);
        if (label) label.textContent = ok ? "Copied" : "Press Ctrl+C";
        if (status) status.textContent = ok ? "Copied to clipboard" : "Copy failed, select the text and copy it";
        clearTimeout(timer);
        timer = setTimeout(function () {
          btn.classList.remove("done");
          if (label) label.textContent = "Copy";
          if (status) status.textContent = "";
        }, 2200);
      });
    });
  });

  /* Reveals */
  var seen = "IntersectionObserver" in window;
  if (motion && seen) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    $$(".rv").forEach(function (el) { io.observe(el); });
    // Safety net: if the observer misses an element (fast jumps, anchors, print), reveal it anyway.
    var sweep = function () {
      var vh = window.innerHeight;
      $$(".rv:not(.in)").forEach(function (el) {
        if (el.getBoundingClientRect().top < vh) { el.classList.add("in"); io.unobserve(el); }
      });
    };
    window.addEventListener("scroll", sweep, { passive: true });
    window.addEventListener("hashchange", sweep);
    setTimeout(function () { sweep(); }, 1200);
    setTimeout(function () { $$(".rv:not(.in)").forEach(function (el) { el.classList.add("in"); }); }, 6000);
  }

  /* Magnetic primary buttons: a few pixels of pull toward the pointer (transform only, fine pointers only). */
  if (motion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    $$(".btn:not(.btn--sm)").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty("--tx", ((e.clientX - r.left - r.width / 2) * 0.14).toFixed(1) + "px");
        b.style.setProperty("--ty", ((e.clientY - r.top - r.height / 2) * 0.22).toFixed(1) + "px");
      });
      b.addEventListener("pointerleave", function () { b.style.removeProperty("--tx"); b.style.removeProperty("--ty"); });
    });
  }

  /* Bento spotlight */
  if (motion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    $$(".cell").forEach(function (c) {
      c.addEventListener("pointermove", function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty("--mx", (e.clientX - r.left) + "px");
        c.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* Scroll-linked: progress bar, word highlight, steps rail */
  var prog = $(".prog"), big = $(".big"), words = [], lit = 0, rail = $(".steps__fill"), steps = $(".steps");
  if (motion && big) {
    var parts = big.textContent.trim().split(/\s+/);
    big.setAttribute("aria-label", parts.join(" "));
    big.textContent = "";
    parts.forEach(function (w, i) {
      var s = d.createElement("span");
      s.className = "wd"; s.textContent = w; s.setAttribute("aria-hidden", "true");
      big.appendChild(s);
      if (i < parts.length - 1) big.appendChild(d.createTextNode(" "));
      words.push(s);
    });
  }
  var ticking = false;
  function frame() {
    ticking = false;
    var vh = window.innerHeight, y = window.pageYOffset, max = root.scrollHeight - vh;
    if (prog) prog.style.transform = "scaleX(" + (max > 0 ? clamp(y / max) : 0) + ")";
    if (!motion) return;
    if (words.length) {
      var r = big.getBoundingClientRect();
      var n = Math.round(clamp((vh * 0.85 - r.top) / (vh * 0.5)) * words.length);
      if (n !== lit) { words.forEach(function (w, i) { w.classList.toggle("on", i < n); }); lit = n; }
    }
    if (rail && steps) {
      var s = steps.getBoundingClientRect();
      rail.style.transform = "scaleY(" + clamp((vh * 0.5 - s.top) / s.height) + ")";
    }
  }
  function queue() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  frame();

  /* How it works: active step */
  var stepEls = $$(".step"), navLis = $$(".how__nav li");
  function activate(i) {
    stepEls.forEach(function (s, k) { s.classList.toggle("act", k === i); });
    navLis.forEach(function (l, k) { l.classList.toggle("act", k === i); });
  }
  if (stepEls.length) {
    activate(0);
    if (seen) {
      var so = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) activate(stepEls.indexOf(e.target)); });
      }, { rootMargin: "-42% 0px -50% 0px" });
      stepEls.forEach(function (s) { so.observe(s); });
    }
  }

  /* Receipt tape: types each step, then totals. Static (fully printed) when motion is off. */
  var tape = $(".tape");
  if (tape && motion && seen) {
    var rows = $$(".row", tape), ft = $(".tape__ft", tape), score = $("[data-score]", tape);
    var timers = [], running = false;
    rows.forEach(function (r) { r.setAttribute("data-t", $(".t", r).textContent); });
    rows.forEach(function (r) { $(".t", r).textContent = ""; });
    var later = function (fn, ms) { timers.push(setTimeout(fn, ms)); };
    var stop = function () { timers.forEach(clearTimeout); timers = []; };
    var showAll = function () {
      stop(); running = false;
      rows.forEach(function (r) { $(".t", r).textContent = r.getAttribute("data-t"); r.classList.remove("typing"); r.classList.add("on"); });
      ft.classList.add("on"); if (score) score.textContent = "80";
    };
    var clear = function () {
      rows.forEach(function (r) { r.classList.remove("on", "typing"); $(".t", r).textContent = ""; });
      ft.classList.remove("on"); if (score) score.textContent = "0";
    };
    var type = function (r, done) {
      var t = $(".t", r), full = r.getAttribute("data-t"), i = 0;
      (function step() {
        i += 2; t.textContent = full.slice(0, i);
        if (i < full.length) later(step, 22); else done();
      })();
    };
    var count = function () {
      var t0 = performance.now();
      (function tick(now) {
        var p = clamp((now - t0) / 900);
        if (score) score.textContent = Math.round(80 * (1 - Math.pow(1 - p, 3)));
        if (p < 1 && running) requestAnimationFrame(tick);
      })(t0);
    };
    var play = function () {
      running = true; clear();
      var i = 0;
      (function next() {
        if (i >= rows.length) {
          ft.classList.add("on"); count();
          later(function () { clear(); later(play, 700); }, 8000);
          return;
        }
        var r = rows[i++];
        r.classList.add("on", "typing");
        type(r, function () { r.classList.remove("typing"); later(next, 140); });
      })();
    };
    new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { if (!running) { stop(); later(play, 500); } } else if (running || timers.length) showAll();
    }, { threshold: 0.25 }).observe(tape);
  }

  /* Guard demo */
  var cases = $$(".case"), res = $(".term .res");
  if (cases.length && res) {
    var cur = 0, auto = null, touched = false;
    var fill = function (i) {
      var c = cases[i], g = function (k) { return c.getAttribute("data-" + k); };
      cases.forEach(function (b, k) { b.setAttribute("aria-pressed", k === i); });
      $(".cmdline", res).textContent = g("cmd");
      $(".tool", res).textContent = g("tool");
      var v = $(".verdict .bd", res);
      v.className = "bd bd--" + g("d"); v.textContent = g("d");
      $(".code-sev", res).textContent = g("code");
      $(".why", res).textContent = g("why");
      $(".out", res).textContent = g("out");
      cur = i;
    };
    var show = function (i) {
      if (!motion) return fill(i);
      res.classList.add("swap");
      setTimeout(function () { fill(i); res.classList.remove("swap"); }, 160);
    };
    cases.forEach(function (b, i) {
      b.addEventListener("click", function () { touched = true; clearInterval(auto); show(i); });
    });
    fill(0);
    if (motion && seen) {
      new IntersectionObserver(function (es) {
        clearInterval(auto);
        if (es[0].isIntersecting && !touched) auto = setInterval(function () { show((cur + 1) % cases.length); }, 3600);
      }, { threshold: 0.4 }).observe($(".demo"));
    }
  }
})();
