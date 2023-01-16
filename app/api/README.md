[![restAPI](restAPI.png)](https://p2p.mirotalk.com/api/v1/docs)

## Create a meeting

Create a meeting with a `HTTP request` containing the `API_KEY` sent to MiroTalk’s server. The response contains a `meeting` URL that can be `embedded` in your client within an `iframe`.

```bash
cd meeting
# js
node meeting.js
# php
php meeting.php
# python
python meeting.py
# bash
./meeting.sh
```

## Embed a meeting

Embedding a meeting into a `service` or `app` requires using an `iframe` with the `src` attribute specified as the `meeting` from `HTTP response`. Change the iframe `src` with your own instance of MiroTalk.

```html
<iframe
    allow="camera; microphone; display-capture; fullscreen; clipboard-read; clipboard-write; autoplay"
    src="https://p2p.mirotalk.com/join/room_name"
    style="height: 100%; width: 100%; border: 0px;"
></iframe>
```

## Fast Integration

Develop your `website` or `application`, and bring `video meetings` in with a simple `iframe`.

```html
<iframe
    allow="camera; microphone; display-capture; fullscreen; clipboard-read; clipboard-write; autoplay"
    src="https://p2p.mirotalk.com/newcall"
    style="height: 100%; width: 100%; border: 0px;"
></iframe>
```
