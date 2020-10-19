(cd ui && yarn install && REACT_APP_BACKEND_URL="" yarn build && yarn test)

docker build -t jgaebel/ui -f k8s/Dockerfile.ui .
docker push jgaebel/ui:latest
