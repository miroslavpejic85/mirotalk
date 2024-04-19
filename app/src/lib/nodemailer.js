'use strict';

const nodemailer = require('nodemailer');
const Logs = require('../logs');
const log = new Logs('NodeMailer');

const HTTPS = process.env.HTTPS === 'true' || false;
const LOCAL_PORT = process.env.PORT || 3000;

const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = process.env.EMAIL_PORT;
const EMAIL_USERNAME = process.env.EMAIL_USERNAME;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const EMAIL_SEND_TO = process.env.EMAIL_SEND_TO;
const EMAIL_ALERT = process.env.EMAIL_ALERT === 'true' || false;

if (EMAIL_ALERT && EMAIL_HOST && EMAIL_PORT && EMAIL_USERNAME && EMAIL_PASSWORD && EMAIL_SEND_TO) {
    log.info('Email', {
        alert: EMAIL_ALERT,
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        username: EMAIL_USERNAME,
        password: EMAIL_PASSWORD,
    });
}

const transport = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    auth: {
        user: EMAIL_USERNAME,
        pass: EMAIL_PASSWORD,
    },
});

/**
 * Send Email alert or notification from event
 * @param {string} event
 * @param {object} data
 * @returns void
 */
function sendEmailAlert(event, data) {
    if (!EMAIL_ALERT || !EMAIL_HOST || !EMAIL_PORT || !EMAIL_USERNAME || !EMAIL_PASSWORD || !EMAIL_SEND_TO) return;

    log.info('sendEMailAlert', {
        event: event,
        data: data,
    });

    let subject = false;
    let body = false;

    switch (event) {
        case 'join':
            subject = getJoinRoomSubject(data);
            body = getJoinRoomBody(data);
            break;
        // ...
        default:
            break;
    }

    if (subject && body) sendEmail(subject, body);
}

/**
 * Send Email
 * @param {string} subject
 * @param {string} body html
 */
function sendEmail(subject, body) {
    transport
        .sendMail({
            from: EMAIL_USERNAME,
            to: EMAIL_SEND_TO,
            subject: subject,
            html: body,
        })
        .catch((err) => log.error(err));
}

/**
 * Get Join room subject
 * @param {object} data
 * @returns string
 */
function getJoinRoomSubject(data) {
    const { room_id } = data;
    return `MiroTalk P2P - New user Join to Room ${room_id}`;
}

/**
 * Get Join room body template
 * @param {object} data
 * @returns string
 */
function getJoinRoomBody(data) {
    const { peer_name, room_id, domain, os, browser } = data;

    const currentDataTime = getCurrentDataTime();

    const localDomains = ['localhost', '127.0.0.1'];

    const currentDomain = localDomains.some((localDomain) => domain.includes(localDomain))
        ? `${HTTPS ? 'https' : 'http'}://${domain}:${LOCAL_PORT}`
        : domain;

    const room_join = `${currentDomain}/join/`;

    return `
        <h1>New user join</h1>
        <style>
            table {
                font-family: arial, sans-serif;
                border-collapse: collapse;
                width: 100%;
            }
            td {
                border: 1px solid #dddddd;
                text-align: left;
                padding: 8px;
            }
            tr:nth-child(even) {
                background-color: #dddddd;
            }
        </style>
        <table>
            <tr>
                <td>User</td>
                <td>${peer_name}</td>
            </tr>
            <tr>
                <td>Os</td>
                <td>${os}</td>
            </tr>
            <tr>
                <td>Browser</td>
                <td>${browser}</td>
            </tr>
            <tr>
                <td>Room</td>
                <td>${room_join}${room_id}</td>
            </tr>
            <tr>
                <td>Date, Time</td>
                <td>${currentDataTime}</td>
            </tr>
        </table>
    `;
}

/**
 * Get current data and time
 * @returns string
 */
function getCurrentDataTime() {
    const currentTime = new Date().toLocaleString('en-US', log.tzOptions);
    const milliseconds = String(new Date().getMilliseconds()).padStart(3, '0');
    return `${currentTime}:${milliseconds}`;
}

module.exports = {
    sendEmailAlert,
};
