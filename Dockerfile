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

# Copy the .env file containing all required environment variables
# Ensure the .env file defines variables like REACT_APP_KEYCLOAK_CLIENT_ID, REACT_APP_API_BASE_URL, etc.
COPY .env .env

# Build the React app
RUN npm install -g serve

RUN npm run build -- prod

# Set the command to run the application
CMD ["serve", "-s", "build"]

