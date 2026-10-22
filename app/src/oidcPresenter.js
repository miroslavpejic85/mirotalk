'use strict';

// OIDC identities usable in PRESENTERS: the verified email (case-insensitive) or the stable `sub`.
// The wildcard '*' matches any authenticated OIDC user (OIDC only, never host logins or display names).
function isOidcConfiguredPresenter(oidcUser, presenterList) {
    if (!oidcUser || !Array.isArray(presenterList) || presenterList.length === 0) return false;

    const { email, email_verified: emailVerified, sub } = oidcUser;
    const hasSub = typeof sub === 'string' && sub.length > 0;

    if (hasSub && presenterList.includes('*')) return true;

    if (hasSub && presenterList.includes(sub)) return true;

    return (
        typeof email === 'string' &&
        email.length > 0 &&
        emailVerified !== false &&
        emailVerified !== 'false' &&
        presenterList.map((entry) => String(entry).toLowerCase()).includes(email.toLowerCase())
    );
}

module.exports = { isOidcConfiguredPresenter };
