FROM node:16-alpine 
# https://hub.docker.com/_/node

VOLUME /src
WORKDIR /src

RUN apk add --no-cache \
        bash \
        vim

COPY package.json .
COPY .env.template ./.env

COPY app app
COPY public public

EXPOSE 3000/tcp

CMD npm install && npm start
