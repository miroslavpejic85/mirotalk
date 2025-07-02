# Use a stable Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /src

ENV NODE_ENV="production"

# Install necessary system packages
RUN apk add --no-cache bash vim

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev --silent && \
    npm cache clean --force

# Copy .env template
COPY .env.template ./.env

# Rename config.template.js to config.js
COPY ./app/src/config.template.js ./app/src/config.js

# Copy the application code
COPY app app
COPY public public

# Clean up
RUN rm -rf /tmp/* /var/tmp/* /usr/share/doc/*

# Set default command to start the application
CMD ["npm", "start"]