'use strict';

const xss = require('xss');
const Logs = require('./logs');
const log = new Logs('xss');

/**
 * Prevent XSS injection by client side
 *
 * @param {object} dataObject
 * @returns sanitized object
 */
const checkXSS = (dataObject) => {
    try {
        if (Array.isArray(dataObject)) {
            if (Object.keys(dataObject).length > 0 && typeof dataObject[0] === 'object') {
                dataObject.forEach((obj) => {
                    for (const key in obj) {
                        if (obj.hasOwnProperty(key)) {
                            let objectJson = objectToJSONString(obj[key]);
                            if (objectJson) {
                                let jsonString = xss(objectJson);
                                let jsonObject = JSONStringToObject(jsonString);
                                if (jsonObject) {
                                    obj[key] = jsonObject;
                                }
                            }
                        }
                    }
                });
                log.debug('XSS Array of Object sanitization done');
                return dataObject;
            }
        } else if (typeof dataObject === 'object') {
            let objectJson = objectToJSONString(dataObject);
            if (objectJson) {
                let jsonString = xss(objectJson);
                let jsonObject = JSONStringToObject(jsonString);
                if (jsonObject) {
                    log.debug('XSS Object sanitization done');
                    return jsonObject;
                }
            }
        } else if (typeof dataObject === 'string' || dataObject instanceof String) {
            log.debug('XSS String sanitization done');
            return xss(dataObject);
        }
        log.warn('XSS not sanitized', dataObject);
        return dataObject;
    } catch (error) {
        log.error('XSS error', { data: dataObject, error: error });
        return dataObject;
    }
};

function objectToJSONString(dataObject) {
    try {
        return JSON.stringify(dataObject);
    } catch (error) {
        return false;
    }
}

function JSONStringToObject(jsonString) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        return false;
    }
}

module.exports = checkXSS;
