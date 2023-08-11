FROM node:18-alpine 
# https://hub.docker.com/_/node

WORKDIR /src

RUN apk add --no-cache \
	bash \
	vim

COPY package.json .
COPY .env.template ./.env

RUN \
    npm install && \
    npm cache clean --force && \
    rm -rf /tmp/* /var/lib/apt/lists/* /var/tmp/* /usr/share/doc/*

COPY app app
COPY public public

EXPOSE 3000/tcp

CMD npm start