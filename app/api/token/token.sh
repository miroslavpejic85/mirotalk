#!/bin/bash

API_KEY_SECRET="mirotalkp2p_default_secret"
MIROTALK_URL="https://p2p.mirotalk.com/api/v1/token"
#MIROTALK_URL="http://localhost:3000/api/v1/token"

curl $MIROTALK_URL \
    --header "authorization: $API_KEY_SECRET" \
    --header "Content-Type: application/json" \
    --data '{"username":"username","password":"password","presenter":"true", "expire":"1h"}' \
    --request POST