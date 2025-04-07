#!/bin/bash

# Configuration
API_KEY_SECRET="mirotalkp2p_default_secret"
MIROTALK_URL="https://p2p.mirotalk.com/api/v1/join"
# Alternative URLs:
# MIROTALK_URL="http://localhost:3000/api/v1/join"
# MIROTALK_URL="https://mirotalk.up.railway.app/api/v1/join"

# Join request data
REQUEST_DATA='{
    "room": "test",
    "name": "mirotalk",
    "avatar": false,
    "audio": false,
    "video": false,
    "screen": false,
    "hide": false,
    "notify": true,
    "token": {
        "username": "username",
        "password": "password",
        "presenter": true,
        "expire": "1h"
    }
}'

# Make the API request
curl -X POST "$MIROTALK_URL" \
    -H "authorization: $API_KEY_SECRET" \
    -H "Content-Type: application/json" \
    -d "$REQUEST_DATA"