# MiroTalk P2P - Self Hosting

## Requirements

-   Recommended: [Hetzner](https://www.hetzner.com/cloud) (`CPX11` it's enough, OS: `Ubuntu 20.04 LTS / 22.04.1 LTS`).
-   Use [my personal link](https://hetzner.cloud/?ref=XdRifCzCK3bn) to receive `€⁠20 in cloud credits`.
-   [Node.js](https://nodejs.org/en/) at least 12x, better `16.15.1 LTS` & npm
-   Setup your own TURN server like [coturn](https://github.com/coturn/coturn) (recommended) or use third party STUN/TURN servers (configurable on `.env` file)
-   Your domain name, example: `your.domain.name`
    -   Set a DNS A record for that domain that point to Your Server public IPv4
        > DNS A Record: The Address Mapping record (or DNS host record) stores a hostname and its corresponding IPv4 address. When users search for your website, the A record redirects this traffic from the web address (xxxxx.com – human-readable domain) to the IPv4 address.

---

Install the requirements (Note: Many of the installation steps require `root` or `sudo` access)

```bash
# Install NodeJS 18.X and npm
$ sudo apt update
$ sudo apt -y install curl dirmngr apt-transport-https lsb-release ca-certificates
$ curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
$ sudo apt-get install -y nodejs
$ npm install -g npm@latest
```

---

## Quick start

```bash
# Clone MiroTalk P2P repo
$ git clone https://github.com/miroslavpejic85/mirotalk.git
# Go to mirotalk dir
$ cd mirotalk
# Copy .env.template to .env and edit it if needed
$ cp .env.template .env
# Install dependencies
$ npm install
# Start the server
$ npm start
```

Check if is correctly installed: https://your.domain.name:3000

---

## PM2

![pm2](../public/images/pm2.png)

Using [PM2](https://pm2.keymetrics.io) to run it as daemon

```bash
$ npm install -g pm2
$ pm2 start app/src/server.js
$ pm2 save
$ pm2 startup
```

---

## Docker

![docker](../public/images/docker.png)

If you want to use `Docker`

```bash
# Install docker and docker-compose
$ sudo apt install docker.io
$ sudo apt install docker-compose

# Copy .env.template to .env and edit it if needed
$ cp .env.template .env
# Copy docker-compose.template.yml in docker-compose.yml (edit it according to your needs)
$ cp docker-compose.template.yml docker-compose.yml
# Get official image from Docker Hub
$ docker pull mirotalk/p2p:latest
# Create and start containers
$ docker-compose up -d
```

Check if is correctly installed: https://your.domain.name:3000

---

## Nginx & Certbot

![nginx](../public/images/nginx.png)

In order to use it without the port number at the end, and to have encrypted communications, we going to install [nginx](https://www.nginx.com) and [certbot](https://certbot.eff.org)

```bash
# Install Nginx
$ sudo apt-get install nginx

# Install Certbot (SSL certificates) : https://certbot.eff.org
$ sudo apt install snapd
$ sudo snap install core; sudo snap refresh core
$ sudo snap install --classic certbot
$ sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Setup Nginx sites
$ sudo vim /etc/nginx/sites-enabled/default
```

Paste this:

```bash
# HTTP — redirect all traffic to HTTPS
server {
    if ($host = your.domain.name) {
        return 301 https://$host$request_uri;
    }
        listen 80;
        listen [::]:80  ;
    server_name your.domain.name;
    return 404;
}
```

```bash
# Check if all configured correctly
$ sudo nginx -t

# Active https for your domain name (follow the instruction)
$ sudo certbot certonly --nginx

# Add let's encrypt part on nginx config
$ sudo vim /etc/nginx/sites-enabled/default
```

Paste this:

```bash
# MiroTalk P2P - HTTPS — proxy all requests to the Node app
server {
	# Enable HTTP/2
	listen 443 ssl http2;
	listen [::]:443 ssl http2;
	server_name your.domain.name;

	# Use the Let’s Encrypt certificates
	ssl_certificate /etc/letsencrypt/live/your.domain.name/fullchain.pem;
	ssl_certificate_key /etc/letsencrypt/live/your.domain.name/privkey.pem;

	location / {
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header Host $host;
		proxy_pass http://localhost:3000/;
		proxy_http_version 1.1;
		proxy_set_header Upgrade $http_upgrade;
		proxy_set_header Connection "upgrade";
	}
}
```

```bash
# Check if all configured correctly
$ sudo nginx -t

# Restart nginx
$ service nginx restart
$ service nginx status

# Auto renew SSL certificate
$ sudo certbot renew --dry-run

# Show certificates
$ sudo certbot certificates
```

Check Your MiroTalk P2P instance: https://your.domain.name

---

## Update script

In order to have always Your MiroTalk P2P updated to latest, we going to create a script

```bash
cd
# Create a file p2pUpdate.sh
$ vim p2pUpdate.sh
```

---

If you use `PM2`, paste this:

```bash
#!/bin/bash

cd mirotalk
git pull
pm2 stop app/src/server.js
sudo npm install
pm2 start app/src/server.js
```

---

If you use `Docker`, paste this:

```bash
#!/bin/bash

cd mirotalk
git pull
docker-compose down
docker pull mirotalk/p2p:latest
docker images |grep '<none>' |awk '{print $3}' |xargs docker rmi
docker-compose up -d
```

---

Make the script executable

```bash
$ chmod +x p2pUpdate.sh
```

Follow the commits of the MiroTalk P2P project [here](https://github.com/miroslavpejic85/mirotalk/commits/master)

To update Your MiroTalk P2P instance at latest commit, execute:

```bash
./p2pUpdate.sh
```

---

## Support

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/mirotalk/mirotalk-free-secure-video-calls-chat-screen-sharing)
