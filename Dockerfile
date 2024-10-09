ARG api_base_url="https://subs.kab.info/backend/api/v1/"
ARG keycloak_client_id="subtitles"
ARG keycloak_realm="main"
ARG keycloak_url="https://accounts.kab.info/auth"
ARG mqtt_path=""
ARG mqtt_port="443"
ARG mqtt_protocol="wss"
ARG mqtt_url="msg.kab.info"

ENV REACT_APP_ENV=production \
    REACT_APP_API_BASE_URL=${api_base_url} \
    REACT_APP_KEYCLOAK_CLIENT_ID=${keycloak_client_id} \
    REACT_APP_KEYCLOAK_REALM=${keycloak_realm} \
    REACT_APP_KEYCLOAK_URL=${keycloak_url} \
    REACT_APP_MQTT_PATH=${mqtt_path} \
    REACT_APP_MQTT_PORT=${mqtt_port} \
    REACT_APP_MQTT_PROTOCOL=${mqtt_protocol} \
    REACT_APP_MQTT_URL=${mqtt_url}

# Use an official Node runtime as the base image
FROM node:alpine

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
RUN npm run build -- prod

# Set the command to run the application
CMD ["serve", "-s", "build"]
