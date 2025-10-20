#!/bin/bash

# GitHub Actions Frontend Deployment Script
# This script deploys the frontend using pre-built Docker images

# Define the production server and SSH options
PRODUCTION_SERVER="root@10.77.1.16"  # Update this with your actual production server
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
    SUBTITLES_BACKEND_URL
    SUBTITLES_FRONTEND_PORT
    REACT_APP_PORT
)

# SSH into the production server and execute commands
ssh ${SSH_OPTIONS} ${PRODUCTION_SERVER} <<EOF
    set -e
    set -x

    # Print current user and check required directories
    echo "Current User: \$(whoami)"
    echo "Checking /root/configs/subtitles_frontend path:"
    ls -al /root/configs

    # Navigate to the config directory
    cd /root/configs/subtitles_frontend || { echo "Directory /root/configs/subtitles_frontend does not exist. Exiting."; exit 1; }

    # Stop and remove the existing Docker container
    echo "Stopping existing container..."
    docker stop subtitles_frontend || true
    docker rm subtitles_frontend || true

    # Clean up Docker resources
    echo "Cleaning up Docker resources..."
    docker builder prune -af
    docker image prune -a -f
    docker volume prune -f

    # Update .env file with current version
    echo "Updating .env with version gh_\${BUILD_NUMBER:-latest}..."
    sed -i "s/SUBTITLES_VERSION.*/SUBTITLES_VERSION=gh_\${BUILD_NUMBER:-latest}/g" .env

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
    if ! docker network ls | grep -q subtitles-network; then
        echo "Creating subtitles-network..."
        docker network create subtitles-network
    else
        echo "subtitles-network already exists."
    fi

    # Pull the latest Docker image
    echo "Pulling latest Docker image..."
    docker compose -f docker-compose.prod.yml pull subtitles_frontend

    # Run the container with docker-compose
    echo "Starting Subtitles Frontend Container..."
    docker compose -f docker-compose.prod.yml --env-file .env up -d

    # Clean up old Docker images to save space
    docker image prune -f

    # Verify running containers
    echo "Current running containers:"
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

    echo "Deployment completed successfully."
EOF
