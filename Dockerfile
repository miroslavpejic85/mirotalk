FROM node:12

WORKDIR /usr/src/app

COPY package*.json ./
COPY .env.template ./.env

RUN npm install

COPY . .

EXPOSE 3000

CMD [ "npm", "start" ]