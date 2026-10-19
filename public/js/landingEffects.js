'use strict';

/**
 * Landing page UX effects: sticky header state, scroll progress, back-to-top,
 * card spotlight and header navigation helpers.
 * Also used by other pages with body.sticky-header (new call, privacy); each feature
 * no-ops when its elements are absent. Dependency free; degrades gracefully.
 * Scroll reveal is handled by landing.js through the existing reveal-* classes.
 */
(function () {
    const root = document.documentElement;
    const header = document.querySelector('.site-header');
    const backToTop = document.getElementById('backToTop');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scrollBehavior = reducedMotion ? 'auto' : 'smooth';

    // Header glass state, scroll progress bar and back-to-top visibility.
    function initScrollState() {
        const progress = document.querySelector('.scroll-progress');
        let ticking = false;

        function update() {
            ticking = false;
            const y = window.scrollY || root.scrollTop;
            const max = Math.max(root.scrollHeight - window.innerHeight, 1);
            if (header) header.classList.toggle('is-scrolled', y > 8);
            if (progress) progress.style.transform = `scaleX(${Math.min(y / max, 1)})`;
            if (backToTop) backToTop.hidden = y < 700;
        }

        window.addEventListener(
            'scroll',
            () => {
                if (!ticking) {
                    ticking = true;
                    window.requestAnimationFrame(update);
                }
            },
            { passive: true }
        );
        update();

        if (backToTop) {
            backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: scrollBehavior }));
        }
    }

    // Soft spotlight that follows the pointer over feature cards (mouse/pen only).
    function initSpotlight() {
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        document.querySelectorAll('.features-tiles .tiles-item-inner').forEach((card) => {
            card.addEventListener(
                'pointermove',
                (e) => {
                    const rect = card.getBoundingClientRect();
                    card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
                    card.style.setProperty('--my', `${e.clientY - rect.top}px`);
                },
                { passive: true }
            );
        });
    }

    // "Start a meeting" jumps to the room name field and focuses it.
    function initStartMeeting() {
        const link = document.getElementById('startMeetingLink');
        const input = document.getElementById('roomName');
        if (!link || !input) return;

        link.addEventListener('click', (e) => {
            e.preventDefault();
            input.scrollIntoView({ behavior: scrollBehavior, block: 'center' });
            input.focus({ preventScroll: true });
        });
    }

    // Hide nav links pointing to sections that a brand configuration removed.
    function pruneNavLinks() {
        document.querySelectorAll('.landing-nav-link[href^="#"]').forEach((link) => {
            const target = document.querySelector(link.getAttribute('href'));
            if (!target || getComputedStyle(target).display === 'none') link.hidden = true;
        });
    }

    // Keep the header nav/brand clear of the support widget's minimized/reopener button
    // when it sits at a top corner, by shifting them inward by exactly the overlap.
    function initWidgetAvoidance() {
        const headerInner = document.querySelector('.site-header-inner');
        const nav = document.querySelector('.landing-nav');
        const brand = document.querySelector('.site-header .brand');
        if (!headerInner || !nav || !brand) return;

        const GAP = 12;
        const selector =
            '.mirotalk-minimized-btn.top-right, .mirotalk-reopener-btn.top-right, ' +
            '.mirotalk-minimized-btn.top-left, .mirotalk-reopener-btn.top-left';
        let pending = false;

        function measure() {
            pending = false;
            headerInner.style.setProperty('--widget-avoid-right', '0px');
            headerInner.style.setProperty('--widget-avoid-left', '0px');
            headerInner.classList.remove('is-tight');

            document.querySelectorAll(selector).forEach((btn) => {
                const b = btn.getBoundingClientRect();
                if (!b.width || !b.height) return;
                if (btn.classList.contains('top-right')) {
                    const overlap = nav.getBoundingClientRect().right - (b.left - GAP);
                    if (overlap > 0) headerInner.style.setProperty('--widget-avoid-right', `${Math.ceil(overlap)}px`);
                } else {
                    const overlap = b.right + GAP - brand.getBoundingClientRect().left;
                    if (overlap > 0) headerInner.style.setProperty('--widget-avoid-left', `${Math.ceil(overlap)}px`);
                }
            });

            // Small screens: compact the nav if it now collides with the brand.
            if (nav.getBoundingClientRect().left < brand.getBoundingClientRect().right + GAP) {
                headerInner.classList.add('is-tight');
            }
        }

        function schedule() {
            if (pending) return;
            pending = true;
            Promise.resolve().then(measure);
        }

        // widget.js appends/removes these buttons directly on <body>.
        new MutationObserver(schedule).observe(document.body, { childList: true });
        window.addEventListener('resize', schedule, { passive: true });
        window.addEventListener('load', schedule);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
        schedule();
    }

    initScrollState();
    initSpotlight();
    initStartMeeting();
    initWidgetAvoidance();
    // Brand settings may hide sections after an async fetch, so prune once they are applied.
    if (window.brandReady) pruneNavLinks();
    document.addEventListener('brand:ready', pruneNavLinks);
    window.addEventListener('load', pruneNavLinks);
})();
