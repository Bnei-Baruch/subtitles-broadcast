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
RUN npm install serve
RUN npm run build -- prod

# Set the command to run the application
CMD ["serve", "-s", "start"]
