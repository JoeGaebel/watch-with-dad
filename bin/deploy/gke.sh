set -e

(cd ui && yarn install && REACT_APP_BACKEND_URL="" yarn build)
(cd api && yarn install && yarn build)

./bin/build/ui.sh
./bin/build/api.sh

./bin/util/switch-cloud.sh
./bin/run/k8s-cloud.sh
