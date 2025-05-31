'use strict';

// npx mocha test-api.js

require('should');

const sinon = require('sinon');
const proxyquire = require('proxyquire');
const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');
const ServerApi = require('../app/src/api');

describe('test-api', () => {
    let serverApi;
    const host = 'example.com';
    const authorization = 'secret-key';
    const apiKeySecret = 'secret-key';
    const timestamp = new Date().toISOString();

    beforeEach(() => {
        serverApi = new ServerApi(host, authorization, apiKeySecret);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('isAuthorized', () => {
        it('should return true when authorization matches the api key secret', () => {
            serverApi.isAuthorized().should.be.true();
        });

        it('should return false when authorization does not match the api key secret', () => {
            serverApi = new ServerApi(host, 'wrong-key', apiKeySecret);
            serverApi.isAuthorized().should.be.false();
        });
    });

    describe('getStats', () => {
        it('should return total number of rooms and users', () => {
            const roomList = {
                room1: {
                    peerId1: { peer_name: 'John Doe' },
                    peerId2: { peer_name: 'John Doe' },
                },
                room2: {
                    peerId1: { peer_name: 'John Doe' },
                },
            };

            const result = serverApi.getStats(roomList, timestamp);

            result.should.deepEqual({
                timestamp: timestamp,
                totalRooms: 2,
                totalPeers: 3,
            });
        });

        it('should return 0 users when there are no peers in any room', () => {
            const roomList = {
                room1: {},
                room2: {},
            };

            const result = serverApi.getStats(roomList, timestamp);

            result.should.deepEqual({
                timestamp: timestamp,
                totalRooms: 2,
                totalPeers: 0,
            });
        });

        it('should return 0 rooms when roomList is empty', () => {
            const roomList = {};

            const result = serverApi.getStats(roomList, timestamp);

            result.should.deepEqual({
                timestamp: timestamp,
                totalRooms: 0,
                totalPeers: 0,
            });
        });
    });

    describe('getMeetings', () => {
        it('should return formatted meetings with peer information', () => {
            const roomList = {
                room1: {
                    peerId1: {
                        peer_name: 'John Doe',
                        peer_presenter: true,
                        peer_video: true,
                        peer_audio: true,
                        peer_video_status: true,
                        peer_audio_status: true,
                        peer_screen_status: false,
                        peer_hand_status: false,
                        peer_rec_status: false,
                        peer_privacy_status: false,
                        os: 'macOS 10.15.7',
                        browser: 'Chrome 131.0.0.0',
                    },
                },
            };

            const result = serverApi.getMeetings(roomList);
            result.should.deepEqual(roomList);
        });

        it('should handle rooms with no peers', () => {
            const roomList = { room1: {} };
            const result = serverApi.getMeetings(roomList);
            result.should.deepEqual(roomList);
        });
    });

    describe('getMeetingURL', () => {
        it('should return a meeting URL with a generated UUID', () => {
            const uuidV4Stub = sinon.stub().returns('12345');
            const ServerApi = proxyquire('../app/src/api', {
                uuid: { v4: uuidV4Stub },
            });

            serverApi = new ServerApi(host, authorization);

            const result = serverApi.getMeetingURL();
            result.should.equal('https://example.com/join/12345');
        });
    });

    describe('getJoinURL', () => {
        it('should return a valid join URL with the given data', () => {
            const data = {
                room: 'room1',
                name: 'John Doe',
                avatar: 'avatar.jpg',
                audio: true,
                video: false,
                screen: false,
                hide: false,
                notify: false,
                token: { username: 'user', password: 'pass', presenter: true, expire: '1h' },
            };

            const tokenStub = sinon.stub(serverApi, 'getToken').returns('testToken');

            const result = serverApi.getJoinURL(data);
            result.should.equal(
                'https://example.com/join?room=room1&name=John%20Doe&avatar=avatar.jpg&audio=true&video=false&screen=false&hide=false&notify=false&token=testToken'
            );

            tokenStub.restore();
        });

        it('should use default values when data is not provided', () => {
            const randomStub = sinon.stub().returns('123456');
            const uuidV4Stub = sinon.stub().returns('room1');
            const ServerApi = proxyquire('../app/src/api', {
                uuid: { v4: uuidV4Stub },
            });

            serverApi = new ServerApi(host, authorization);
            sinon.stub(serverApi, 'getRandomNumber').callsFake(randomStub);

            const result = serverApi.getJoinURL({});
            result.should.equal(
                'https://example.com/join?room=room1&name=User-123456&avatar=false&audio=false&video=false&screen=false&hide=false&notify=false'
            );
        });
    });

    describe('getToken', () => {
        it('should return an encrypted JWT token', () => {
            const tokenData = { username: 'user', password: 'pass', presenter: true, expire: '1h' };
            const signStub = sinon.stub(jwt, 'sign').returns('jwtToken');
            const encryptStub = sinon.stub(CryptoJS.AES, 'encrypt').returns({ toString: () => 'encryptedPayload' });

            const result = serverApi.getToken(tokenData);
            result.should.equal('jwtToken');

            signStub
                .calledWith({ data: 'encryptedPayload' }, 'mirotalk_jwt_secret', { expiresIn: '1h' })
                .should.be.true();
            encryptStub
                .calledWith(
                    JSON.stringify({ username: 'user', password: 'pass', presenter: 'true' }),
                    'mirotalk_jwt_secret'
                )
                .should.be.true();

            signStub.restore();
            encryptStub.restore();
        });

        it('should return an empty string if no token data is provided', () => {
            const result = serverApi.getToken(null);
            result.should.equal('');
        });
    });

    describe('getRandomNumber', () => {
        it('should return a random number between 0 and 999999', () => {
            const result = serverApi.getRandomNumber();
            result.should.be.within(0, 999999);
        });
    });
});
