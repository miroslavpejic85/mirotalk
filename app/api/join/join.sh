#!/bin/bash

API_KEY_SECRET="mirotalk_default_secret"
MIROTALK_URL="https://p2p.mirotalk.com/api/v1/join"
# MIROTALK_URL="http://localhost:3000/api/v1/join"
# MIROTALK_URL = "https://mirotalk.up.railway.app/api/v1/join"

curl $MIROTALK_URL \
    --header "authorization: $API_KEY_SECRET" \
    --header "Content-Type: application/json" \
    --data '{"room":"test","name":"mirotalk","audio":"true","video":"true","screen":"false","hide":"false","notify":"true","token":{"username":"username","password":"password","presenter":"true", "expire":"1h"}}' \
    --request POST