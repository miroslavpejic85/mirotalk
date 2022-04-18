window.FontAwesomeKitConfig = {
    asyncLoading: { enabled: false },
    autoA11y: { enabled: true },
    baseUrl: 'https://ka-f.fontawesome.com',
    baseUrlKit: 'https://kit.fontawesome.com',
    detectConflictsUntil: null,
    iconUploads: {},
    id: 62951066,
    license: 'free',
    method: 'css',
    minify: { enabled: true },
    token: 'ea45bcab08',
    v4FontFaceShim: { enabled: true },
    v4shim: { enabled: true },
    v5FontFaceShim: { enabled: true },
    version: '6.1.1',
};
!(function (t) {
    'function' == typeof define && define.amd ? define('kit-loader', t) : t();
})(function () {
    'use strict';
    function t(e) {
        return (t =
            'function' == typeof Symbol && 'symbol' == typeof Symbol.iterator
                ? function (t) {
                      return typeof t;
                  }
                : function (t) {
                      return t && 'function' == typeof Symbol && t.constructor === Symbol && t !== Symbol.prototype
                          ? 'symbol'
                          : typeof t;
                  })(e);
    }
    function e(t, e, n) {
        return (
            e in t
                ? Object.defineProperty(t, e, { value: n, enumerable: !0, configurable: !0, writable: !0 })
                : (t[e] = n),
            t
        );
    }
    function n(t, e) {
        var n = Object.keys(t);
        if (Object.getOwnPropertySymbols) {
            var o = Object.getOwnPropertySymbols(t);
            e &&
                (o = o.filter(function (e) {
                    return Object.getOwnPropertyDescriptor(t, e).enumerable;
                })),
                n.push.apply(n, o);
        }
        return n;
    }
    function o(t) {
        for (var o = 1; o < arguments.length; o++) {
            var r = null != arguments[o] ? arguments[o] : {};
            o % 2
                ? n(Object(r), !0).forEach(function (n) {
                      e(t, n, r[n]);
                  })
                : Object.getOwnPropertyDescriptors
                ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(r))
                : n(Object(r)).forEach(function (e) {
                      Object.defineProperty(t, e, Object.getOwnPropertyDescriptor(r, e));
                  });
        }
        return t;
    }
    function r(t, e) {
        return (
            (function (t) {
                if (Array.isArray(t)) return t;
            })(t) ||
            (function (t, e) {
                if ('undefined' == typeof Symbol || !(Symbol.iterator in Object(t))) return;
                var n = [],
                    o = !0,
                    r = !1,
                    i = void 0;
                try {
                    for (
                        var c, a = t[Symbol.iterator]();
                        !(o = (c = a.next()).done) && (n.push(c.value), !e || n.length !== e);
                        o = !0
                    );
                } catch (t) {
                    (r = !0), (i = t);
                } finally {
                    try {
                        o || null == a.return || a.return();
                    } finally {
                        if (r) throw i;
                    }
                }
                return n;
            })(t, e) ||
            (function (t, e) {
                if (!t) return;
                if ('string' == typeof t) return i(t, e);
                var n = Object.prototype.toString.call(t).slice(8, -1);
                'Object' === n && t.constructor && (n = t.constructor.name);
                if ('Map' === n || 'Set' === n) return Array.from(t);
                if ('Arguments' === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return i(t, e);
            })(t, e) ||
            (function () {
                throw new TypeError(
                    'Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.',
                );
            })()
        );
    }
    function i(t, e) {
        (null == e || e > t.length) && (e = t.length);
        for (var n = 0, o = new Array(e); n < e; n++) o[n] = t[n];
        return o;
    }
    function c(t, e) {
        var n = (e && e.addOn) || '',
            o = (e && e.baseFilename) || t.license + n,
            r = e && e.minify ? '.min' : '',
            i = (e && e.fileSuffix) || t.method,
            c = (e && e.subdir) || t.method;
        return (
            t.baseUrl +
            '/releases/' +
            ('latest' === t.version ? 'latest' : 'v'.concat(t.version)) +
            '/' +
            c +
            '/' +
            o +
            r +
            '.' +
            i
        );
    }
    function a(t) {
        return t.baseUrlKit + '/' + t.token + '/' + t.id + '/kit-upload.css';
    }
    function u(t, e) {
        var n = e || ['fa'],
            o = '.' + Array.prototype.join.call(n, ',.'),
            r = t.querySelectorAll(o);
        Array.prototype.forEach.call(r, function (e) {
            var n = e.getAttribute('title');
            e.setAttribute('aria-hidden', 'true');
            var o = !e.nextElementSibling || !e.nextElementSibling.classList.contains('sr-only');
            if (n && o) {
                var r = t.createElement('span');
                (r.innerHTML = n), r.classList.add('sr-only'), e.parentNode.insertBefore(r, e.nextSibling);
            }
        });
    }
    var f,
        s = function () {},
        d = 'undefined' != typeof global && void 0 !== global.process && 'function' == typeof global.process.emit,
        l = 'undefined' == typeof setImmediate ? setTimeout : setImmediate,
        h = [];
    function m() {
        for (var t = 0; t < h.length; t++) h[t][0](h[t][1]);
        (h = []), (f = !1);
    }
    function p(t, e) {
        h.push([t, e]), f || ((f = !0), l(m, 0));
    }
    function v(t) {
        var e = t.owner,
            n = e._state,
            o = e._data,
            r = t[n],
            i = t.then;
        if ('function' == typeof r) {
            n = 'fulfilled';
            try {
                o = r(o);
            } catch (t) {
                w(i, t);
            }
        }
        y(i, o) || ('fulfilled' === n && b(i, o), 'rejected' === n && w(i, o));
    }
    function y(e, n) {
        var o;
        try {
            if (e === n) throw new TypeError('A promises callback cannot return that same promise.');
            if (n && ('function' == typeof n || 'object' === t(n))) {
                var r = n.then;
                if ('function' == typeof r)
                    return (
                        r.call(
                            n,
                            function (t) {
                                o || ((o = !0), n === t ? g(e, t) : b(e, t));
                            },
                            function (t) {
                                o || ((o = !0), w(e, t));
                            },
                        ),
                        !0
                    );
            }
        } catch (t) {
            return o || w(e, t), !0;
        }
        return !1;
    }
    function b(t, e) {
        (t !== e && y(t, e)) || g(t, e);
    }
    function g(t, e) {
        'pending' === t._state && ((t._state = 'settled'), (t._data = e), p(S, t));
    }
    function w(t, e) {
        'pending' === t._state && ((t._state = 'settled'), (t._data = e), p(O, t));
    }
    function A(t) {
        t._then = t._then.forEach(v);
    }
    function S(t) {
        (t._state = 'fulfilled'), A(t);
    }
    function O(t) {
        (t._state = 'rejected'), A(t), !t._handled && d && global.process.emit('unhandledRejection', t._data, t);
    }
    function j(t) {
        global.process.emit('rejectionHandled', t);
    }
    function E(t) {
        if ('function' != typeof t) throw new TypeError('Promise resolver ' + t + ' is not a function');
        if (this instanceof E == !1)
            throw new TypeError(
                "Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.",
            );
        (this._then = []),
            (function (t, e) {
                function n(t) {
                    w(e, t);
                }
                try {
                    t(function (t) {
                        b(e, t);
                    }, n);
                } catch (t) {
                    n(t);
                }
            })(t, this);
    }
    (E.prototype = {
        constructor: E,
        _state: 'pending',
        _then: null,
        _data: void 0,
        _handled: !1,
        then: function (t, e) {
            var n = { owner: this, then: new this.constructor(s), fulfilled: t, rejected: e };
            return (
                (!e && !t) || this._handled || ((this._handled = !0), 'rejected' === this._state && d && p(j, this)),
                'fulfilled' === this._state || 'rejected' === this._state ? p(v, n) : this._then.push(n),
                n.then
            );
        },
        catch: function (t) {
            return this.then(null, t);
        },
    }),
        (E.all = function (t) {
            if (!Array.isArray(t)) throw new TypeError('You must pass an array to Promise.all().');
            return new E(function (e, n) {
                var o = [],
                    r = 0;
                function i(t) {
                    return (
                        r++,
                        function (n) {
                            (o[t] = n), --r || e(o);
                        }
                    );
                }
                for (var c, a = 0; a < t.length; a++)
                    (c = t[a]) && 'function' == typeof c.then ? c.then(i(a), n) : (o[a] = c);
                r || e(o);
            });
        }),
        (E.race = function (t) {
            if (!Array.isArray(t)) throw new TypeError('You must pass an array to Promise.race().');
            return new E(function (e, n) {
                for (var o, r = 0; r < t.length; r++) (o = t[r]) && 'function' == typeof o.then ? o.then(e, n) : e(o);
            });
        }),
        (E.resolve = function (e) {
            return e && 'object' === t(e) && e.constructor === E
                ? e
                : new E(function (t) {
                      t(e);
                  });
        }),
        (E.reject = function (t) {
            return new E(function (e, n) {
                n(t);
            });
        });
    var _ = 'function' == typeof Promise ? Promise : E;
    function F(t, e) {
        var n = e.fetch,
            o = e.XMLHttpRequest,
            r = e.token,
            i = t;
        return (
            'URLSearchParams' in window
                ? (i = new URL(t)).searchParams.set('token', r)
                : (i = i + '?token=' + encodeURIComponent(r)),
            (i = i.toString()),
            new _(function (t, e) {
                if ('function' == typeof n)
                    n(i, { mode: 'cors', cache: 'default' })
                        .then(function (t) {
                            if (t.ok) return t.text();
                            throw new Error('');
                        })
                        .then(function (e) {
                            t(e);
                        })
                        .catch(e);
                else if ('function' == typeof o) {
                    var r = new o();
                    r.addEventListener('loadend', function () {
                        this.responseText ? t(this.responseText) : e(new Error(''));
                    });
                    ['abort', 'error', 'timeout'].map(function (t) {
                        r.addEventListener(t, function () {
                            e(new Error(''));
                        });
                    }),
                        r.open('GET', i),
                        r.send();
                } else {
                    e(new Error(''));
                }
            })
        );
    }
    function P(t, e, n) {
        var o = t;
        return (
            [
                [
                    /(url\("?)\.\.\/\.\.\/\.\./g,
                    function (t, n) {
                        return ''.concat(n).concat(e);
                    },
                ],
                [
                    /(url\("?)\.\.\/webfonts/g,
                    function (t, o) {
                        return ''.concat(o).concat(e, '/releases/v').concat(n, '/webfonts');
                    },
                ],
                [
                    /(url\("?)https:\/\/kit-free([^.])*\.fontawesome\.com/g,
                    function (t, n) {
                        return ''.concat(n).concat(e);
                    },
                ],
            ].forEach(function (t) {
                var e = r(t, 2),
                    n = e[0],
                    i = e[1];
                o = o.replace(n, i);
            }),
            o
        );
    }
    function C(t, e) {
        var n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : function () {},
            r = e.document || r,
            i = u.bind(u, r, ['fa', 'fab', 'fas', 'far', 'fal', 'fad', 'fak']),
            f = Object.keys(t.iconUploads || {}).length > 0;
        t.autoA11y.enabled && n(i);
        var s = [{ id: 'fa-main', addOn: void 0 }];
        t.v4shim && t.v4shim.enabled && s.push({ id: 'fa-v4-shims', addOn: '-v4-shims' }),
            t.v5FontFaceShim && t.v5FontFaceShim.enabled && s.push({ id: 'fa-v5-font-face', addOn: '-v5-font-face' }),
            t.v4FontFaceShim && t.v4FontFaceShim.enabled && s.push({ id: 'fa-v4-font-face', addOn: '-v4-font-face' }),
            f && s.push({ id: 'fa-kit-upload', customCss: !0 });
        var d = s.map(function (n) {
            return new _(function (r, i) {
                F(n.customCss ? a(t) : c(t, { addOn: n.addOn, minify: t.minify.enabled }), e)
                    .then(function (i) {
                        r(
                            U(
                                i,
                                o(
                                    o({}, e),
                                    {},
                                    {
                                        baseUrl: t.baseUrl,
                                        version: t.version,
                                        id: n.id,
                                        contentFilter: function (t, e) {
                                            return P(t, e.baseUrl, e.version);
                                        },
                                    },
                                ),
                            ),
                        );
                    })
                    .catch(i);
            });
        });
        return _.all(d);
    }
    function U(t, e) {
        var n =
                e.contentFilter ||
                function (t, e) {
                    return t;
                },
            o = document.createElement('style'),
            r = document.createTextNode(n(t, e));
        return (
            o.appendChild(r),
            (o.media = 'all'),
            e.id && o.setAttribute('id', e.id),
            e &&
                e.detectingConflicts &&
                e.detectionIgnoreAttr &&
                o.setAttributeNode(document.createAttribute(e.detectionIgnoreAttr)),
            o
        );
    }
    function k(t, e) {
        (e.autoA11y = t.autoA11y.enabled),
            'pro' === t.license &&
                ((e.autoFetchSvg = !0),
                (e.fetchSvgFrom =
                    t.baseUrl + '/releases/' + ('latest' === t.version ? 'latest' : 'v'.concat(t.version)) + '/svgs'),
                (e.fetchUploadedSvgFrom = t.uploadsUrl));
        var n = [];
        return (
            t.v4shim.enabled &&
                n.push(
                    new _(function (n, r) {
                        F(c(t, { addOn: '-v4-shims', minify: t.minify.enabled }), e)
                            .then(function (t) {
                                n(I(t, o(o({}, e), {}, { id: 'fa-v4-shims' })));
                            })
                            .catch(r);
                    }),
                ),
            n.push(
                new _(function (n, r) {
                    F(c(t, { minify: t.minify.enabled }), e)
                        .then(function (t) {
                            var r = I(t, o(o({}, e), {}, { id: 'fa-main' }));
                            n(
                                (function (t, e) {
                                    var n = e && void 0 !== e.autoFetchSvg ? e.autoFetchSvg : void 0,
                                        o = e && void 0 !== e.autoA11y ? e.autoA11y : void 0;
                                    void 0 !== o && t.setAttribute('data-auto-a11y', o ? 'true' : 'false');
                                    n &&
                                        (t.setAttributeNode(document.createAttribute('data-auto-fetch-svg')),
                                        t.setAttribute('data-fetch-svg-from', e.fetchSvgFrom),
                                        t.setAttribute('data-fetch-uploaded-svg-from', e.fetchUploadedSvgFrom));
                                    return t;
                                })(r, e),
                            );
                        })
                        .catch(r);
                }),
            ),
            _.all(n)
        );
    }
    function I(t, e) {
        var n = document.createElement('SCRIPT'),
            o = document.createTextNode(t);
        return (
            n.appendChild(o),
            (n.referrerPolicy = 'strict-origin'),
            e.id && n.setAttribute('id', e.id),
            e &&
                e.detectingConflicts &&
                e.detectionIgnoreAttr &&
                n.setAttributeNode(document.createAttribute(e.detectionIgnoreAttr)),
            n
        );
    }
    function L(t) {
        var e,
            n = [],
            o = document,
            r = o.documentElement.doScroll,
            i = (r ? /^loaded|^c/ : /^loaded|^i|^c/).test(o.readyState);
        i ||
            o.addEventListener(
                'DOMContentLoaded',
                (e = function () {
                    for (o.removeEventListener('DOMContentLoaded', e), i = 1; (e = n.shift()); ) e();
                }),
            ),
            i ? setTimeout(t, 0) : n.push(t);
    }
    function T(t) {
        'undefined' != typeof MutationObserver &&
            new MutationObserver(t).observe(document, { childList: !0, subtree: !0 });
    }
    try {
        if (window.FontAwesomeKitConfig) {
            var x = window.FontAwesomeKitConfig,
                M = {
                    detectingConflicts: x.detectConflictsUntil && new Date() <= new Date(x.detectConflictsUntil),
                    detectionIgnoreAttr: 'data-fa-detection-ignore',
                    fetch: window.fetch,
                    token: x.token,
                    XMLHttpRequest: window.XMLHttpRequest,
                    document: document,
                },
                D = document.currentScript,
                N = D ? D.parentElement : document.head;
            (function () {
                var t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
                    e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {};
                return 'js' === t.method
                    ? k(t, e)
                    : 'css' === t.method
                    ? C(t, e, function (t) {
                          L(t), T(t);
                      })
                    : void 0;
            })(x, M)
                .then(function (t) {
                    t.map(function (t) {
                        try {
                            N.insertBefore(t, D ? D.nextSibling : null);
                        } catch (e) {
                            N.appendChild(t);
                        }
                    }),
                        M.detectingConflicts &&
                            D &&
                            L(function () {
                                D.setAttributeNode(document.createAttribute(M.detectionIgnoreAttr));
                                var t = (function (t, e) {
                                    var n = document.createElement('script');
                                    return (
                                        e &&
                                            e.detectionIgnoreAttr &&
                                            n.setAttributeNode(document.createAttribute(e.detectionIgnoreAttr)),
                                        (n.src = c(t, {
                                            baseFilename: 'conflict-detection',
                                            fileSuffix: 'js',
                                            subdir: 'js',
                                            minify: t.minify.enabled,
                                        })),
                                        n
                                    );
                                })(x, M);
                                document.body.appendChild(t);
                            });
                })
                .catch(function (t) {
                    console.error(''.concat('Font Awesome Kit:', ' ').concat(t));
                });
        }
    } catch (t) {
        console.error(''.concat('Font Awesome Kit:', ' ').concat(t));
    }
});
