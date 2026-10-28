'use strict';

/**
 * Chat GIF picker powered by KLIPY (https://docs.klipy.com).
 *
 * KLIPY's integration requirements ask that API requests and media loads originate from the
 * end-user's browser, that media URLs are used as provided, and that results are shown in the
 * order returned. The search input must use the "Search KLIPY" placeholder.
 */
class GifSearch {
    static API_BASE = 'https://api.klipy.com/api/v1';
    static PER_PAGE = 24;
    static DEBOUNCE_MS = 400;
    static SCROLL_THRESHOLD_PX = 150;
    static PLACEHOLDER = 'Search KLIPY';

    constructor({ apiKey, contentFilter = 'high', locale, container, input, results, status, onSelect, fetchFn }) {
        if (!apiKey) throw new Error('GifSearch: missing KLIPY API key');
        this.apiKey = apiKey;
        this.contentFilter = contentFilter;
        this.locale = locale === undefined ? GifSearch.getLocale() : locale;
        this.container = container;
        this.input = input;
        this.results = results;
        this.status = status;
        this.onSelect = onSelect;
        this.fetchFn = fetchFn || ((...args) => fetch(...args));

        this.query = '';
        this.page = 0;
        this.hasNext = true;
        this.isLoading = false;
        this.loaded = false;
        this.requestId = 0;
        this.abortController = null;
        this.debounceTimer = null;

        this.input.setAttribute('placeholder', GifSearch.PLACEHOLDER);
        this.input.addEventListener('input', () => this.onInput());
        this.results.addEventListener('scroll', () => this.onScroll());
    }

    // KLIPY expects an ISO 3166 alpha-2 country code (e.g. 'us' from 'en-US').
    static getLocale(language = typeof navigator !== 'undefined' ? navigator.language : '') {
        const region = String(language || '').split(/[-_]/)[1];
        return region && /^[a-z]{2}$/i.test(region) ? region.toLowerCase() : '';
    }

    static isSafeMediaUrl(url) {
        if (!url || typeof url !== 'string') return false;
        try {
            return new URL(url).protocol === 'https:';
        } catch {
            return false;
        }
    }

    // Pick a media URL for the given sizes, preferring the lighter animated WebP over GIF.
    static getMediaUrl(item, sizes) {
        const file = item?.file;
        if (!file) return '';
        for (const size of sizes) {
            for (const format of ['webp', 'gif']) {
                const url = file[size]?.[format]?.url;
                if (GifSearch.isSafeMediaUrl(url)) return url;
            }
        }
        return '';
    }

    static getPreviewUrl(item) {
        return GifSearch.getMediaUrl(item, ['sm', 'xs', 'md']);
    }

    static getShareUrl(item) {
        return GifSearch.getMediaUrl(item, ['md', 'sm', 'hd']);
    }

    buildUrl(query, page) {
        const endpoint = query ? 'search' : 'trending';
        const params = new URLSearchParams({
            page: String(page),
            per_page: String(GifSearch.PER_PAGE),
            format_filter: 'webp,gif',
        });
        if (this.contentFilter) params.set('content_filter', this.contentFilter);
        if (this.locale) params.set('locale', this.locale);
        if (query) params.set('q', query);
        return `${GifSearch.API_BASE}/${encodeURIComponent(this.apiKey)}/gifs/${endpoint}?${params.toString()}`;
    }

    open() {
        if (!this.loaded) return this.search('');
    }

    onInput() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.search(this.input.value), GifSearch.DEBOUNCE_MS);
    }

    onScroll() {
        const { scrollTop, scrollHeight, clientHeight } = this.results;
        if (scrollHeight - scrollTop - clientHeight <= GifSearch.SCROLL_THRESHOLD_PX) this.loadMore();
    }

    search(query) {
        this.query = String(query || '')
            .trim()
            .slice(0, 100);
        this.page = 0;
        this.hasNext = true;
        this.loaded = true;
        this.abortController?.abort();
        this.isLoading = false;
        this.results.replaceChildren();
        this.results.scrollTop = 0;
        return this.loadMore();
    }

    async loadMore() {
        if (this.isLoading || !this.hasNext) return;

        this.isLoading = true;
        const requestId = ++this.requestId;
        const page = this.page + 1;
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        this.abortController = controller;
        this.setStatus('Loading...');

        try {
            const response = await this.fetchFn(this.buildUrl(this.query, page), {
                signal: controller?.signal,
                credentials: 'omit',
            });
            if (requestId !== this.requestId) return;
            if (!response.ok) {
                throw new Error(
                    response.status === 429
                        ? 'GIF search limit reached. Please try again later.'
                        : 'Unable to load GIFs'
                );
            }

            const json = await response.json();
            if (requestId !== this.requestId) return;

            const payload = json?.data || {};
            const items = Array.isArray(payload.data) ? payload.data : [];
            this.page = page;
            this.hasNext = Boolean(payload.has_next) && items.length > 0;
            const rendered = this.render(items);

            if (!rendered && page === 1) {
                this.setStatus(this.query ? 'No GIFs found' : 'No GIFs available');
            } else {
                this.setStatus('');
            }
        } catch (err) {
            if (requestId !== this.requestId || err?.name === 'AbortError') return;
            console.warn('GIF search error', err?.message || err);
            this.hasNext = false;
            this.setStatus(err?.message || 'Unable to load GIFs');
        } finally {
            if (requestId === this.requestId) this.isLoading = false;
        }
    }

    render(items) {
        const doc = this.results.ownerDocument;
        let count = 0;
        for (const item of items) {
            const previewUrl = GifSearch.getPreviewUrl(item);
            const shareUrl = GifSearch.getShareUrl(item);
            if (!previewUrl || !shareUrl) continue;

            const title = typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'GIF';
            const button = doc.createElement('button');
            button.type = 'button';
            button.className = 'chat-gif-item';
            button.setAttribute('aria-label', title);
            button.title = title;

            const img = doc.createElement('img');
            img.src = previewUrl;
            img.alt = title;
            img.loading = 'lazy';
            img.decoding = 'async';
            button.appendChild(img);

            button.addEventListener('click', () => this.onSelect?.(shareUrl, item));
            this.results.appendChild(button);
            count++;
        }
        return count;
    }

    setStatus(text) {
        if (!this.status) return;
        this.status.textContent = text;
        this.status.classList.toggle('hidden', !text);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GifSearch;
}
