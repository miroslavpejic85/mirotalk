'use strict';

// npx mocha test-xss.js

require('should');

const checkXSS = require('../app/src/xss');

describe('test-xss', () => {
    describe('1. Basic Data Types Handling', () => {
        it('should return numbers and booleans unchanged', () => {
            checkXSS(42).should.equal(42);
            checkXSS(true).should.equal(true);
        });

        it('should return null and undefined unchanged', () => {
            should.not.exist(checkXSS(null));
            should.not.exist(checkXSS(undefined));
        });
    });

    describe('2. Simple String Handling', () => {
        it('should sanitize strings with XSS injections', () => {
            const maliciousString = '<script>alert("xss")</script>';
            const sanitizedString = checkXSS(maliciousString);
            sanitizedString.should.not.containEql('<script>');
            sanitizedString.should.not.containEql('alert');
            sanitizedString.should.not.containEql('</script>');
        });

        it('should sanitize complex XSS injections', () => {
            const complexString = '<svg><g/onload=alert(2)//<p>';
            const sanitizedString = checkXSS(complexString);
            sanitizedString.should.not.containEql('onload');
            sanitizedString.should.equal('<svg><g></g></svg>');
        });

        it('should sanitize HTML attributes', () => {
            const maliciousHtml = '<a href="javascript:alert(\'xss\')">click me</a>';
            const sanitizedHtml = checkXSS(maliciousHtml);
            sanitizedHtml.should.not.containEql('javascript:');
            sanitizedHtml.should.containEql('<a>click me</a>');
        });

        it('should sanitize embedded scripts in HTML', () => {
            const maliciousHtml = '<div><script>alert("xss")</script></div>';
            const sanitizedHtml = checkXSS(maliciousHtml);
            sanitizedHtml.should.not.containEql('<script>');
            sanitizedHtml.should.containEql('<div></div>');
        });

        it('should handle encoded XSS payloads', () => {
            const encodedXss = '%3Cscript%3Ealert%28%27xss%27%29%3C%2Fscript%3E';
            const sanitizedString = checkXSS(encodedXss);
            sanitizedString.should.not.containEql('alert');
            sanitizedString.should.equal('');
        });

        it('should handle special characters used in XSS attacks', () => {
            const specialCharsXss = "<div title=\"<img src='x' onerror='alert(1)'/>\">Test</div>";
            const sanitizedSpecialChars = checkXSS(specialCharsXss);
            sanitizedSpecialChars.should.not.containEql('onerror');
            sanitizedSpecialChars.should.containEql('<div>Test</div>');
        });
    });

    describe('3. Handling Objects, Arrays, and Nested Structures', () => {
        it('should sanitize objects with XSS injections', () => {
            const maliciousObject = {
                key1: '<script>alert("xss")</script>',
                key2: 'normal string',
            };
            const sanitizedObject = checkXSS(maliciousObject);
            sanitizedObject.key1.should.not.containEql('<script>');
            sanitizedObject.key1.should.not.containEql('alert');
            sanitizedObject.key1.should.not.containEql('</script>');
            sanitizedObject.key2.should.equal('normal string');
        });

        it('should sanitize arrays with XSS injections', () => {
            const maliciousArray = ['<script>alert("xss")</script>', 'normal string'];
            const sanitizedArray = checkXSS(maliciousArray);
            sanitizedArray[0].should.not.containEql('<script>');
            sanitizedArray[0].should.not.containEql('alert');
            sanitizedArray[0].should.not.containEql('</script>');
            sanitizedArray[1].should.equal('normal string');
        });

        it('should handle nested objects and arrays with XSS injections', () => {
            const nestedData = {
                key1: [
                    '<script>alert("xss")</script>',
                    {
                        key2: '<img src="x" onerror="alert(\'xss\')">',
                    },
                ],
            };
            const sanitizedData = checkXSS(nestedData);
            sanitizedData.key1[0].should.not.containEql('<script>');
            sanitizedData.key1[0].should.not.containEql('alert');
            sanitizedData.key1[0].should.not.containEql('</script>');
            sanitizedData.key1[1].key2.should.not.containEql('onerror');
            sanitizedData.key1[1].key2.should.equal('<img src="x">');
        });

        it('should handle XSS in nested HTML elements', () => {
            const nestedXss = '<div><span onclick="alert(\'xss\')">Click me</span></div>';
            const sanitizedNestedXss = checkXSS(nestedXss);
            sanitizedNestedXss.should.not.containEql('onclick');
            sanitizedNestedXss.should.containEql('<div><span>Click me</span></div>');
        });

        it('should handle XSS through malicious attributes in different tags', () => {
            const maliciousAttributes =
                '<a href="#" onclick="alert(\'xss\')">Link</a><iframe src="javascript:alert(\'xss\')"></iframe>';
            const sanitizedAttributes = checkXSS(maliciousAttributes);
            sanitizedAttributes.should.not.containEql('onclick');
            sanitizedAttributes.should.not.containEql('javascript:');
            sanitizedAttributes.should.not.containEql('alert');
        });
    });

    describe('4. Handling Specific Formats (JSON, Base64, etc.)', () => {
        it('should handle XSS in JSON data', () => {
            const maliciousJson = '{"key": "<img src=\'x\' onerror=\'alert(1)\'>"}';
            const sanitizedJson = checkXSS(JSON.parse(maliciousJson));
            sanitizedJson.key.should.not.containEql('onerror');
            sanitizedJson.key.should.equal('<img src="x">');
        });

        it('should sanitize base64 encoded content', () => {
            const maliciousBase64 = '<img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoJ3hzcicpPg==">';
            const sanitizedBase64 = checkXSS(maliciousBase64);
            sanitizedBase64.should.not.containEql('onload');
            sanitizedBase64.should.equal('<img>');
        });

        it('should sanitize encoded HTML entities', () => {
            const encodedHtmlEntities = '&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;';
            const sanitizedEntities = checkXSS(encodedHtmlEntities);
            sanitizedEntities.should.not.containEql('<script>');
            sanitizedEntities.should.equal('');
        });

        it('should sanitize encoded and obfuscated payloads', () => {
            const obfuscatedXss = '<img src="x" onerror="eval(String.fromCharCode(97,108,101,114,116) + \'(1)\')">';
            const sanitizedObfuscatedXss = checkXSS(obfuscatedXss);
            sanitizedObfuscatedXss.should.not.containEql('eval');
            sanitizedObfuscatedXss.should.equal('<img src="x">');
        });
    });

    describe('5. Handling CSS and JavaScript URL XSS', () => {
        it('should sanitize JavaScript and CSS injections', () => {
            const jsInjection = '<div style="background-image: url(javascript:alert(\'xss\'))"></div>';
            const sanitizedJsInjection = checkXSS(jsInjection);
            sanitizedJsInjection.should.not.containEql('javascript:');
            sanitizedJsInjection.should.containEql('<div></div>');
        });

        it('should handle JavaScript URL XSS', () => {
            const jsUrlXss = '<a href="javascript:alert(\'xss\')">Click me</a>';
            const sanitizedJsUrl = checkXSS(jsUrlXss);
            sanitizedJsUrl.should.not.containEql('javascript:');
            sanitizedJsUrl.should.containEql('<a>Click me</a>');
        });

        it('should sanitize `javascript:` URLs in CSS attributes', () => {
            const maliciousCss = '<div style="background:url(javascript:alert(\'xss\'))"></div>';
            const sanitizedCss = checkXSS(maliciousCss);
            sanitizedCss.should.not.containEql('javascript:');
            sanitizedCss.should.equal('<div></div>');
        });
    });

    describe('6. Handling SVG, MathML, and Data URIs', () => {
        it('should handle XSS in SVG and MathML', () => {
            const svgXss = '<svg><script>alert("xss")</script></svg>';
            const sanitizedSvgXss = checkXSS(svgXss);
            sanitizedSvgXss.should.not.containEql('<script>');
            sanitizedSvgXss.should.equal('<svg></svg>');
        });

        it('should sanitize data URIs in HTML attributes', () => {
            const maliciousHtml = '<img src="data:image/svg+xml,<svg onload=alert(\'xss\')>">';
            const sanitizedHtml = checkXSS(maliciousHtml);
            sanitizedHtml.should.not.containEql('onload');
            sanitizedHtml.should.equal('<img>');
        });

        it('should handle data URL XSS', () => {
            const dataUrlXss =
                '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNAAAAABJRU5ErkJggg==">';
            const sanitizedDataUrl = checkXSS(dataUrlXss);
            sanitizedDataUrl.should.not.containEql('data:');
            sanitizedDataUrl.should.containEql('<img>');
        });
    });

    describe('7. Handling Dynamic Content', () => {
        it('should handle XSS in dynamic content', () => {
            const dynamicXss =
                '<div id="dynamicContent"></div><script>document.getElementById("dynamicContent").innerHTML = "<img src=\'x\' onerror=\'alert(1)\'>" </script>';
            const sanitizedDynamicXss = checkXSS(dynamicXss);
            sanitizedDynamicXss.should.not.containEql('onerror');
            sanitizedDynamicXss.should.containEql('<div id="dynamicContent"></div>');
        });
    });

    describe('8. Handling Mixed Content', () => {
        it('should sanitize mixed content', () => {
            const mixedContent = '<div>Normal text <script>alert("xss")</script> more text</div>';
            const sanitizedContent = checkXSS(mixedContent);
            sanitizedContent.should.not.containEql('<script>');
            sanitizedContent.should.containEql('<div>Normal text  more text</div>');
        });
    });
});
