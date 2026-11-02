const fs = require('fs');
const chokidar = require('chokidar');

const packageJson = require('../../package.json');
const Logger = require('./logs');
const { buildJsonLd, normalizeBaseUrl } = require('./seo');
const log = new Logger('HtmlInjector');

class HtmlInjector {
    constructor(filesPath, config) {
        this.filesPath = filesPath; // Array of file paths to cache
        this.cache = {}; // Object to store cached files
        this.config = config; // Configuration containing metadata (OG, title, etc.)
        this.injectData = this.getInjectData(); // Initialize dynamic injection data
        this.watcher = null; // File watcher instance

        this.preloadPages(filesPath); // Preload pages at startup
        this.watchFiles(filesPath); // Watch files for changes
        log.info('filesPath cached', this.filesPath);
    }

    // Function to get dynamic data for injection (e.g., OG data, title, etc.)
    getInjectData() {
        const ogUrl = this.config?.og?.url || 'https://p2p.mirotalk.com';
        const ogDescription =
            this.config?.og?.description ||
            'MiroTalk P2P is an open-source self-hosted WebRTC video calling and meeting platform. Create fast peer-to-peer video calls with screen sharing, chat, whiteboard and collaboration directly in the browser.';
        const ogImage = this.config?.og?.image || 'https://p2p.mirotalk.com/images/preview.png';
        return {
            OG_TYPE: this.config?.og?.type || 'website',
            OG_SITE_NAME: this.config?.og?.siteName || 'MiroTalk',
            OG_TITLE: this.config?.og?.title || 'MiroTalk P2P - Open Source WebRTC Video Calls & Meetings',
            OG_DESCRIPTION: ogDescription,
            OG_IMAGE: ogImage,
            OG_URL: ogUrl,
            CANONICAL_URL: `${normalizeBaseUrl(ogUrl)}/`,
            // Pre-serialized JSON-LD, injected raw (not HTML-escaped) inside a <script type="application/ld+json"> tag
            JSON_LD: buildJsonLd({
                name: this.config?.og?.siteName || 'MiroTalk',
                description: ogDescription,
                url: ogUrl,
                image: ogImage,
            }),
            APP_VERSION: this.config?.html?.version === false ? '' : `v${packageJson.version}`,
            // Add more data here as needed with fallbacks
        };
    }

    // Replace visible placeholders that must never leak as raw {{...}} text
    replaceAppVersion(html) {
        return html.replace(/{{APP_VERSION}}/g, this.injectData.APP_VERSION);
    }

    // Replace the SEO placeholders that must resolve even when brand injection is disabled
    replaceSeoPlaceholders(html) {
        return html
            .replace(/{{CANONICAL_URL}}/g, () => this.escapeHtml(this.injectData.CANONICAL_URL))
            .replace(/{{JSON_LD}}/g, () => this.injectData.JSON_LD);
    }

    escapeHtml(value) {
        const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return String(value).replace(/[&<>"']/g, (character) => entities[character]);
    }

    // Function to load a file into the cache
    loadFileToCache(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            this.cache[filePath] = content; // Store the content in cache
        } catch (err) {
            log.error(`Error reading file: ${filePath}`, err);
        }
    }

    // Function to preload pages into the cache
    preloadPages(filePaths) {
        filePaths.forEach((filePath) => this.loadFileToCache(filePath));
    }

    // Function to watch files for changes using chokidar
    watchFiles(filePaths) {
        if (this.watcher) {
            this.watcher.close(); // Close existing watcher if any
        }

        this.watcher = chokidar.watch(filePaths, {
            persistent: true,
            ignoreInitial: true, // Ignore initial 'add' events
        });

        this.watcher
            .on('change', (filePath) => {
                log.debug(`File changed: ${filePath}`);
                this.loadFileToCache(filePath);
                log.debug(`Reloaded file ${filePath} into cache`);
            })
            .on('error', (error) => {
                log.error(`Watcher error: ${error.message}`);
            });
    }

    // Function to inject dynamic data (e.g., OG, TITLE, etc.) into a given file
    injectHtml(filePath, res) {
        if (!this.cache[filePath]) {
            log.error(`File not cached: ${filePath}`);
            if (!res.headersSent) {
                return res.status(500).send('Server Error');
            }
            return;
        }

        // Check if HTML injection is enabled in the config
        if (!this.config?.htmlInjection) {
            return res.send(this.replaceSeoPlaceholders(this.replaceAppVersion(this.cache[filePath])));
        }

        try {
            // Replace placeholders with dynamic data (OG, TITLE, etc.)
            const modifiedHTML = this.replaceSeoPlaceholders(
                this.replaceAppVersion(
                    this.cache[filePath].replace(/{{(OG_[A-Z_]+)}}/g, (_, key) =>
                        this.escapeHtml(this.injectData[key] || '')
                    )
                )
            );

            if (!res.headersSent) {
                res.send(modifiedHTML);
            }
        } catch (error) {
            log.error('Error injecting HTML data:', error);
            if (!res.headersSent) {
                res.status(500).send('Server Error');
            }
        }
    }

    // Cleanup watcher when the instance is no longer needed
    cleanup() {
        if (this.watcher) {
            this.watcher.close();
        }
    }
}

module.exports = HtmlInjector;
