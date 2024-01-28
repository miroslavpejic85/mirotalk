'use strict';

// Umami analytics: https://github.com/mikecao/umami

console.log('STATS', window.location);

const statsDataKey = 'statsData';
const statsData = window.sessionStorage.getItem(statsDataKey);

const apiUrl = window.location.origin + '/stats';

if (statsData) {
    setStats(JSON.parse(statsData));
} else {
    fetch(apiUrl)
        .then((response) => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then((data) => {
            setStats(data);
            window.sessionStorage.setItem(statsDataKey, JSON.stringify(data));
        })
        .catch((error) => {
            console.error('Stats fetch error:', error);
        });
}

function setStats(data) {
    console.log('STATS', data);
    const { enabled, src, id } = data;
    if (enabled) {
        const script = document.createElement('script');
        script.setAttribute('async', '');
        script.setAttribute('src', src);
        script.setAttribute('data-website-id', id);
        document.head.appendChild(script);
    }
}
