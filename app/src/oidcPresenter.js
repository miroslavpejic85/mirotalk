'use strict';

// OIDC identities usable in PRESENTERS: the verified email (case-insensitive) or the stable `sub`
function isOidcConfiguredPresenter(oidcUser, presenterList) {
    if (!oidcUser || !Array.isArray(presenterList) || presenterList.length === 0) return false;

    const { email, email_verified: emailVerified, sub } = oidcUser;

    if (typeof sub === 'string' && sub.length > 0 && presenterList.includes(sub)) return true;

    return (
        typeof email === 'string' &&
        email.length > 0 &&
        emailVerified !== false &&
        emailVerified !== 'false' &&
        presenterList.map((entry) => String(entry).toLowerCase()).includes(email.toLowerCase())
    );
}

module.exports = { isOidcConfiguredPresenter };
