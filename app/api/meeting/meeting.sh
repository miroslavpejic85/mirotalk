#!/bin/bash

API_KEY="mirotalk_default_secret"
# MIROTALK_URL="http://localhost:3000/api/v1/meeting"
# MIROTALK_URL=https://mirotalk.herokuapp.com/api/v1/meeting
MIROTALK_URL=https://mirotalk.up.railway.app/api/v1/meeting

curl $MIROTALK_URL \
    --header "authorization: $API_KEY" \
    --header "Content-Type: application/json" \
    --request POST