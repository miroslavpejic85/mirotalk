## Expose MiroTalk on HTTPS

![mirotalk-https](https.png)

1. Generate a `self-signed certificate`

```bash
# install openssl 4 ubuntu
apt install openssl
# install openssl 4 mac
brew install openssl

# self-signed certificate
openssl genrsa -out key.pem
openssl req -new -key key.pem -out csr.pem
openssl x509 -req -days 9999 -in csr.pem -signkey key.pem -out cert.pem
rm csr.pem

# https://www.sslchecker.com/certdecoder
```

2. Expose `server.js` on `https`

```js
const https = require('https');
const fs = require('fs');
const options = {
    key: fs.readFileSync(path.join(__dirname, '/ssl/key.pem'), 'utf-8'),
    cert: fs.readFileSync(path.join(__dirname, '/ssl/cert.pem'), 'utf-8'),
};
const server = https.createServer(options, app);
const { Server } = require('socket.io');
const io = new Server().listen(server);
const localHost = 'https://' + 'localhost' + ':' + port;
```

3. Change on `client.js`

```js
function getSignalingServer() {
    return 'https://' + 'localhost' + ':' + signalingServerPort;
}
```
