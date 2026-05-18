'use strict';

// npx mocha test-Validator.js

require('should');

const checkValidator = require('../app/src/validate');

describe('test-Validator', () => {
    describe('1. Handling invalid room name', () => {
        it('should return false for non-string inputs', () => {
            checkValidator.isValidRoomName(123).should.be.false();
            checkValidator.isValidRoomName({}).should.be.false();
            checkValidator.isValidRoomName([]).should.be.false();
            checkValidator.isValidRoomName(null).should.be.false();
            checkValidator.isValidRoomName(undefined).should.be.false();
        });

        it('should return false for xss injection inputs', () => {
            checkValidator.isValidRoomName('<script>alert("xss")</script>').should.be.false();
        });

        it('should return true for valid room name', () => {
            checkValidator.isValidRoomName('Room1').should.be.true();
            checkValidator.isValidRoomName('ConferenceRoom').should.be.true();
            checkValidator.isValidRoomName('Room_123').should.be.true();
            checkValidator.isValidRoomName('30521HungryHat').should.be.true();
            checkValidator.isValidRoomName('dbc4a9d9-6879-479a-b8fe-cedaad176b0d').should.be.true();
        });

        it('should return false for room name with path traversal', () => {
            checkValidator.isValidRoomName('../etc/passwd').should.be.false();
            checkValidator.isValidRoomName('..\\etc\\passwd').should.be.false();
            checkValidator.isValidRoomName('Room/../../etc').should.be.false();
            checkValidator.isValidRoomName('Room\\..\\..\\etc').should.be.false();
        });

        it('should return true for room names with special characters that do not imply path traversal', () => {
            checkValidator.isValidRoomName('Room_@!#$%^&*()').should.be.true();
            checkValidator.isValidRoomName('Room-Name').should.be.true();
            checkValidator.isValidRoomName('Room.Name').should.be.true();
        });
    });

    describe('2. Handle path traversal', () => {
        it('should return false for strings without path traversal', () => {
            checkValidator.hasPathTraversal('Room1').should.be.false();
            checkValidator.hasPathTraversal('Rec_Test.webm').should.be.false();
            checkValidator.hasPathTraversal('simple/path').should.be.false();
        });

        it('should return true for strings with path traversal', () => {
            checkValidator.hasPathTraversal('../etc/passwd').should.be.true();
            checkValidator.hasPathTraversal('..\\etc\\passwd').should.be.true();
            checkValidator.hasPathTraversal('Room/../../etc').should.be.true();
            checkValidator.hasPathTraversal('Room\\..\\..\\etc').should.be.true();
        });

        it('should return false for strings with ".." that do not indicate path traversal', () => {
            checkValidator.hasPathTraversal('Room..').should.be.false();
            checkValidator.hasPathTraversal('Rec..webm').should.be.false();
            checkValidator.hasPathTraversal('NoPathTraversalHere..').should.be.false();
        });

        it('should return true for complex path traversal patterns', () => {
            checkValidator.hasPathTraversal('..//').should.be.true();
            checkValidator.hasPathTraversal('..\\..\\').should.be.true();
            checkValidator.hasPathTraversal('../../').should.be.true();
            checkValidator.hasPathTraversal('.../../').should.be.true();
            checkValidator.hasPathTraversal('....//').should.be.true();
            checkValidator.hasPathTraversal('..//..//..//').should.be.true();
        });

        it('should return true for URL-encoded path traversal', () => {
            checkValidator.hasPathTraversal('%2e%2e%2fRoom').should.be.true();
            checkValidator.hasPathTraversal('%2e%2e%2f%2e%2e%2fRoom').should.be.true();
            checkValidator.hasPathTraversal('%252e%252e%252f').should.be.true();
        });

        it('should return false for valid absolute paths', () => {
            checkValidator.hasPathTraversal('/etc/passwd').should.be.false();
            checkValidator.hasPathTraversal('C:\\Windows\\System32').should.be.false();
        });

        it('should return false for non-traversal relative paths', () => {
            checkValidator.hasPathTraversal('Room/Room2').should.be.false();
            checkValidator.hasPathTraversal('C:\\SomeDir\\OtherDir').should.be.false();
        });

        it('should return false for excessively long path inputs', () => {
            const longPath = 'Room/'.repeat(1000);
            checkValidator.hasPathTraversal(longPath).should.be.false();
        });

        it('should return false for paths with Windows reserved filenames', () => {
            checkValidator.hasPathTraversal('C:\\CON\\myfile.txt').should.be.false();
            checkValidator.hasPathTraversal('C:\\NUL\\myfile.txt').should.be.false();
        });

        it('should return false for valid Windows paths with backslashes', () => {
            checkValidator.hasPathTraversal('C:\\Program Files\\MyApp').should.be.false();
            checkValidator.hasPathTraversal('C:\\SomeDir\\OtherDir\\File.txt').should.be.false();
        });
    });

    describe('3. isPrivateOrLoopbackHost', () => {
        it('should flag IPv4 loopback / private / link-local / CGNAT / multicast', () => {
            checkValidator.isPrivateOrLoopbackHost('127.0.0.1').should.be.true();
            checkValidator.isPrivateOrLoopbackHost('127.255.255.254').should.be.true();
            checkValidator.isPrivateOrLoopbackHost('0.0.0.0').should.be.true();
            checkValidator.isPrivateOrLoopbackHost('10.0.0.5').should.be.true();
            checkValidator.isPrivateOrLoopbackHost('172.16.0.1').should.be.true();
            checkValidator.isPrivateOrLoopbackHost('172.31.255.255').should.be.true();
            checkValidator.isPrivateOrLoopbackHost('192.168.1.1').should.be.true();
            checkValidator.isPrivateOrLoopbackHost('169.254.169.254').should.be.true(); // AWS IMDS
            checkValidator.isPrivateOrLoopbackHost('100.64.0.1').should.be.true(); // CGNAT
            checkValidator.isPrivateOrLoopbackHost('224.0.0.1').should.be.true(); // multicast
            checkValidator.isPrivateOrLoopbackHost('255.255.255.255').should.be.true();
        });

        it('should not flag public IPv4', () => {
            checkValidator.isPrivateOrLoopbackHost('8.8.8.8').should.be.false();
            checkValidator.isPrivateOrLoopbackHost('1.1.1.1').should.be.false();
            checkValidator.isPrivateOrLoopbackHost('172.15.0.1').should.be.false(); // just outside 172.16/12
            checkValidator.isPrivateOrLoopbackHost('172.32.0.1').should.be.false(); // just outside 172.16/12
            checkValidator.isPrivateOrLoopbackHost('100.63.255.255').should.be.false(); // just outside CGNAT
        });

        it('should treat malformed IPv4 as unsafe', () => {
            checkValidator.isPrivateOrLoopbackHost('999.0.0.1').should.be.true();
            checkValidator.isPrivateOrLoopbackHost('256.0.0.1').should.be.true();
        });

        it('should flag IPv6 loopback / link-local / ULA / multicast', () => {
            checkValidator.isPrivateOrLoopbackHost('::1').should.be.true();
            checkValidator.isPrivateOrLoopbackHost('::').should.be.true();
            checkValidator.isPrivateOrLoopbackHost('fe80::1').should.be.true();
            checkValidator.isPrivateOrLoopbackHost('fc00::1').should.be.true(); // ULA
            checkValidator.isPrivateOrLoopbackHost('fd00::1').should.be.true(); // ULA
            checkValidator.isPrivateOrLoopbackHost('ff02::1').should.be.true(); // multicast
        });

        it('should unwrap IPv4-mapped IPv6 and re-check', () => {
            checkValidator.isPrivateOrLoopbackHost('::ffff:127.0.0.1').should.be.true();
            checkValidator.isPrivateOrLoopbackHost('::ffff:192.168.1.1').should.be.true();
            checkValidator.isPrivateOrLoopbackHost('::ffff:8.8.8.8').should.be.false();
        });

        it('should not flag public IPv6', () => {
            checkValidator.isPrivateOrLoopbackHost('2001:4860:4860::8888').should.be.false();
        });

        it('should not flag plain hostnames (DNS not resolved here)', () => {
            checkValidator.isPrivateOrLoopbackHost('example.com').should.be.false();
            checkValidator.isPrivateOrLoopbackHost('cdn.example.com').should.be.false();
        });
    });

    describe('4. isSafeImageSrc', () => {
        it('should reject non-strings and empty input', () => {
            checkValidator.isSafeImageSrc(null).should.be.false();
            checkValidator.isSafeImageSrc(undefined).should.be.false();
            checkValidator.isSafeImageSrc(123).should.be.false();
            checkValidator.isSafeImageSrc({}).should.be.false();
            checkValidator.isSafeImageSrc('').should.be.false();
            checkValidator.isSafeImageSrc('   ').should.be.false();
        });

        it('should accept data:image/* URIs', () => {
            checkValidator.isSafeImageSrc('data:image/png;base64,iVBORw0KGgo=').should.be.true();
            checkValidator.isSafeImageSrc('data:image/jpeg;base64,/9j/4AAQ').should.be.true();
            checkValidator.isSafeImageSrc('data:image/gif;base64,R0lGOD').should.be.true();
            checkValidator.isSafeImageSrc('data:image/webp;base64,UklGR').should.be.true();
            checkValidator.isSafeImageSrc('data:image/svg+xml;utf8,<svg/>').should.be.true();
        });

        it('should reject non-image data: URIs', () => {
            checkValidator.isSafeImageSrc('data:text/html;base64,PHNjcmlwdD4=').should.be.false();
            checkValidator.isSafeImageSrc('data:application/json,{}').should.be.false();
        });

        it('should reject dangerous schemes', () => {
            checkValidator.isSafeImageSrc('javascript:alert(1)').should.be.false();
            checkValidator.isSafeImageSrc('vbscript:msgbox(1)').should.be.false();
            checkValidator.isSafeImageSrc('file:///etc/passwd').should.be.false();
            checkValidator.isSafeImageSrc('blob:https://x/abc').should.be.false();
            checkValidator.isSafeImageSrc('gopher://example.com/').should.be.false();
            checkValidator.isSafeImageSrc('ftp://example.com/x.png').should.be.false();
            checkValidator.isSafeImageSrc('not a url at all').should.be.false();
        });

        it('should accept http(s) to public hosts', () => {
            checkValidator.isSafeImageSrc('https://cdn.example.com/logo.png').should.be.true();
            checkValidator.isSafeImageSrc('http://example.com/pub.png').should.be.true();
            checkValidator.isSafeImageSrc('https://1.1.1.1/x.png').should.be.true();
        });

        it('should reject http(s) to internal/loopback/private/link-local hosts', () => {
            checkValidator.isSafeImageSrc('http://localhost/x').should.be.false();
            checkValidator.isSafeImageSrc('http://anything.localhost/x').should.be.false();
            checkValidator.isSafeImageSrc('http://127.0.0.1:22/x').should.be.false();
            checkValidator.isSafeImageSrc('http://10.0.0.5/x').should.be.false();
            checkValidator.isSafeImageSrc('http://192.168.1.1/x').should.be.false();
            checkValidator.isSafeImageSrc('http://169.254.169.254/latest/meta-data/').should.be.false();
            checkValidator.isSafeImageSrc('http://[::1]/x').should.be.false();
            checkValidator.isSafeImageSrc('http://[fe80::1]/x').should.be.false();
        });
    });

    describe('5. sanitizeWbCanvasJson', () => {
        const safeImg = 'https://cdn.example.com/logo.png';
        const dataImg = 'data:image/png;base64,iVBORw0KGgo=';
        const unsafeImgs = ['http://127.0.0.1/x', 'http://10.0.0.1/x', 'file:///etc/passwd', 'javascript:alert(1)'];

        const buildCanvas = () => ({
            version: '5.3.0',
            objects: [
                ...unsafeImgs.map((src) => ({ type: 'image', src, left: 0, top: 0 })),
                { type: 'image', src: safeImg, left: 0, top: 0 },
                { type: 'image', src: dataImg, left: 0, top: 0 },
                { type: 'path', path: [['M', 0, 0]] },
                { type: 'text', text: 'hi' },
            ],
        });

        it('should be a no-op for missing / non-object input', () => {
            // these must not throw
            checkValidator.sanitizeWbCanvasJson(null);
            checkValidator.sanitizeWbCanvasJson(undefined);
            checkValidator.sanitizeWbCanvasJson({});
            checkValidator.sanitizeWbCanvasJson({ wbCanvasJson: null });
        });

        it('should strip unsafe image objects from a stringified payload and keep wire format', () => {
            const cfg = { wbCanvasJson: JSON.stringify(buildCanvas()) };
            checkValidator.sanitizeWbCanvasJson(cfg);
            (typeof cfg.wbCanvasJson).should.equal('string');
            const parsed = JSON.parse(cfg.wbCanvasJson);
            // 4 unsafe images dropped; 2 images + path + text kept => 4 objects
            parsed.objects.should.have.length(4);
            const srcs = parsed.objects.filter((o) => o.type === 'image').map((o) => o.src);
            srcs.should.containEql(safeImg);
            srcs.should.containEql(dataImg);
            srcs.should.not.containEql('http://127.0.0.1/x');
            srcs.should.not.containEql('javascript:alert(1)');
            // non-image objects survived
            parsed.objects.some((o) => o.type === 'path').should.be.true();
            parsed.objects.some((o) => o.type === 'text').should.be.true();
        });

        it('should strip unsafe image objects from an object payload (mutated in place)', () => {
            const cfg = { wbCanvasJson: buildCanvas() };
            checkValidator.sanitizeWbCanvasJson(cfg);
            (typeof cfg.wbCanvasJson).should.equal('object');
            cfg.wbCanvasJson.objects.should.have.length(4);
        });

        it('should invoke onDrop for each dropped image', () => {
            const dropped = [];
            const cfg = { wbCanvasJson: JSON.stringify(buildCanvas()) };
            checkValidator.sanitizeWbCanvasJson(cfg, (msg, ctx) => dropped.push(ctx.src));
            dropped.should.have.length(unsafeImgs.length);
            unsafeImgs.forEach((s) => dropped.should.containEql(s));
        });

        it('should leave payload untouched when wbCanvasJson is malformed JSON string', () => {
            const cfg = { wbCanvasJson: 'not-json{' };
            checkValidator.sanitizeWbCanvasJson(cfg);
            cfg.wbCanvasJson.should.equal('not-json{');
        });

        it('should handle payloads without an objects array', () => {
            const cfg = { wbCanvasJson: JSON.stringify({ version: '5.3.0', background: '#fff' }) };
            checkValidator.sanitizeWbCanvasJson(cfg);
            const parsed = JSON.parse(cfg.wbCanvasJson);
            parsed.background.should.equal('#fff');
        });

        it('should not break case-mismatched image types (e.g. "Image")', () => {
            const cfg = {
                wbCanvasJson: JSON.stringify({
                    objects: [
                        { type: 'Image', src: 'http://127.0.0.1/x' },
                        { type: 'IMAGE', src: 'javascript:alert(1)' },
                        { type: 'image', src: safeImg },
                    ],
                }),
            };
            checkValidator.sanitizeWbCanvasJson(cfg);
            const parsed = JSON.parse(cfg.wbCanvasJson);
            parsed.objects.should.have.length(1);
            parsed.objects[0].src.should.equal(safeImg);
        });
    });
});
