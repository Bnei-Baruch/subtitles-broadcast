# Subtitles Frontend

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

#

### Deploying the Subtitles Frontend Using Docker from Source Code

For production deployments, the project uses Docker with Nginx as the web server. Follow the steps below to build and run the container:

#### 1. Prerequisites

- Ensure Docker is installed on your system.
- Familiarity with Docker commands and basic concepts.

#### 2. Clone the Repository

```bash
git clone https://github.com/yourusername/subtitles-frontend.git
cd subtitles-frontend
```

#### 3. Build the Docker Image

Execute the following command to build the Docker image:

```bash
docker build -t subtitles-frontend:latest .
```

#### 4. Run the Docker Container

Start a container from the built image:

```bash
docker run -d -p 80:80 --name subtitles-frontend subtitles-frontend:latest
```

This command runs the container in detached mode, mapping port 80 of the container to port 80 of the host.

##### Example: Using a Different Port

To run the container on a different port, such as 3003, you can use:

```bash
docker run -d -p 3003:80 --name subtitles-frontend subtitles-frontend:latest
```

This maps port 3003 of the host to port 80 of the container. You can then access the application at `http://localhost:3003`.

#### 5. Access the Application

Open a web browser and navigate to `http://localhost` (or `http://localhost:<port>` if using a custom port) to view the deployed Subtitles Frontend application.

#### 6. Stopping and Removing the Container

To stop and remove the running container, use:

```bash
docker stop subtitles-frontend
docker rm subtitles-frontend
```

By following these steps, you can effectively deploy the Subtitles Frontend application using Docker from the source code, ensuring a consistent and portable deployment environment.

### Deploying the Subtitles Frontend Using Docker from Source Code

For production deployments, the project uses Docker with Nginx as the web server. Follow the steps below to build and run the container:
