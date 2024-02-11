'use strict';

// npm i node-fetch

async function getJoin() {
    try {
        // Use dynamic import with await
        const { default: fetch } = await import('node-fetch');

        const API_KEY_SECRET = 'mirotalk_default_secret';
        const MIROTALK_URL = 'https://p2p.mirotalk.com/api/v1/join';
        // const MIROTALK_URL = 'http://localhost:3000/api/v1/join';
        // const MIROTALK_URL = "https://mirotalk.up.railway.app/api/v1/join";

        const response = await fetch(MIROTALK_URL, {
            method: 'POST',
            headers: {
                authorization: API_KEY_SECRET,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                room: 'test',
                name: 'mirotalk',
                audio: true,
                video: true,
                screen: false,
                hide: false,
                notify: true,
                token: {
                    username: 'username',
                    password: 'password',
                    presenter: true,
                    expire: '1h',
                },
            }),
        });
        const data = await response.json();
        if (data.error) {
            console.log('Error:', data.error);
        } else {
            console.log('join:', data.join);
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

getJoin();
