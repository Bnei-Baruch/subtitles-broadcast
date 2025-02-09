set -e 
set -x

ssh 135.125.213.39 <<EOF
set -e 
set -x
cd /root/configs/subtitles_backend 
sed -i 's/SUBTITLES_BACKEND_VERSION.*/SUBTITLES_BACKEND_VERSION=%dep.Subtitles_SubtitlesBackend_Docker.env.BUILD_NUMBER%/g' .env
docker pull bneibaruch/subtitles_backend:%dep.Subtitles_SubtitlesBackend_Docker.env.BUILD_NUMBER%


# Stop and remove the existing Docker container
docker stop subtitles_backend
docker rm subtitles_backend

# Clean up Docker resources
docker builder prune -af
docker image prune -a -f
docker volume prune -f

docker compose -f docker-compose.yml up -d
EOF