# MiroTalk P2P

[//]: https://img.shields.io/badge/<LABEL>-<MESSAGE>-<COLOR>

[![Author](https://img.shields.io/badge/Author-Miroslav-brightgreen.svg)](https://www.linkedin.com/in/miroslav-pejic-976a07101/)
![License: AGPLv3](https://img.shields.io/badge/License-AGPLv3-blue.svg)
[![Support](https://img.shields.io/badge/Support-PayPal-brightgreen.svg)](https://paypal.me/MiroslavPejic?locale.x=it_IT)
[![Digital Ocean](https://img.shields.io/badge/Tested%20on-DigitalOcean-blue)](https://m.do.co/c/1070207afbb1)
[![Code style: prettier](https://img.shields.io/badge/Code_style-Prettier-ff69b4.svg?)](https://github.com/prettier/prettier)
[![Discord](https://img.shields.io/badge/chat-discord-green)](https://discord.gg/rgGYfeYW3N)

Free `WebRTC` browser-based video calls, chat, and screen sharing, using google Stun and [numb](http://numb.viagenie.ca/) Turn. `MiroTalk` provides video quality and latency not available with traditional technology.

Open the app with the following **supported browsers** and many more.

[![browsers](public/images/browsers.png)](https://mirotalk.herokuapp.com/)

## https://mirotalk.herokuapp.com/

<br>

[![mirotalk](public/images/mirotalk-header.gif)](https://mirotalk.herokuapp.com/)

## Features

-   Is `100% Free` - `Open Source` - `Self-hosted`
-   No download, plug-in, or login required, entirely browser-based
-   Unlimited number of conference rooms without call time limitation
-   Possibility to Lock/Unlock the Room for the meeting
-   Desktop and Mobile compatible
-   Optimized Room URL Sharing (share it to your participants, wait for them to join)
-   Webcam Streaming (Front - Rear for mobile)
-   Audio Streaming crystal clear + detect speacking and indicator
-   Screen Sharing to present documents, slides, and more...
-   File Sharing, share any files to your participants in the room
-   Select Audio Input - Output && Video source
-   Ability to set video quality up to 4K and 60 FPS
-   Recording your Screen, Audio and Video
-   Snapshot the video frame and save it as image png
-   Chat with Emoji Picker & Private messages & Save the conversations
-   Speech recognition to send the speeches
-   Advance collaborative whiteboard for the teachers
-   Share any YT Embed video in real-time
-   Full-Screen Mode on mouse click on the Video element
-   Possibility to Change UI Themes
-   Right-click on the Video elements for more options
-   Direct `peer-to-peer` connection ensures the lowest latency thanks to `WebRTC`
-   Supports [REST API](app/api/README.md) (Application Programming Interface)

## Presentation

https://www.canva.com/design/DAE693uLOIU/view

## Demo

-   `Open` https://mirotalk.up.railway.app/newcall or https://mirotalk.herokuapp.com/newcall
-   `Pick` your Room name and Join
-   `Allow` using the camera and microphone
-   `Share` the Room URL and Wait for someone to join for the video conference

## Direct join

-   You can also `join` directly to your `room` by going to:
-   https://mirotalk.up.railway.app/join?room=test&name=mirotalk&audio=0&video=0&notify=0
-   https://mirotalk.herokuapp.com/join?room=test&name=mirotalk&audio=0&video=0&notify=0

    | Params | Type    | Description      |
    | ------ | ------- | ---------------- |
    | room   | string  | room Id          |
    | name   | string  | user name        |
    | audio  | boolean | enable / disable |
    | video  | boolean | enable / disable |
    | notify | boolean | enable / disable |

## Embed a meeting

Embedding a meeting into a service or app using an iframe.

```html
<iframe
    allow="camera; microphone; fullscreen; display-capture; autoplay"
    src="https://mirotalk.up.railway.app/newcall"
    style="height: 100%; width: 100%; border: 0px;"
></iframe>
```

## Quick start

-   You will need to have `Node.js` installed, this project has been tested with Node version [12.X](https://nodejs.org/en/blog/release/v12.22.1/) and [14.X](https://nodejs.org/en/blog/release/v14.17.5/)

```bash
# clone this repo
$ git clone https://github.com/miroslavpejic85/mirotalk.git
# go to mirotalk dir
$ cd mirotalk
# copy .env.template to .env
$ cp .env.template .env
# install dependencies
$ npm install
# start the server
$ npm start
```

-   Open http://localhost:3000 in browser

---

## Docker

-   Install docker engine: https://docs.docker.com/engine/install/
-   Install docker compose: https://docs.docker.com/compose/install/

```bash
# copy .env.template to .env
$ cp .env.template .env
# build or rebuild services
$ docker-compose build
# create and start containers
$ docker-compose up # -d
# stop and remove resources
$ docker-compose down
```

-   Open http://localhost:3000 in browser

---

## Setup Turn

`Recommended`, for more info about the Turn check out [here](https://webrtc.org/getting-started/turn-server). Just edit [this part](https://github.com/miroslavpejic85/mirotalk/blob/master/.env.template#L9) on your `.env`.

---

## API

```bash
# The response will give you a entrypoint / Room URL for your meeting, where authorization: API_KEY_SECRET.
$ curl -X POST "http://localhost:3000/api/v1/meeting" -H "authorization: mirotalk_default_secret" -H "Content-Type: application/json"
$ curl -X POST "https://mirotalk.up.railway.app/api/v1/meeting" -H "authorization: mirotalk_default_secret" -H "Content-Type: application/json"
$ curl -X POST "https://mirotalk.herokuapp.com/api/v1/meeting" -H "authorization: mirotalk_default_secret" -H "Content-Type: application/json"
```

## API Documentation

The API documentation uses [swagger](https://swagger.io/) at http://localhost:3000/api/v1/docs. Or check it out on [railway](https://mirotalk.up.railway.app/api/v1/docs) & [heroku](https://mirotalk.herokuapp.com/api/v1/docs).

---

## HTTPS

If you want `MiroTalk` to be `reachable` from the `outside` of your local network, you can use a service like [ngrok](https://ngrok.com/) (by editing the [Ngrok part](https://github.com/miroslavpejic85/mirotalk/blob/master/.env.template#L1) on `.env` file) or expose it directly on [HTTPS](app/ssl/README.md)

## Live demo

<a target="_blank" href="https://www.heroku.com/"><img src="https://www.herokucdn.com/deploy/button.svg" style="width: 220px;"></a>

https://mirotalk.herokuapp.com/

[![heroku-qr](public/images/mirotalk-heroku-qr.png)](https://mirotalk.herokuapp.com/)

<br>

<a target="_blank" href="https://railway.app"><img src="https://railway.app/button.svg" style="width: 220px;"></a>

https://mirotalk.up.railway.app/

[![railway-qr](public/images/mirotalk-railway-qr.png)](https://mirotalk.up.railway.app/)

---

## Credits

-   ianramzy (html [template](https://cruip.com/demos/neon/))
-   vasanthv (webrtc-logic)
-   fabric.js (whiteboard)

## Contributing

-   Contributions are welcome and greatly appreciated!
-   Just run before `npm run lint`

## Discussions

-   For discussions about the project, join with us on [Discord](https://discord.gg/rgGYfeYW3N)

<br/>

## License

[![AGPLv3](public/images/AGPLv3.png)](LICENSE)

MiroTalk is free and can be modified and forked. But the conditions of the AGPLv3 (GNU Affero General Public License v3.0) need to be respected. In particular modifications need to be free as well and made available to the public. Get a quick overview of the license at [Choose an open source license](https://choosealicense.com/licenses/agpl-3.0/).

---

<br/>

## Commercial License or closed source

For commercial use or closed source projects, we can offer licensing under the following terms.

> World-wide, non-exclusive, non-transferable and non-sub-licensable license of MiroTalk as is on https://github.com/miroslavpejic85/mirotalk for use in purchasers products, as long as the resulting software does not stand in concurrence to the MiroTalk itself. Any liability is excluded. The law of the Federal Republic of Italy shall apply exclusively.

The one time fee is 499 EUR net. Please contact miroslav.pejic.85@gmail.com.

---

<br>

# Sponsors

Support this project by [becoming a sponsor](https://github.com/sponsors/miroslavpejic85). Your logo will show up here with a link to your website.

[![BroadcastX](public/sponsors/BroadcastX.png)](https://broadcastx.de/)

---

<br>

# MiroTalk SFU

Try also [MiroTalk SFU](https://github.com/miroslavpejic85/mirotalksfu), the difference between the two projects you can found [here](https://github.com/miroslavpejic85/mirotalksfu/issues/14#issuecomment-932701999).

---
