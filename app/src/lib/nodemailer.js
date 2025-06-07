'use strict';

const nodemailer = require('nodemailer');
const Logs = require('../logs');
const log = new Logs('NodeMailer');

// Email config
const emailCfg = {
    alert: process.env.EMAIL_ALERT === 'true' || false,
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    username: process.env.EMAIL_USERNAME,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || process.env.EMAIL_USERNAME,
    send_to: process.env.EMAIL_SEND_TO,
    // Room join params
    https: process.env.HTTPS === 'true' || false,
    server_port: process.env.PORT || 3000,
};

const isTLSPort = emailCfg.port === 465; // 465 is the default TLS/SSL port
const transport = nodemailer.createTransport({
    host: emailCfg.host,
    port: emailCfg.port,
    secure: isTLSPort, // true for 465, false for other ports
    auth: {
        user: emailCfg.username,
        pass: emailCfg.password,
    },
});

/**
 * Check if passed config is valid
 * @param {object} config
 * @returns bool
 */
function isConfigValid(config) {
    return config.alert && config.host && config.port && config.username && config.password && config.send_to;
}

/**
 * Send Email alert or notification from event
 * @param {string} event
 * @param {object} data
 * @returns void
 */
function sendEmailAlert(event, data) {
    if (!isConfigValid(emailCfg)) return;

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
            from: emailCfg.from,
            to: emailCfg.send_to,
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
        ? `${emailCfg.https ? 'https' : 'http'}://${domain}:${emailCfg.server_port}`
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
    emailCfg,
};
