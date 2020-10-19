(cd api && yarn install && yarn build && yarn test)

docker build -t jgaebel/api -f k8s/Dockerfile.api .
docker push jgaebel/api:latest
