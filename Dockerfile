# Use a lightweight Node.js image https://hub.docker.com/_/node 
FROM node:22-alpine

# Set working directory
WORKDIR /src

ENV NODE_ENV="production"

# Install necessary system packages first
RUN apk add --no-cache bash vim

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --silent && \
    npm cache clean --force

# Rename config.template.js to config.js
COPY ./app/src/config.template.js ./app/src/config.js

# Copy the application code
COPY app app
COPY public public

# Clean up temporary files
RUN rm -rf /tmp/* /var/tmp/* /usr/share/doc/*

# Set default command to start the application
CMD ["npm", "start"]