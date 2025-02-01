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
});
