FROM node:16-alpine 
# https://hub.docker.com/_/node

WORKDIR /src

RUN apk add --no-cache \
	bash \
	vim

COPY package.json .
COPY .env.template ./.env

RUN npm install

COPY app app
COPY public public

EXPOSE 3000/tcp

CMD npm start