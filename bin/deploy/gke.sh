set -e

(cd ui && yarn install && REACT_APP_BACKEND_URL="" yarn build)
(cd api && yarn install && yarn build)

./bin/build/ui-k8s.sh
./bin/build/api-k8s.sh

./bin/util/switch-cloud.sh
./bin/run/k8s-cloud.sh
