# Mirotalk

🚀 `A free WebRTC browser-based video call, chat and screen sharing` 🚀

<br>

[//]: https://img.shields.io/badge/<LABEL>-<MESSAGE>-<COLOR>

[![Author](https://img.shields.io/badge/Author-miro-brightgreen.svg)](https://www.linkedin.com/in/miroslav-pejic-976a07101/)
![License: CC-NC](https://img.shields.io/badge/License-CCNC-blue.svg)
[![Donate](https://img.shields.io/badge/Donate-PayPal-brightgreen.svg)](https://paypal.me/MiroslavPejic?locale.x=it_IT)
[![Repo Link](https://img.shields.io/badge/Repo-Link-black.svg)](https://github.com/miroslavpejic85/mirotalk)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?)](https://github.com/prettier/prettier)
[![Gitter](https://badges.gitter.im/mirotalk/community.svg)](https://gitter.im/mirotalk/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
[![Discord](https://img.shields.io/badge/chat-discord-green)](https://discord.gg/c5AZn8yKbQ)

Powered by `WebRTC` using google Stun and [numb](http://numb.viagenie.ca/) Turn. `Mirotalk` provides video quality and latency not available with traditional technology.

Open the app in one of following **supported browser**

[//]: #![webrtc](www/images/webrtc.png)

[![Foo](www/images/browsers.png)](https://mirotalk.herokuapp.com/)

## https://mirotalk.herokuapp.com/

<br>

[![mirotalk](www/images/preview.png)](https://mirotalk.herokuapp.com/)

## Features

- Is `100% Free` and `Open Source`
- No download, plug-in or login required, entirely browser based
- Unlimited users, without time limitation
- Optimized Room Url Sharing (share it to your participants, wait them to join)
- WebCam Streaming (Front - Rear for mobile)
- Audio Streaming
- Screen Sharing to present documents, slides, and more...
- File Sharing, share any files to your participants in the room
- Select Audio Input - Output && Video source
- Recording your Screen, Audio and Video
- Chat with Emoji Picker & Private messages & Save the conversations
- Simple Whiteboard for the teachers
- Full Screen Mode on mouse click on the Video element
- Possibility to Change UI Themes
- Right click on the Video elements for more options
- Direct `peer-to-peer` connection ensures lowest latency thanks to `webrtc`

## Demo

- `Open` https://mirotalk.herokuapp.com/newcall `or` https://mirotalk.up.railway.app/newcall
- `Pick` your personal Room name and `Join To Room`
- `Allow` to use the camera and microphone
- `Share` the Room URL and `Wait` someone to join for video conference

## Room name

- You can also `join` directly to your room name by going to https://mirotalk.herokuapp.com/join/your-room-name-goes-here `or` https://mirotalk.up.railway.app/join/your-room-name-goes-here

## Quick start

- You will need to have [Node.js](https://nodejs.org/en/blog/release/v12.22.1/) installed, this project has been tested with Node version 12.X
- Clone this repo

```bash
git clone git@github.com:miroslavpejic85/mirotalk.git
cd mirotalk
```

## Setup Turn and Ngrok

- Copy .env.template to .env

```bash
cp .env.template .env
```

`Turn`

Not mandatory but recommended.

- Create an account on http://numb.viagenie.ca
- Get your Account USERNAME and PASSWORD
- Fill in your credentials in the `.env` file
- Set `TURN_ENABLED=true`, if you want enable the Turn Server.

`Ngrok`

Not mandatory at all, but useful for tests and debug.

- Get started for free https://ngrok.com/
- Fill in your authtoken in the `.env` file
- Set `NGROK_ENABLED=true`, if you want to expose the server using the https tunnel, starting it from your local PC.

## Install dependencies

```js
npm install
```

## Start the server

```js
npm start
```

- Open http://localhost:3000 in browser

---

If you want to use a client on another computer/network, make sure you publish your server on an `HTTPS` connection.
You can use a service like [ngrok](https://ngrok.com/) or deploy it on:

<br>

[![Deploy on Heroku](https://www.herokucdn.com/deploy/button.svg)](https://www.heroku.com/)

`demo` https://mirotalk.herokuapp.com/

![heroku-qr](www/images/mirotalk-heroku-qr.png)

<br>

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app)

`demo` https://mirotalk.up.railway.app/

![railway-qr](www/images/mirotalk-railway-qr.png)

---

## Credits

Many Thanks to:

- ianramzy (html template)
- vasanthv (webrtc)
- Sajad (chat)
- i-aryan (whiteboard)

From where I took inspiration for this project. ❤️

## Contributing

- Pull Requests are welcome! :slightly_smiling_face:
- Please run [prettier](https://prettier.io) on all of your PRs before submitting, this can be done with `prettier --write mirotalk/`
- For communication we use [gitter](https://gitter.im/) or [discord](https://discord.com/) chats which can be found here:

[![Gitter](https://badges.gitter.im/mirotalk/community.svg)](https://gitter.im/mirotalk/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge) [![Discord](https://img.shields.io/badge/chat-discord-green)](https://discord.gg/c5AZn8yKbQ)

---

<p align="center"> Made with ❤️ by <a href="https://www.linkedin.com/in/miroslav-pejic-976a07101/">Miroslav Pejic</a></p>
