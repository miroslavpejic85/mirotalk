'use strict';

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 8888;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Endpoint to receive webhooks
app.post('/webhook-endpoint', (req, res) => {
    const { event, data } = req.body;

    // Handle different events
    switch (event) {
        case 'join':
            console.log('User joined:', data);
            // Add your custom logic here
            break;
        case 'disconnect':
            console.log('User disconnected:', data);
            // Add your custom logic here
            break;
        default:
            console.error('Unknown event type');
            break;
    }

    res.status(200).send('Webhook received');
});

// Start the server
app.listen(port, () => {
    console.log(`Webhook server running on http://localhost:${port}`);
});
