'use strict';

const { JSDOM } = require('jsdom');
const DOMPurify = require('dompurify');
const he = require('he');

// Initialize DOMPurify with jsdom
const window = new JSDOM('').window;
const purify = DOMPurify(window);

const Logger = require('./logs');
const log = new Logger('Xss');

// Configure DOMPurify
purify.setConfig({
    ALLOWED_TAGS: ['a', 'img', 'div', 'span', 'svg', 'g', 'p'], // Allow specific tags
    ALLOWED_ATTR: ['href', 'src', 'title', 'id', 'class', 'target', 'width', 'height'], // Allow specific attributes
    ALLOWED_URI_REGEXP: /^(?!data:|javascript:|vbscript:|file:|view-source:).*/, // Disallow dangerous URIs
});

// Clean problematic attributes
function cleanAttributes(node) {
    if (node.nodeType === window.Node.ELEMENT_NODE) {
        // Remove dangerous attributes
        const dangerousAttributes = ['onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onchange', 'oninput'];
        dangerousAttributes.forEach((attr) => {
            if (node.hasAttribute(attr)) {
                node.removeAttribute(attr);
            }
        });

        // Handle special cases for 'data:' URIs
        const src = node.getAttribute('src');
        if (src && src.startsWith('data:')) {
            node.removeAttribute('src');
        }

        // Remove unsafe 'style' attributes
        if (node.hasAttribute('style')) {
            const style = node.getAttribute('style');
            if (style.includes('javascript:') || style.includes('data:')) {
                node.removeAttribute('style');
            }
        }

        // Remove 'title' attribute if it contains dangerous content
        if (node.hasAttribute('title')) {
            const title = node.getAttribute('title');
            if (title.includes('javascript:') || title.includes('data:') || title.includes('onerror')) {
                node.removeAttribute('title');
            }
        }
    }
}

// Hook to clean specific attributes that can cause XSS
purify.addHook('beforeSanitizeAttributes', cleanAttributes);

// Main function to check and sanitize data
const checkXSS = (dataObject) => {
    try {
        return sanitizeData(dataObject);
    } catch (error) {
        log.error('Sanitization error:', error);
        return dataObject; // Return original data in case of error
    }
};

function needsDecoding(str) {
    const urlEncodedPattern = /%[0-9A-Fa-f]{2}/g;
    return urlEncodedPattern.test(str);
}

function safeDecodeURIComponent(str) {
    try {
        return decodeURIComponent(str);
    } catch (e) {
        log.error('Malformed URI component detected:', str);
        return str; // Return original string if decoding fails
    }
}

function sanitizeData(data) {
    if (typeof data === 'string') {
        // Decode HTML entities and URL encoded content
        const decodedData = needsDecoding(data) ? he.decode(safeDecodeURIComponent(data)) : he.decode(data);
        return purify.sanitize(decodedData);
    }

    if (Array.isArray(data)) {
        return data.map(sanitizeData);
    }

    if (data && typeof data === 'object') {
        return sanitizeObject(data);
    }

    return data; // For numbers, booleans, null, undefined
}

// Sanitize object properties
function sanitizeObject(obj) {
    return Object.keys(obj).reduce((acc, key) => {
        acc[key] = sanitizeData(obj[key]);
        return acc;
    }, {});
}

module.exports = checkXSS;
