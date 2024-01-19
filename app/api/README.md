![restAPI](restAPI.png)

## Create a Meeting

To initiate a meeting, send an HTTP request to MiroTalk’s server with your API key. Replace the default secret key in `.env` with your own.

```bash
API_KEY_SECRET=mirotalk_default_secret
```

Use the following examples to make API calls:

```bash
# Node.js
node meeting.js
node join.js

# PHP
php meeting.php
php join.php

# Python
python3 meeting.py
python3 join.py

# Bash
./meeting.sh
./join.sh
```

The server response will contain a meeting URL that can be embedded in your client using an iframe.

---

## Embed a Meeting

To embed a meeting in your service or app, use an iframe with the source attribute set to the meeting URL obtained from the HTTP response.

```html
<iframe
    allow="camera; microphone; display-capture; fullscreen; clipboard-read; clipboard-write; autoplay"
    src="https://p2p.mirotalk.com/join/test"
    style="height: 100vh; width: 100vw; border: 0px;"
></iframe>
```

---

## Fast Integration

Integrate video meetings into your website or application quickly by incorporating the following iframe code:

```html
<iframe
    allow="camera; microphone; display-capture; fullscreen; clipboard-read; clipboard-write; autoplay"
    src="https://p2p.mirotalk.com/newcall"
    style="height: 100vh; width: 100vw; border: 0px;"
></iframe>
```
