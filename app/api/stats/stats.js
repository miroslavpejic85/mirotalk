'use strict';

async function getStats() {
    try {
        // Use dynamic import with await
        const { default: fetch } = await import('node-fetch');

        const API_KEY_SECRET = 'mirotalkp2p_default_secret';
        const MIROTALK_URL = 'https://p2p.mirotalk.com/api/v1/stats';
        //const MIROTALK_URL = 'http://localhost:3000/api/v1/stats';

        const response = await fetch(MIROTALK_URL, {
            method: 'GET',
            headers: {
                authorization: API_KEY_SECRET,
                'Content-Type': 'application/json',
            },
        });
        const data = await response.json();
        if (data.error) {
            console.log('Error:', data.error);
        } else {
            if (data) {
                const formattedData = JSON.stringify(data, null, 2);
                console.log(formattedData);
            }
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

getStats();
