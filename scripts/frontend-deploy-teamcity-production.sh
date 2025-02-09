#!/bin/bash

# Define the staging server and SSH options
STAGING_SERVER="root@135.125.213.39"
SSH_OPTIONS="-o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no"

# Required environment variables
REQUIRED_VARS=(
    REACT_APP_KEYCLOAK_CLIENT_ID
    REACT_APP_KEYCLOAK_REALM
    REACT_APP_KEYCLOAK_URL
    REACT_APP_API_BASE_URL
    REACT_APP_MQTT_URL
    REACT_APP_MQTT_PORT
    REACT_APP_MQTT_PATH
    REACT_APP_MQTT_PROTOCOL
)

# SSH into the staging server and execute commands
ssh ${SSH_OPTIONS} ${STAGING_SERVER} <<EOF
    set -e
    set -x

    # Print current user and check required directories
    echo "Current User: \$(whoami)"
    echo "Checking /root/configs/subtitles_frontend path:"
    ls -al /root/configs

    # Navigate to the build context directory
    cd /root/configs/subtitles_frontend || { echo "Directory /root/configs/subtitles_frontend does not exist. Exiting."; exit 1; }

    # Stop and remove the existing Docker container
    docker stop subtitles_frontend || true
    docker rm subtitles_frontend || true

    # Clean up Docker resources
    docker builder prune -af
    docker image prune -a -f
    docker volume prune -f

    # Remove and recreate the 'src' directory
    if [ -d "src" ]; then
        echo "Removing existing 'src' directory..."
        rm -rf src
    fi
    echo "Creating 'src' directory..."
    mkdir src

    # Clone the repository into 'src' directory
    echo "Cloning the repository into 'src'..."
    git clone --branch %teamcity.build.branch% git@github.com:Bnei-Baruch/subtitles-frontend.git src

    # Copy .env and docker-compose.yml into the 'src' directory
    echo "Copying configuration files to 'src'..."
    cp .env docker-compose.yml src/

    # Navigate into the 'src' directory for further processing
    cd src || { echo "Directory 'src' does not exist. Exiting."; exit 1; }

    # Validate that the Dockerfile exists
    if [ ! -f "Dockerfile" ]; then
        echo "Error: Dockerfile not found in 'src' directory. Exiting."
        exit 1
    fi

    # Replace placeholders with TeamCity parameters in the '.env' file
    echo "Updating .env with TeamCity parameters..."
	sed -i 's|SUBTITLES_FRONTEND_VERSION=.*|SUBTITLES_FRONTEND_VERSION=%env.SUBTITLES_FRONTEND_VERSION%|g' .env
	sed -i 's|SUBTITLES_BACKEND_URL=.*|SUBTITLES_BACKEND_URL=%env.SUBTITLES_BACKEND_URL%|g' .env
	sed -i 's|REACT_APP_API_BASE_URL=.*|REACT_APP_API_BASE_URL=%env.REACT_APP_API_BASE_URL%|g' .env
	sed -i 's|REACT_APP_MQTT_URL=.*|REACT_APP_MQTT_URL=%env.REACT_APP_MQTT_URL%|g' .env
	sed -i 's|REACT_APP_MQTT_PROTOCOL=.*|REACT_APP_MQTT_PROTOCOL=%env.REACT_APP_MQTT_PROTOCOL%|g' .env
	sed -i 's|REACT_APP_MQTT_PATH=.*|REACT_APP_MQTT_PATH=%env.REACT_APP_MQTT_PATH%|g' .env
	sed -i 's|REACT_APP_MQTT_PORT=.*|REACT_APP_MQTT_PORT=%env.REACT_APP_MQTT_PORT%|g' .env
	sed -i 's|REACT_APP_KEYCLOAK_URL=.*|REACT_APP_KEYCLOAK_URL=%env.REACT_APP_KEYCLOAK_URL%|g' .env
	sed -i 's|REACT_APP_KEYCLOAK_REALM=.*|REACT_APP_KEYCLOAK_REALM=%env.REACT_APP_KEYCLOAK_REALM%|g' .env
	sed -i 's|REACT_APP_KEYCLOAK_CLIENT_ID=.*|REACT_APP_KEYCLOAK_CLIENT_ID=%env.REACT_APP_KEYCLOAK_CLIENT_ID%|g' .env
	sed -i 's|REACT_APP_PORT=.*|REACT_APP_PORT=%env.REACT_APP_PORT%|g' .env

    echo "Contents of .env after modification:"
    cat .env

    # Validate environment variables
    echo "Validating environment variables..."
    for VAR in "\${REQUIRED_VARS[@]}"; do
        VALUE=\$(printenv "\$VAR")
        if [ -z "\$VALUE" ]; then
            echo "Error: Missing required environment variable: \$VAR"
            exit 1
        fi
    done

    # Ensure Docker is installed and running
    if ! docker info > /dev/null 2>&1; then
        echo "Docker is not running or accessible. Please check Docker setup."
        exit 1
    fi

    # Check and create the 'subtitles-network' if it doesn't exist
    #if ! docker network ls | grep -q subtitles-network; then
    #    echo "Creating subtitles-network..."
    #    docker network create subtitles-network
    #else
    #    echo "subtitles-network already exists."
    #fi

    # Build the Docker image from the 'src' directory
    echo "Building Docker image..."
    docker build --progress=plain \
        --build-arg REACT_APP_KEYCLOAK_CLIENT_ID="\${REACT_APP_KEYCLOAK_CLIENT_ID}" \
        --build-arg REACT_APP_KEYCLOAK_REALM="\${REACT_APP_KEYCLOAK_REALM}" \
        --build-arg REACT_APP_KEYCLOAK_URL="\${REACT_APP_KEYCLOAK_URL}" \
        --build-arg REACT_APP_API_BASE_URL="\${REACT_APP_API_BASE_URL}" \
        --build-arg REACT_APP_MQTT_URL="\${REACT_APP_MQTT_URL}" \
        --build-arg REACT_APP_MQTT_PORT="\${REACT_APP_MQTT_PORT}" \
        --build-arg REACT_APP_MQTT_PATH="\${REACT_APP_MQTT_PATH}" \
        --build-arg REACT_APP_MQTT_PROTOCOL="\${REACT_APP_MQTT_PROTOCOL}" \
        -t subtitles_frontend:"\${BUILD_NUMBER:-latest}" .
    
    # Stop and remove conflicting containers
    docker ps -q --filter "name=subtitles_frontend_staging" | xargs -r docker rm -f

    # Clean up unused Docker networks
    # docker network prune -f

    # Run the container with docker-compose
    echo "Starting Subtitles Frontend Container..."
    docker compose --env-file .env -f docker-compose.yml up -d

    # Clean up old Docker images to save space
    docker image prune -f

    # Verify running containers
    echo "Current running containers:"
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

    echo "Deployment completed successfully."
EOF