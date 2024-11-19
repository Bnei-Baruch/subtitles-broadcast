# Use an official Node runtime as the base image
FROM node:lts-alpine

# Set the working directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json .
COPY package-lock.json .
RUN npm install

# Add app files
COPY . .

# Build the React app
RUN npm install -g serve

ENV REACT_APP_ENV=production
ENV REACT_APP_API_BASE_URL="https://subs.kab.info/backend/api/v1/"
ENV REACT_APP_KEYCLOAK_CLIENT_ID="subtitles"
ENV REACT_APP_KEYCLOAK_REALM="main"
ENV REACT_APP_KEYCLOAK_URL="https://accounts.kab.info/auth"
ENV REACT_APP_MQTT_PATH=""
ENV REACT_APP_MQTT_PORT="443"
ENV REACT_APP_MQTT_PROTOCOL="wss"
ENV REACT_APP_MQTT_URL="msg.kab.info"

RUN npm run build -- prod

# Set the command to run the application
CMD ["serve", "-s", "build"]

