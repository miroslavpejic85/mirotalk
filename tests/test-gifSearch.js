'use strict';

const assert = require('assert/strict');
const { JSDOM } = require('jsdom');
const sinon = require('sinon');

const GifSearch = require('../public/js/gifSearch.js');

function gifItem(id, overrides = {}) {
    const media = (size, format) => ({ url: `https://static.klipy.com/ii/${id}/${size}.${format}`, width: 220 });
    return {
        id,
        title: `Gif ${id}`,
        type: 'gif',
        file: {
            hd: { gif: media('hd', 'gif'), webp: media('hd', 'webp') },
            md: { gif: media('md', 'gif'), webp: media('md', 'webp') },
            sm: { gif: media('sm', 'gif'), webp: media('sm', 'webp') },
            xs: { gif: media('xs', 'gif'), webp: media('xs', 'webp') },
        },
        ...overrides,
    };
}

function jsonResponse(items, hasNext = false, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => ({ result: true, data: { data: items, current_page: 1, per_page: 24, has_next: hasNext } }),
    };
}

describe('GifSearch (KLIPY chat picker)', () => {
    let dom;
    let elements;
    let clock;

    function create(options = {}) {
        return new GifSearch({
            apiKey: 'test/key',
            contentFilter: 'high',
            locale: 'us',
            ...elements,
            fetchFn: options.fetchFn || sinon.stub().resolves(jsonResponse([])),
            onSelect: options.onSelect || sinon.spy(),
        });
    }

    beforeEach(() => {
        dom = new JSDOM(
            '<div id="chatGif"><input id="input" /><div id="results"></div><div id="status" class="hidden"></div></div>'
        );
        const { document } = dom.window;
        elements = {
            container: document.getElementById('chatGif'),
            input: document.getElementById('input'),
            results: document.getElementById('results'),
            status: document.getElementById('status'),
        };
    });

    afterEach(() => {
        clock?.restore();
        clock = null;
        dom.window.close();
    });

    it('requires an API key', () => {
        assert.throws(() => new GifSearch({ ...elements, apiKey: '' }), /missing KLIPY API key/);
    });

    it('uses the required "Search KLIPY" placeholder', () => {
        create();
        assert.equal(elements.input.getAttribute('placeholder'), 'Search KLIPY');
    });

    it('builds trending and search URLs with an encoded key and filters', () => {
        const gif = create();

        const trending = new URL(gif.buildUrl('', 1));
        assert.equal(trending.origin, 'https://api.klipy.com');
        assert.equal(trending.pathname, '/api/v1/test%2Fkey/gifs/trending');
        assert.equal(trending.searchParams.get('page'), '1');
        assert.equal(trending.searchParams.get('per_page'), '24');
        assert.equal(trending.searchParams.get('content_filter'), 'high');
        assert.equal(trending.searchParams.get('locale'), 'us');
        assert.equal(trending.searchParams.has('q'), false);

        const search = new URL(gif.buildUrl('cats & dogs', 2));
        assert.equal(search.pathname, '/api/v1/test%2Fkey/gifs/search');
        assert.equal(search.searchParams.get('q'), 'cats & dogs');
        assert.equal(search.searchParams.get('page'), '2');
    });

    it('derives the KLIPY locale from the browser language region', () => {
        assert.equal(GifSearch.getLocale('en-US'), 'us');
        assert.equal(GifSearch.getLocale('pt_BR'), 'br');
        assert.equal(GifSearch.getLocale('en'), '');
        assert.equal(GifSearch.getLocale(''), '');
    });

    it('prefers WebP, falls back to GIF and only accepts https media URLs', () => {
        assert.equal(GifSearch.getShareUrl(gifItem('a')), 'https://static.klipy.com/ii/a/md.webp');
        assert.equal(GifSearch.getPreviewUrl(gifItem('a')), 'https://static.klipy.com/ii/a/sm.webp');

        const gifOnly = gifItem('b');
        delete gifOnly.file.md.webp;
        assert.equal(GifSearch.getShareUrl(gifOnly), 'https://static.klipy.com/ii/b/md.gif');

        const unsafe = {
            file: {
                md: { webp: { url: 'javascript:alert(1)' }, gif: { url: 'http://static.klipy.com/x.gif' } },
                sm: {},
                hd: { gif: { url: 'data:image/gif;base64,AAAA' } },
            },
        };
        assert.equal(GifSearch.getShareUrl(unsafe), '');
        assert.equal(GifSearch.getShareUrl({}), '');
    });

    it('renders results in order without injecting HTML from titles and sends the share URL on click', async () => {
        const onSelect = sinon.spy();
        const items = [gifItem('1', { title: '<img src=x onerror=alert(1)>' }), gifItem('2'), { id: 'ad', type: 'ad' }];
        const fetchFn = sinon.stub().resolves(jsonResponse(items));
        const gif = create({ fetchFn, onSelect });

        await gif.search('hello');

        const buttons = elements.results.querySelectorAll('button.chat-gif-item');
        assert.equal(buttons.length, 2);
        assert.equal(elements.results.querySelectorAll('img[onerror]').length, 0);
        assert.equal(buttons[0].querySelector('img').getAttribute('alt'), '<img src=x onerror=alert(1)>');
        assert.equal(buttons[0].querySelector('img').getAttribute('src'), 'https://static.klipy.com/ii/1/sm.webp');
        assert.equal(buttons[1].querySelector('img').getAttribute('src'), 'https://static.klipy.com/ii/2/sm.webp');

        buttons[1].click();
        assert.ok(onSelect.calledOnceWith('https://static.klipy.com/ii/2/md.webp'));
        assert.equal(fetchFn.firstCall.args[1].credentials, 'omit');
    });

    it('loads trending once on open and paginates while has_next is true', async () => {
        const fetchFn = sinon.stub();
        fetchFn.onFirstCall().resolves(jsonResponse([gifItem('1')], true));
        fetchFn.onSecondCall().resolves(jsonResponse([gifItem('2')], false));
        const gif = create({ fetchFn });

        await gif.open();
        gif.open();
        assert.equal(fetchFn.callCount, 1);
        assert.match(fetchFn.firstCall.args[0], /\/gifs\/trending\?/);

        await gif.loadMore();
        assert.equal(fetchFn.callCount, 2);
        assert.equal(new URL(fetchFn.secondCall.args[0]).searchParams.get('page'), '2');

        await gif.loadMore();
        assert.equal(fetchFn.callCount, 2);
        assert.equal(elements.results.children.length, 2);
    });

    it('ignores stale responses when a newer search starts', async () => {
        let resolveFirst;
        const fetchFn = sinon.stub();
        fetchFn.onFirstCall().returns(new Promise((resolve) => (resolveFirst = resolve)));
        fetchFn.onSecondCall().resolves(jsonResponse([gifItem('new')]));
        const gif = create({ fetchFn });

        const first = gif.search('old');
        await gif.search('new');
        resolveFirst(jsonResponse([gifItem('old')]));
        await first;

        const srcs = [...elements.results.querySelectorAll('img')].map((img) => img.getAttribute('src'));
        assert.deepEqual(srcs, ['https://static.klipy.com/ii/new/sm.webp']);
    });

    it('debounces typing before searching', async () => {
        clock = sinon.useFakeTimers();
        const fetchFn = sinon.stub().resolves(jsonResponse([]));
        const gif = create({ fetchFn });
        const searchSpy = sinon.spy(gif, 'search');

        elements.input.value = 'c';
        elements.input.dispatchEvent(new dom.window.Event('input'));
        elements.input.value = 'cat';
        elements.input.dispatchEvent(new dom.window.Event('input'));
        clock.tick(GifSearch.DEBOUNCE_MS - 1);
        assert.equal(searchSpy.callCount, 0);
        clock.tick(1);
        assert.ok(searchSpy.calledOnceWith('cat'));
    });

    it('shows status messages for empty results and rate limiting', async () => {
        const fetchFn = sinon.stub();
        fetchFn.onFirstCall().resolves(jsonResponse([]));
        fetchFn.onSecondCall().resolves(jsonResponse([], false, 429));
        const gif = create({ fetchFn });
        const warn = sinon.stub(console, 'warn');

        try {
            await gif.search('nothing');
            assert.equal(elements.status.textContent, 'No GIFs found');
            assert.equal(elements.status.classList.contains('hidden'), false);

            await gif.search('again');
            assert.equal(elements.status.textContent, 'GIF search limit reached. Please try again later.');
        } finally {
            warn.restore();
        }
    });
});
