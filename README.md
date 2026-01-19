<h1 align="center">MiroTalk P2P</h1>

<br />

<div align="center">

<a href="https://www.linkedin.com/in/miroslav-pejic-976a07101/">![Author](https://img.shields.io/badge/Author-Miroslav_Pejic-brightgreen.svg)</a>
<a href="https://choosealicense.com/licenses/agpl-3.0/">![License: AGPLv3](https://img.shields.io/badge/License-AGPLv3_Open_Surce-blue.svg)</a>
<a href="https://codecanyon.net/item/mirotalk-p2p-webrtc-realtime-video-conferences/38376661">![License: Regular](https://img.shields.io/badge/License-Regular_Private_Use-lightblue.svg)</a>
<a href="https://codecanyon.net/item/mirotalk-p2p-webrtc-realtime-video-conferences/38376661">![License: Extended](https://img.shields.io/badge/License-Extended_Commercial_Use-darkgreen.svg)</a>
<a href="https://discord.gg/rgGYfeYW3N">![Community](https://img.shields.io/badge/Community-forum-pink.svg)</a>

This project is proudly sponsored by

</div>

<h1 align=center>Recall.ai - API for meeting recording</h1>
<p align="center">
    <a href="https://www.recall.ai/?utm_source=github&utm_medium=sponsorship&utm_campaign=miroslavpejic85-mirotalk"><strong>Recall.ai</strong></a> – an API for recording Zoom, Google Meet, Microsoft Teams, and in-person meetings.
</p>

<hr />

<br />

<p align="center">
<strong>MiroTalk P2P</strong> - Free WebRTC, Simple, Secure, Fast Real-Time Video Conferences with support for up to 8k resolution and 60fps. It's compatible with all major browsers and platforms.
</p>

<hr/>

<p align="center">
    <strong><a href="https://p2p.mirotalk.com">Explore MiroTalk P2P</a></strong>
</p>

<hr />

<p align="center">
    <a href="https://p2p.mirotalk.com"><img src="public/images/mirotalk-header.gif"></a>
</p>

<hr />

<strong>
    <p align="center">
        Join our Community for questions, help, support, ideas, and discussions on <a href='https://discord.gg/rgGYfeYW3N'>Discord</a>
    </p>
</strong>

<hr />

<details>
<summary>Features</summary>

<br/>

- Is `100% Free` - `Open Source under (AGPLv3)` - `Self Hosted` and [PWA](https://en.wikipedia.org/wiki/Progressive_web_application)!
- No downloads, plugins, or logins required – completely browser-based.
- Unlimited conference rooms with no time limitations.
- Translated into 133 languages.
- Support for the OpenID Connect (OIDC) authentication layer.
- Host protection to prevent unauthorized access.
- User auth to prevent unauthorized access.
- Room password protection.
- JWT.io securely manages credentials for host configurations and user authentication, enhancing security and streamlining processes.
- Compatible with desktop and mobile devices.
- Optimized mobile room URL sharing.
- Webcam streaming with front and rear camera support for mobile devices.
- Crystal-clear audio streaming with speaking detection and volume indicators.
- Screen sharing for presentations.
- File sharing with drag-and-drop support.
- Choose your audio input, output, and video source.
- Supports video quality up to 8K and 60 FPS.
- Supports advance Video/Document Picture-in-Picture (PiP) offering a more streamlined and flexible viewing experience.
- Record your screen, audio, and video.
- Snapshot video frames and save them as PNG images.
- Chat with an Emoji Picker for expressing feelings, private messages, Markdown support, and conversation saving.
- ChatGPT (powered by OpenAI) for answering questions, providing information, and connecting users to relevant resources.
- Speech recognition for sending spoken messages.
- Push-to-talk functionality, similar to a walkie-talkie.
- Advanced collaborative whiteboard for teachers.
- Real-time sharing of YouTube embed videos, video files (MP4, WebM, OGG), and audio files (MP3).
- Full-screen mode with one-click video element zooming and pin/unpin.
- Customizable UI themes.
- Right-click options on video elements for additional controls.
- Direct peer-to-peer connections for low-latency communication through WebRTC.
- Supports [REST API](app/api/README.md) (Application Programming Interface).
- Integration with [Mattermost](https://mattermost.com/) for enhanced communication.
- Integration with [Slack](https://api.slack.com/apps/) for enhanced communication.
- Utilizes [Sentry](https://sentry.io/) for error reporting.
- And much more...

</details>

<details>
<summary>About</summary>

<br>

- [Presentation](https://www.canva.com/design/DAE693uLOIU/view)
- [Video Overview](https://www.youtube.com/watch?v=_IVn2aINYww)

</details>

<details>
<summary>Start videoconference</summary>

<br/>

1. `Open` [MiroTalk P2P](https://p2p.mirotalk.com/newcall) or [alternative link](https://mirotalk.up.railway.app/newcall).
2. `Choose` a room name and click **Join Room**.
3. `Grant` camera and microphone access.
4. `Share` the room URL and wait for participants to join the video conference.

</details>

<details>
<summary>Direct Join</summary>

<br/>

- You can `directly join a room` by using links like:
- https://p2p.mirotalk.com/join?room=test&name=mirotalk&avatar=0&audio=0&video=0&screen=0&chat=0&hide=0&notify=0
- https://mirotalk.up.railway.app/join?room=test&name=mirotalk&avatar=0&audio=0&video=0&screen=0&chat=0&hide=0&notify=0

    | Params | Type    | Description     |
    | ------ | ------- | --------------- |
    | room   | string  | Room Id         |
    | name   | string  | User name       |
    | avatar | Mixed   | User avatar     |
    | audio  | boolean | Audio stream    |
    | video  | boolean | Video stream    |
    | screen | boolean | Screen stream   |
    | chat.  | boolean | Chat            |
    | hide   | boolean | Hide myself     |
    | notify | boolean | Welcome message |
    | token  | string  | jwt token       |

> **Note**
>
> The `token` parameter are optional when either `HOST_PROTECTED` or `HOST_USER_AUTH` is set to `true` in the `.env` file. The valid list of users is defined in the `HOST_USERS` configuration.

</details>

<details>
<summary>Host Protection Configuration</summary>

<br/>

When [host protection](https://docs.mirotalk.com/mirotalk-p2p/host-protection/) or host user auth is enabled, the host/users must provide a valid username and password as specified in the `.env` file.

| Params           | Value                                                                            | Description                                                                            |
| ---------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `HOST_PROTECTED` | `true` if protection is enabled, `false` if not (default false)                  | Requires the host to provide a valid username and password during room initialization. |
| `HOST_USER_AUTH` | `true` if user authentication is required, `false` if not (default false).       | Determines whether host authentication is required.                                    |
| `HOST_USERS`     | JSON array with user objects: `{"username": "username", "password": "password"}` | List of valid host users with their credentials.                                       |

</details>

<details open>
<summary>Quick start</summary>

![nodejs](public/images/nodejs.png)

- Before running MiroTalk P2P, ensure you have `Node.js` [installed](https://nodejs.org/en/download).

```bash
# clone this repo
$ git clone https://github.com/miroslavpejic85/mirotalk.git
# go to mirotalk dir
$ cd mirotalk
# copy .env.template to .env (edit it according to your needs)
$ cp .env.template .env
# Copy app/src/config.template.js in app/src/config.js (edit it according to your needs)
$ cp app/src/config.template.js app/src/config.js
# install dependencies
$ npm install
# start the server
$ npm start
```

- Open [http://localhost:3000](http://localhost:3000) in your browser.

</details>

<details open>
<summary>Docker</summary>

<br/>

![docker](public/images/docker.png)

- Repository [docker hub](https://hub.docker.com/r/mirotalk/p2p)
- Install [docker engine](https://docs.docker.com/engine/install/) and [docker compose](https://docs.docker.com/compose/install/)

```bash
# clone this repo
$ git clone https://github.com/miroslavpejic85/mirotalk.git
# go to mirotalk dir
$ cd mirotalk
# copy .env.template to .env (edit it according to your needs)
$ cp .env.template .env
# Copy app/src/config.template.js in app/src/config.js (edit it according to your needs)
$ cp app/src/config.template.js app/src/config.js
# Copy docker-compose.template.yml in docker-compose.yml (edit it according to your needs)
$ cp docker-compose.template.yml docker-compose.yml
# Get official image from Docker Hub
$ docker pull mirotalk/p2p:latest
# create and start containers
$ docker-compose up # -d
# to stop and remove resources
$ docker-compose down
```

- Open [http://localhost:3000](http://localhost:3000) in your browser.

</details>

<details open>
<summary>Self-Hosting</summary>

</br>

![setup](/public/images/self-hosting.png)

## **Requirements**

- A `clean server` running **Ubuntu 22.04 or 24.04 LTS**
- **Root access** to the Server
- A **domain or subdomain** pointing to your server’s public IPv4

---

## Note

When **prompted**, simply **enter your domain or subdomain**. Then wait for the installation to complete.

```bash
# Install MiroTalk P2P
wget -qO p2p-install.sh https://docs.mirotalk.com/scripts/p2p/p2p-install.sh \
  && chmod +x p2p-install.sh \
  && ./p2p-install.sh
```

```bash
# Uninstall MiroTalk P2P
wget -qO p2p-uninstall.sh https://docs.mirotalk.com/scripts/p2p/p2p-uninstall.sh \
  && chmod +x p2p-uninstall.sh \
  && ./p2p-uninstall.sh
```

```bash
# Update MiroTalk P2P
wget -qO p2p-update.sh https://docs.mirotalk.com/scripts/p2p/p2p-update.sh \
  && chmod +x p2p-update.sh \
  && ./p2p-update.sh
```

</details>

<details open>
<summary>Embed a meeting</summary>

<br/>

![iframe](public/images/iframe.png)

To embed a meeting within `your service or app` using an iframe, you can use the following code:

```html
<iframe
    allow="camera; microphone; display-capture; fullscreen; clipboard-read; clipboard-write; web-share; autoplay"
    src="https://p2p.mirotalk.com/newcall"
    style="height: 100vh; width: 100vw; border: 0px;"
></iframe>
```

## WIdget

To quickly add a support [widget](https://codepen.io/Miroslav-Pejic/pen/Byowjvb) to your site, include the script in your `<head>` and place the widget `<div>` at the end of your `<body>`. Your support widget will be ready instantly!

```html
<!doctype html>
<html>
    <head>
        <script src="https://p2p.mirotalk.com/js/widget.js"></script>
    </head>
    <body>
        <div
            id="support-widget"
            data-mirotalk-auto
            data-domain="p2p.mirotalk.com"
            data-room="support-room"
            data-theme="dark"
            data-widget-type="support"
            data-widget-state="normal"
            data-position="bottom-right"
            data-check-online="false"
            data-expert-images="https://i.pravatar.cc/40?img=1,https://i.pravatar.cc/40?img=2,https://i.pravatar.cc/40?img=3"
            data-buttons="audio,video,screen,chat,join"
            data-heading="Need Help?"
            data-subheading="Get instant support from our expert team!"
            data-connect-text="connect in &lt; 5 seconds"
            data-online-text="We are online"
            data-offline-text="We are offline"
            data-powered-by="Powered by MiroTalk"
        ></div>
    </body>
</html>
```

**[Explore Integrations →](https://docs.mirotalk.com/mirotalk-p2p/integration/)**

</details>

<details>
<summary>Documentations</summary>

<br>

- `Ngrok/HTTPS:` You can start a video conference directly from your local PC and make it accessible from any device outside your network by following [these instructions](docs/ngrok.md), or expose it directly on [HTTPS](app/ssl/README.md).

- `Stun/Turn:` Install your own [Stun & Turn](https://docs.mirotalk.com/coturn/stun-turn/) by following [this instructions](./docs/coturn.md).

- `Self-hosting:` For `self-hosting MiroTalk P2P` on your own dedicated server, please refer to [this comprehensive guide](docs/self-hosting.md). It will provide you with all the necessary instructions to get your MiroTalk P2P instance up and running smoothly.

- `Rest API:` The [API documentation](https://docs.mirotalk.com/mirotalk-p2p/api/) uses [swagger](https://swagger.io/) at http://localhost:3000/api/v1/docs. Or check it out on [live](https://p2p.mirotalk.com/api/v1/docs).

### 1. Stats Endpoint (Get server statistics)

```bash
curl -X GET "http://localhost:3000/api/v1/stats" -H "authorization: mirotalkp2p_default_secret" -H "Content-Type: application/json"
curl -X GET "https://p2p.mirotalk.com/api/v1/stats" -H "authorization: mirotalkp2p_default_secret" -H "Content-Type: application/json"
curl -X GET "https://mirotalk.up.railway.app/api/v1/stats" -H "authorization: mirotalkp2p_default_secret" -H "Content-Type: application/json"
```

### 2. Meetings Endpoint (Get active meetings)

```bash
curl -X GET "http://localhost:3000/api/v1/meetings" -H "authorization: mirotalkp2p_default_secret" -H "Content-Type: application/json"
curl -X GET "https://p2p.mirotalk.com/api/v1/meetings" -H "authorization: mirotalkp2p_default_secret" -H "Content-Type: application/json"
curl -X GET "https://mirotalk.up.railway.app/api/v1/meetings" -H "authorization: mirotalkp2p_default_secret" -H "Content-Type: application/json"
```

### 3. Create Meeting

```bash
curl -X POST "http://localhost:3000/api/v1/meeting" -H "authorization: mirotalkp2p_default_secret" -H "Content-Type: application/json"
curl -X POST "https://p2p.mirotalk.com/api/v1/meeting" -H "authorization: mirotalkp2p_default_secret" -H "Content-Type: application/json"
curl -X POST "https://mirotalk.up.railway.app/api/v1/meeting" -H "authorization: mirotalkp2p_default_secret" -H "Content-Type: application/json"
```

### 4. Join Meeting (Basic)

```bash
curl -X POST "http://localhost:3000/api/v1/join" -H "authorization: mirotalkp2p_default_secret" -H "Content-Type: application/json" --data '{"room":"test","name":"mirotalk","avatar":false,"audio":true,"video":true,"screen":false,"chat":false,"hide":false,"notify":true}'
curl -X POST "https://p2p.mirotalk.com/api/v1/join" -H "authorization: mirotalkp2p_default_secret" -H "Content-Type: application/json" --data '{"room":"test","name":"mirotalk","avatar":false,"audio":true,"video":true,"screen":false,"chat":false,"hide":false,"notify":true}'
curl -X POST "https://mirotalk.up.railway.app/api/v1/join" -H "authorization: mirotalkp2p_default_secret" -H "Content-Type: application/json" --data '{"room":"test","name":"mirotalk","avatar":false,"audio":true,"video":true,"screen":false,"chat":false,"hide":false,"notify":true}'
```

### 5. Join Meeting with Token

```bash
curl -X POST "http://localhost:3000/api/v1/join" -H "authorization: mirotalkp2p_default_secret" -H "Content-Type: application/json" --data '{"room":"test","name":"mirotalk","audio":true,"video":true,"screen":false,"chat":false,"hide":false,"notify":true,"token":{"username":"username","password":"password","presenter":true,"expire":"1h"}}'
curl -X POST "https://p2p.mirotalk.com/api/v1/join" -H "authorization: mirotalkp2p_default_secret" -H "Content-Type: application/json" --data '{"room":"test","name":"mirotalk","audio":true,"video":true,"screen":false,"chat":false,"hide":false,"notify":true,"token":{"username":"username","password":"password","presenter":true,"expire":"1h"}}'
curl -X POST "https://mirotalk.up.railway.app/api/v1/join" -H "authorization: mirotalkp2p_default_secret" -H "Content-Type: application/json" --data '{"room":"test","name":"mirotalk","audio":true,"video":true,"screen":false,"chat":false,"hide":false,"notify":true,"token":{"username":"username","password":"password","presenter":true,"expire":"1h"}}'
```

### 6. Generate Token

```bash
curl -X POST "http://localhost:3000/api/v1/token" -H "authorization: mirotalkp2p_default_secret" -H "Content-Type: application/json" --data '{"username":"username","password":"password","presenter":true,"expire":"1h"}'
curl -X POST "https://p2p.mirotalk.com/api/v1/token" -H "authorization: mirotalkp2p_default_secret" -H "Content-Type: application/json" --data '{"username":"username","password":"password","presenter":true,"expire":"1h"}'
curl -X POST "https://mirotalk.up.railway.app/api/v1/token" -H "authorization: mirotalkp2p_default_secret" -H "Content-Type: application/json" --data '{"username":"username","password":"password","presenter":true,"expire":"1h"}'
```

These commands should now work correctly with the MiroTalk P2P

</details>

<details open>
<summary>Cloudron, Hetzner, Netcup, Hostinger & Contabo</summary>

<br/>

[![Cloudron](public/sponsors/CloudronLogo.png)](https://www.cloudron.io/)

MiroTalk integrates with [Cloudron](https://www.cloudron.io/), enabling easy, secure, and self-managed video conferencing for organizations. Cloudron automates deployment, updates, backups, and user management, letting teams focus on collaboration instead of server maintenance. Install MiroTalk in one click from the [Cloudron App Store](https://www.cloudron.io/store/index.html) and enjoy a reliable, enterprise-ready solution.

---

[![Hetzner](public/sponsors/Hetzner.png)](https://www.hetzner.com)

This application is running for `demonstration purposes` on [Hetzner](https://www.hetzner.com/), one of `the best` [cloud providers](https://www.hetzner.com/cloud) and [dedicated root servers](https://www.hetzner.com/dedicated-rootserver).

---

👉 Use [my personal link](https://hetzner.cloud/?ref=XdRifCzCK3bn) to receive `€⁠20 IN CLOUD CREDITS`.

---

[![Netcup](public/sponsors/Netcup.png)](https://www.netcup.com/en/?ref=309627)

Unlock `enterprise-grade performance` at a price you won’t believe.
Scalable, reliable, and built for businesses that demand more.

👉 [Power Meets Value with Netcup Root Server](https://www.netcup.com/en/?ref=309627)

---

[![Hostinger](public/advertisers/HostingerLogo.png)](https://hostinger.com/?REFERRALCODE=MIROTALK)

Fast, reliable hosting with 24/7 support and great performance. Start today!

👉 [Check out Hostinger now](https://hostinger.com/?REFERRALCODE=MIROTALK)

---

[![Contabo](public/advertisers/ContaboLogo.png)](https://www.dpbolvw.net/click-101027391-14462707)

Experience also top-tier German web hosting – dedicated servers, VPS, and web hosting at `unbeatable prices`.

👉 [Explore now here](https://www.dpbolvw.net/click-101027391-14462707)

---

To set up your own instance of `MiroTalk P2P` on a dedicated cloud server, please refer to our comprehensive [self-hosting documentation](https://docs.mirotalk.com/mirotalk-p2p/self-hosting/). This guide will walk you through the process step by step, ensuring a smooth and successful deployment.

</details>

<details>
<summary>Live Demos</summary>

<br/>

<a target="_blank" href="https://p2p.mirotalk.com"><img src="public/sponsors/Hetzner.png" style="width: 220px;"></a>

https://p2p.mirotalk.com

[![hetzner-qr](public/images/mirotalk-hetzner-qr.png)](https://p2p.mirotalk.com)

<br>

<a target="_blank" href="https://railway.app/new/template/mirotalk?referralCode=mirotalk"><img src="https://railway.app/button.svg" style="width: 220px;"></a>

https://mirotalk.up.railway.app

[![railway-qr](public/images/mirotalk-railway-qr.png)](https://mirotalk.up.railway.app)

</details>

<details>
<summary>Security</summary>

<br/>

For `Security` concerning, please follow [this documentation](./SECURITY.md).

</details>

<details>
<summary>Credits</summary>

<br/>

- ianramzy (html [template](https://cruip.com/demos/neon/))
- vasanthv (webrtc-logic)
- fabric.js (whiteboard)

</details>

<details>
<summary>Contributing</summary>

<br/>

- Contributions are welcome and greatly appreciated!
- Just run before `npm run lint`

</details>

<details>
<summary>License</summary>

<br/>

[![AGPLv3](public/images/AGPLv3.png)](LICENSE)

MiroTalk P2P is free and open-source under the terms of AGPLv3 (GNU Affero General Public License v3.0). Please `respect the license conditions`, In particular `modifications need to be free as well and made available to the public`. Get a quick overview of the license at [Choose an open source license](https://choosealicense.com/licenses/agpl-3.0/).

To obtain a [MiroTalk P2P license](https://docs.mirotalk.com/license/licensing-options/) with terms different from the AGPLv3, you can conveniently make your [purchase on CodeCanyon](https://codecanyon.net/item/mirotalk-p2p-webrtc-realtime-video-conferences/38376661). This allows you to tailor the licensing conditions to better suit your specific requirements.

</details>

<details open>
<summary>Support the project</summary>

<br/>

Do you find MiroTalk P2P indispensable for your needs? Join us in supporting this transformative project by [becoming a backer or sponsor](https://github.com/sponsors/miroslavpejic85). By doing so, not only will your logo prominently feature here, but you'll also drive the growth and sustainability of MiroTalk P2P. Your support is vital in ensuring that this valuable platform continues to thrive and remain accessible for all. Make an impact – back MiroTalk P2P today and be part of this exciting journey!

|                                                                                   |                                                                                        |                                                                                |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [![EffectsSDK](public/sponsors/EffectsSDK.png)](https://effectssdk.ai/)           | [![Hetzner](public/sponsors/HetznerLogo.png)](https://hetzner.cloud/?ref=XdRifCzCK3bn) | [![Netcup](public/sponsors/Netcup.png)](https://www.netcup.com/en/?ref=309627) |
| [![BroadcastX](public/sponsors/BroadcastX.png)](https://broadcastx.de/)           | [![LuvLounge](public/sponsors/LuvLounge.png)](https://luvlounge.ca)                    | [![QuestionPro](public/sponsors/QuestionPro.png)](https://www.questionpro.com) |
| [![BrowserStack](public/sponsors/BrowserStack.png)](https://www.browserstack.com) | [![CrystalSound](public/sponsors/CrystalSound.png)](https://crystalsound.ai)           | [![Cloudron](public/sponsors/Cloudron.png)](https://cloudron.io)               |
| [![Kiquix](public/sponsors/KiquixLogo.png)](https://kiquix.com)                   | [![TestMuAI](public/sponsors/TestMuAIBlack.svg)](https://www.testmu.ai/)               |                                                                                |

</details>

<details open>
<summary>Advertisers</summary>

---

|                                                                                                |                                                                                                |                                                                                 |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [![Hostinger](public/advertisers/Hostinger.png)](https://hostinger.com/?REFERRALCODE=MIROTALK) | [![Contabo](public/advertisers/Contabo.png)](https://www.dpbolvw.net/click-101027391-14462707) | [![Rambox](public/advertisers/RamboxLogo.png)](https://rambox.app?via=mirotalk) |

---

</details>

## EffectsSDK ✨

[![EffectsSDK](public/sponsors/EffectsSDK.png)](https://effectssdk.ai/)

`Enhance your video conferencing` experience with `advanced virtual backgrounds` and `noise suppression`. EffectsSDK offers powerful SDKs and plugins for fast integration.

**Explore:**

- 🎥 **[AI Video Effects Extension](https://chromewebstore.google.com/detail/effetti-webcam-ai-+-regis/iedbphhbpflhgpihkcceocomcdnemcbj)** – Add virtual backgrounds and effects to your webcam.
- 🔊 **[Noise Cancelling Extension](https://chromewebstore.google.com/detail/noise-cancelling-app/njmhcidcdbaannpafjdljminaigdgolj)** – Reduce background noise for clearer audio.
- 🛠️ **[Integrate EffectsSDK](https://github.com/EffectsSDK)** – Access SDKs and plugins for custom solutions.

---

## Diving into Additional MiroTalk Projects:

<details>
<summary>MiroTalk SFU</summary>

<br>

Try also [MiroTalk SFU](https://github.com/miroslavpejic85/mirotalksfu) `selective forwarding unit` real-time video conferences, optimized for large groups. `Unlimited time, unlimited concurrent rooms` each having 8+ participants, up to ~ 100 per single CPU.

</details>

<details>
<summary>MiroTalk C2C</summary>

<br>

Try also [MiroTalk C2C](https://github.com/miroslavpejic85/mirotalkc2c) `peer to peer` real-time video conferences, optimized for cam 2 cam. `Unlimited time, unlimited concurrent rooms` each having 2 participants.

</details>

<details>
<summary>MiroTalk BRO</summary>

<br>

Try also [MiroTalk BRO](https://github.com/miroslavpejic85/mirotalkbro) `Live broadcast` (peer to peer) live video, audio and screen stream to all connected users (viewers). `Unlimited time, unlimited concurrent rooms` each having a broadcast and many viewers.

</details>

<details>
<summary>MiroTalk WEB</summary>

<br>

Try also [MiroTalk WEB](https://github.com/miroslavpejic85/mirotalkwebrtc) a platform that allows for the management of an `unlimited number of users`. Each user must register with their email, username, and password, after which they gain access to their `personal dashboard`. Within the dashboard, users can `manage their rooms and schedule meetings` using the desired version of MiroTalk on a specified date and time. Invitations to these meetings can be sent via email, shared through the web browser, or sent via SMS.

</details>

---

This project is tested with [BrowserStack](https://www.browserstack.com).

---

![Star History Chart](https://app.repohistory.com/api/svg?repo=miroslavpejic85/mirotalk&type=Date&background=0D1117&color=62C3F8)

---

<p align="center">
  Built with ❤️ by <a href="https://www.linkedin.com/in/miroslav-pejic-976a07101/">Miroslav</a> and the open-source community
</p>
