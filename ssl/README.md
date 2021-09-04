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
const isHttps = true;
```

3. Change on `client.js`

```js
const isHttps = true;

function getSignalingServer() {
    if (isHttps) {
        return 'https://' + 'localhost' + ':' + signalingServerPort;
        // outside of localhost change it with YOUR-SERVER-DOMAIN
    }
    ...
}
```
