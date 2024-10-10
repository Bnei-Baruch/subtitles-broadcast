ARG api_base_url="https://subs.kab.info/backend/api/v1/"
ARG keycloak_client_id="subtitles"
ARG keycloak_realm="main"
ARG keycloak_url="https://accounts.kab.info/auth"
ARG mqtt_path=""
ARG mqtt_port="443"
ARG mqtt_protocol="wss"
ARG mqtt_url="msg.kab.info"

# Use an official Node runtime as the base image
FROM node:alpine

# Set the working directory
WORKDIR /usr/src/app

ENV REACT_APP_ENV=production \
    REACT_APP_API_BASE_URL=${api_base_url} \
    REACT_APP_KEYCLOAK_CLIENT_ID=${keycloak_client_id} \
    REACT_APP_KEYCLOAK_REALM=${keycloak_realm} \
    REACT_APP_KEYCLOAK_URL=${keycloak_url} \
    REACT_APP_MQTT_PATH=${mqtt_path} \
    REACT_APP_MQTT_PORT=${mqtt_port} \
    REACT_APP_MQTT_PROTOCOL=${mqtt_protocol} \
    REACT_APP_MQTT_URL=${mqtt_url}

# Install app dependencies
COPY package.json .
COPY package-lock.json .
RUN npm install

# Add app files
COPY . .

ARG REACT_API_URL
ENV REACT_API_URL $REACT_API_URL
ARG REACT_APP_API_BASE_URL
ENV REACT_APP_API_BASE_URL $REACT_APP_API_BASE_URL
ARG REACT_APP_KEYCLOAK_CLIENT_ID
ENV REACT_APP_KEYCLOAK_CLIENT_ID $REACT_APP_KEYCLOAK_CLIENT_ID
ARG REACT_APP_KEYCLOAK_REALM
ENV REACT_APP_KEYCLOAK_REALM $REACT_APP_KEYCLOAK_REALM
ARG REACT_APP_KEYCLOAK_URL
ENV REACT_APP_KEYCLOAK_URL $REACT_APP_KEYCLOAK_URL
ARG REACT_APP_MQTT_PATH
ENV REACT_APP_MQTT_PATH $REACT_APP_MQTT_PATH
ARG REACT_APP_MQTT_PORT
ENV REACT_APP_MQTT_PORT $REACT_APP_MQTT_PORT
ARG REACT_APP_MQTT_PROTOCOL
ENV REACT_APP_MQTT_PROTOCOL $REACT_APP_MQTT_PROTOCOL
ARG REACT_APP_MQTT_URL
ENV REACT_APP_MQTT_URL $REACT_APP_MQTT_URL

# Build the React app
RUN npm install -g serve
RUN npm run build -- prod

# Set the command to run the application
CMD ["serve", "-s", "build"]
