!(function () {
    'use strict';
    const e = document.getElementsByClassName('accordion-header');

    function t(e, t) {
        e.classList.add('is-active'), (t.style.maxHeight = t.scrollHeight + 'px');
    }

    function n(e, t) {
        e.classList.remove('is-active'), (t.style.maxHeight = null);
    }

    if (e.length > 0)
        for (let i = 0; i < e.length; i++) {
            const s = e[i],
                a = s.parentNode,
                l = s.nextElementSibling;
            a.classList.contains('is-active') && t(a, l),
                s.addEventListener('click', function () {
                    a.classList.contains('is-active') ? n(a, l) : t(a, l);
                });
        }
})(),
    (function () {
        'use strict';
        let e = {
            touchStartX: 0,
            touchEndX: 0,
            minSwipePixels: 30,
            detectionZone: void 0,
            swipeCallback: function () {},
            init: function (t, n) {
                (e.swipeCallback = n),
                    t.addEventListener(
                        'touchstart',
                        function (t) {
                            e.touchStartX = t.changedTouches[0].screenX;
                        },
                        !1,
                    ),
                    t.addEventListener(
                        'touchend',
                        function (t) {
                            (e.touchEndX = t.changedTouches[0].screenX), e.handleSwipeGesture();
                        },
                        !1,
                    );
            },
            handleSwipeGesture: function () {
                let t, n;
                e.touchEndX <= e.touchStartX && ((n = e.touchStartX - e.touchEndX), (t = 'left')),
                    e.touchEndX >= e.touchStartX && ((n = e.touchEndX - e.touchStartX), (t = 'right')),
                    n > e.minSwipePixels && 'undefined' !== t && e.swipe(t, n);
            },
            swipe: function (t, n) {
                let i = {};
                (i.direction = t), (i.movedPixels = n), e.swipeCallback(i);
            },
        };
        const t = document.getElementsByClassName('carousel-items');

        function n(e, t) {
            void 0 === t && (t = 'next');
            let n = e.getElementsByClassName('carousel-item is-active')[0],
                i = 'next' === t ? n.nextElementSibling : n.previousElementSibling,
                s = n.getAttribute('data-carousel'),
                a = e.parentNode.getElementsByClassName('carousel-bullet')[s],
                l = 'next' === t ? a.nextElementSibling : a.previousElementSibling;
            n.classList.remove('is-active'),
                a.classList.remove('is-active'),
                i
                    ? (i.classList.add('is-active'), l.classList.add('is-active'))
                    : 'next' === t
                    ? (e.firstElementChild.classList.add('is-active'),
                      e.parentNode
                          .getElementsByClassName('carousel-bullets')[0]
                          .firstElementChild.classList.add('is-active'))
                    : (e.lastElementChild.classList.add('is-active'),
                      e.parentNode
                          .getElementsByClassName('carousel-bullets')[0]
                          .lastElementChild.classList.add('is-active'));
        }

        function i(e, t) {
            let n,
                i = 0;
            for (let e = 0; e < t.length; e++)
                (t[0].parentNode.style.minHeight = i + 'px'),
                    t[e].classList.add('is-loading'),
                    (n = t[e].offsetHeight),
                    t[e].classList.remove('is-loading'),
                    n > i && (i = n);
            t[0].parentNode.style.minHeight = i + 'px';
        }

        function s(e) {
            e && clearInterval(e);
        }

        if (t.length > 0)
            for (let a = 0; a < t.length; a++) {
                let l = t[a],
                    c = l.getElementsByClassName('carousel-item'),
                    o = 0,
                    r = l.getAttribute('data-autorotate');
                const d = document.createElement('div');
                (d.className = 'carousel-bullets'), l.parentNode.insertBefore(d, l.nextSibling);
                for (let e = 0; e < c.length; e++) {
                    c[e].setAttribute('data-carousel', e), c[e].classList.contains('is-active') && (o = e);
                    let t = document.createElement('button');
                    (t.className = 'carousel-bullet'),
                        t.setAttribute('data-bullet', e),
                        l.parentNode.getElementsByClassName('carousel-bullets')[0].appendChild(t);
                }
                c[o].classList.add('is-active');
                let u = l.parentNode.getElementsByClassName('carousel-bullet');
                u[o].classList.add('is-active'),
                    i(0, c),
                    window.addEventListener('resize', function () {
                        i(0, c);
                    });
                let m = !1;
                r &&
                    (m = setInterval(function () {
                        n(l, 'next');
                    }, r));
                for (let e = 0; e < u.length; e++) {
                    let t = u[e];
                    t.addEventListener('click', function (e) {
                        if ((e.preventDefault(), t.classList.contains('is-active'))) return;
                        for (let e = 0; e < u.length; e++) u[e].classList.remove('is-active');
                        for (let e = 0; e < c.length; e++) c[e].classList.remove('is-active');
                        let n = this.getAttribute('data-bullet');
                        c[n].classList.add('is-active'), this.classList.add('is-active'), s(m);
                    });
                }
                e.init(l, function (e) {
                    'left' === e.direction ? n(l, 'next') : 'right' === e.direction && n(l, 'prev'), s(m);
                });
            }
    })(),
    (function () {
        'use strict';
        document.documentElement.classList.remove('no-js'),
            document.documentElement.classList.add('js'),
            window.addEventListener('load', function () {
                document.body.classList.add('is-loaded');
            });
    })(),
    (function () {
        'use strict';
        const e = document.getElementById('header-nav-toggle'),
            t = document.getElementById('header-nav');
        e &&
            (e.addEventListener('click', function () {
                document.body.classList.toggle('off-nav-is-active'),
                    t.classList.toggle('is-active'),
                    t.style.maxHeight ? (t.style.maxHeight = null) : (t.style.maxHeight = t.scrollHeight + 'px'),
                    'true' === this.getAttribute('aria-expanded')
                        ? this.setAttribute('aria-expanded', 'false')
                        : this.setAttribute('aria-expanded', 'true');
            }),
            document.addEventListener('click', function (n) {
                n.target === t ||
                    n.target === e ||
                    t.contains(n.target) ||
                    (document.body.classList.remove('off-nav-is-active'),
                    t.classList.remove('is-active'),
                    (t.style.maxHeight = null),
                    e.setAttribute('aria-expanded', 'false'));
            }));
    })(),
    (function () {
        'use strict';
        const e = document.getElementsByClassName('modal'),
            t = document.getElementsByClassName('modal-trigger');

        function n() {
            document.body.classList.remove('modal-is-active');
            for (let t = 0; t < e.length; t++) e[t].classList.remove('is-active');
        }

        if (e.length > 0 && t.length > 0)
            for (let e = 0; e < t.length; e++) {
                let n = t[e],
                    i = document.getElementById(n.getAttribute('aria-controls'));
                i &&
                    (n.hasAttribute('data-video') &&
                        (null !== i.querySelector('iframe')
                            ? i.querySelector('iframe').setAttribute('src', n.getAttribute('data-video'))
                            : null !== i.querySelector('video') &&
                              i.querySelector('video').setAttribute('src', n.getAttribute('data-video'))),
                    n.addEventListener('click', function (e) {
                        let t;
                        e.preventDefault(),
                            n.hasAttribute('aria-controls') &&
                                (t = i) &&
                                (document.body.classList.add('modal-is-active'), t.classList.add('is-active'));
                    }));
            }
        document.addEventListener('click', function (e) {
            (e.target.classList.contains('modal') || e.target.classList.contains('modal-close-trigger')) &&
                (e.preventDefault(), n());
        }),
            document.addEventListener('keydown', function (e) {
                27 === (e || window.event).keyCode && n();
            });
    })(),
    (function () {
        'use strict';
        const e = document.getElementById('pricing-toggle');

        function t() {
            const t = document.getElementsByClassName('pricing-switchable');
            if (e.checked) for (let e = 0; e < t.length; e++) t[e].innerHTML = t[e].getAttribute('data-pricing-yearly');
            else for (let e = 0; e < t.length; e++) t[e].innerHTML = t[e].getAttribute('data-pricing-monthly');
        }

        e && (window.addEventListener('load', t), e.addEventListener('change', t));
    })(),
    (function () {
        'use strict';
        const e = document.querySelectorAll('[class*=reveal-]');
        let t = window.innerHeight;

        function n(e, t) {
            let n = 0;
            return function () {
                let i = new Date().getTime();
                if (!(i - n < e)) return (n = i), t.apply(void 0, arguments);
            };
        }

        function i() {
            let n;
            for (let i = 0; i < e.length; i++) {
                let s = e[i],
                    a = s.getAttribute('data-reveal-delay'),
                    l = s.getAttribute('data-reveal-offset') ? s.getAttribute('data-reveal-offset') : '200',
                    c = s.getAttribute('data-reveal-container')
                        ? s.closest(s.getAttribute('data-reveal-container'))
                        : s;
                (n = l),
                    c.getBoundingClientRect().top <= t - n &&
                        !s.classList.contains('is-revealed') &&
                        (a && 0 !== a
                            ? setTimeout(function () {
                                  s.classList.add('is-revealed');
                              }, a)
                            : s.classList.add('is-revealed'));
            }
            !(function () {
                if (e.length > document.querySelectorAll('[class*=reveal-].is-revealed').length) return;
                window.removeEventListener('load', i),
                    window.removeEventListener('scroll', s),
                    window.removeEventListener('resize', a);
            })();
        }

        function s() {
            n(30, i());
        }

        function a() {
            (t = window.innerHeight), n(30, i());
        }

        e.length > 0 &&
            document.body.classList.contains('has-animations') &&
            (window.addEventListener('load', i),
            window.addEventListener('scroll', s),
            window.addEventListener('resize', a));
    })(),
    (function () {
        'use strict';
        const e = document.getElementsByClassName('smooth-scroll'),
            t = (e, n, i, s, a) => {
                const l = n - e;
                let c = l / i;
                const o = (function (e) {
                    return e < 0.5 ? 2 * e * e : (4 - 2 * e) * e - 1;
                })((c = Math.min(c, 1)));
                window.scroll(0, a + s * o),
                    l < i &&
                        window.requestAnimationFrame((n) => {
                            const l = n || new Date().getTime();
                            t(e, l, i, s, a);
                        });
            };
        if (e.length > 0)
            for (let n = 0; n < e.length; n++) {
                e[n].addEventListener('click', function (e) {
                    e.preventDefault();
                    const n = e.target.closest('.smooth-scroll'),
                        i = n.href.split('#')[1],
                        s = document.getElementById(i),
                        a = n.getAttribute('data-duration') || 1e3;
                    s &&
                        window.requestAnimationFrame((e) => {
                            const n = e || new Date().getTime(),
                                i = n,
                                l = window.pageYOffset,
                                c = s.getBoundingClientRect().top;
                            t(i, n, a, c, l);
                        });
                });
            }
    })();
