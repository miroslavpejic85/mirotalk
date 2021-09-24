FROM node:14-alpine 
# https://hub.docker.com/_/node

WORKDIR /usr/src/app

RUN apk add --no-cache \
bash \
vim

COPY package*.json ./
COPY .env.template ./.env

RUN npm install

COPY . .

EXPOSE 3000

CMD [ "npm", "start" ]