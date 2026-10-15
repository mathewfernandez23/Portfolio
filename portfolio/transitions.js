/* =========================================================
   PAGE TRANSITIONS
   1. On My Projects: clicking a piece keeps it in place while
      the rest of the page fades away.
   2. On the project page: that same piece travels from where
      it was to the big image's spot, growing or shrinking to
      fit, then the description text fades in.
   ========================================================= */

(function () {
  var STORAGE_KEY = 'projectZoom';
  var LEAVE_TIME = 350;   // fade-out on My Projects before the new page opens (ms)
  var MOVE_TIME = 700;    // how long the piece takes to travel into place (ms)

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- PART 1: leaving My Projects ---------- */

  var projectLinks = document.querySelectorAll(
    '.project-gallery a, .social-collage a, .logo-gallery a, .ux-collage a'
  );

  projectLinks.forEach(function (link) {
    link.addEventListener('click', function (event) {
      var img = link.querySelector('img');
      var href = link.getAttribute('href');

      // Let normal clicks through: new-tab clicks, no image, no link, reduced motion
      if (!img || !href || href === '#' || reduceMotion ||
          event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
        return;
      }

      event.preventDefault();

      var box = img.getBoundingClientRect();
      var imgStyle = getComputedStyle(img);

      // Remember where the piece was, so the next page can start it from there
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          src: img.currentSrc || img.src,
          left: box.left, top: box.top, width: box.width, height: box.height,
          border: imgStyle.border,
          time: Date.now()
        }));
      } catch (e) { /* storage blocked: the next page just loads normally */ }

      // Dark layer that fades over everything below the header
      var header = document.querySelector('.site-header');
      var headerBottom = header ? Math.max(header.getBoundingClientRect().bottom, 0) : 0;
      var overlay = document.createElement('div');
      overlay.className = 'zoom-overlay';
      overlay.style.top = headerBottom + 'px';
      document.body.appendChild(overlay);

      // Copy of the clicked piece, held on top so it stays visible
      var clone = makeClone(img.currentSrc || img.src, box, imgStyle.border);
      document.body.appendChild(clone);
      img.style.visibility = 'hidden';

      requestAnimationFrame(function () {
        overlay.classList.add('is-visible');
      });

      setTimeout(function () {
        window.location.href = href;
      }, LEAVE_TIME);
    });
  });

  /* ---------- PART 2: arriving on a project page ---------- */

  var saved = null;
  try {
    saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) { saved = null; }

  var targets = document.querySelectorAll('.detail-image');

  // Only run if we just came from a click (within the last few seconds)
  if (saved && targets.length && !reduceMotion && Date.now() - saved.time < 5000) {
    // Pick the big image that matches the clicked piece, or the first one
    var target = targets[0];
    targets.forEach(function (t) {
      if (sameFile(t.currentSrc || t.src, saved.src)) { target = t; }
    });

    document.documentElement.classList.add('is-arriving');
    target.style.visibility = 'hidden';

    var startClone = makeClone(saved.src, saved, saved.border);
    document.body.appendChild(startClone);

    whenLoaded(target, function () {
      // Wait one frame so the page has finished laying out
      requestAnimationFrame(function () {
        var end = target.getBoundingClientRect();
        var endBorder = getComputedStyle(target).border;

        var move = startClone.animate([
          { left: saved.left + 'px', top: saved.top + 'px',
            width: saved.width + 'px', height: saved.height + 'px',
            border: saved.border },
          { left: end.left + 'px', top: end.top + 'px',
            width: end.width + 'px', height: end.height + 'px',
            border: endBorder }
        ], { duration: MOVE_TIME, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' });

        move.onfinish = function () {
          target.style.visibility = '';
          startClone.remove();
          // Now let the description fade in
          document.documentElement.classList.add('has-arrived');
        };
      });
    });
  }

  // If the visitor uses the Back button, clean up leftovers
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
      document.querySelectorAll('.zoom-overlay, .zoom-clone').forEach(function (el) {
        el.remove();
      });
      document.querySelectorAll('img').forEach(function (img) {
        img.style.visibility = '';
      });
    }
  });

  /* ---------- helpers ---------- */

  function makeClone(src, box, border) {
    var clone = document.createElement('img');
    clone.src = src;
    clone.alt = '';
    clone.className = 'zoom-clone';
    clone.style.left = box.left + 'px';
    clone.style.top = box.top + 'px';
    clone.style.width = box.width + 'px';
    clone.style.height = box.height + 'px';
    clone.style.border = border || 'none';
    return clone;
  }

  function whenLoaded(img, callback) {
    if (img.complete && img.naturalWidth) { callback(); }
    else {
      img.addEventListener('load', callback, { once: true });
      img.addEventListener('error', function () {
        img.style.visibility = '';
        document.querySelectorAll('.zoom-clone').forEach(function (el) { el.remove(); });
        document.documentElement.classList.add('has-arrived');
      }, { once: true });
    }
  }

  function sameFile(a, b) {
    try { return decodeURI(a) === decodeURI(b); } catch (e) { return a === b; }
  }
})();