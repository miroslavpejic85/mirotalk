'use strict';

const checkXSS = require('./xss.js');

function isValidRoomName(input) {
    if (typeof input !== 'string') {
        return false;
    }
    const room = checkXSS(input);
    return !room ? false : !hasPathTraversal(room);
}

function hasPathTraversal(input) {
    const pathTraversalPattern = /(\.\.(\/|\\))+/;
    return pathTraversalPattern.test(input);
}

module.exports = {
    isValidRoomName,
    hasPathTraversal,
};
