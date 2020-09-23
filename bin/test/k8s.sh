set -e

trap 'catch $? $LINENO' EXIT SIGINT

catch() {
  ./bin/util/kill-all-k8s.sh

  if [ "$1" != "0" ]; then
    echo -e "\n\n\033[0;31mFAILED! \033[0m"
    return
  fi

  echo -e "\n\n\033[0;32mPASSED! \033[0m"
}

killItByPort() {
    kill $(lsof -t -i:$1) > /dev/null 2>&1 || echo 0 > /dev/null 2>&1
}

function wait_for_port()
{
    local PORT=$1
    while ! nc -z localhost $PORT &>/dev/null; do
        sleep 0.5;
        printf '.'
    done
}

killItByPort 3000
killItByPort 9090

./bin/util/switch-local.sh
./bin/util/kill-all-k8s.sh

(cd ui && yarn install && REACT_APP_BACKEND_URL="" yarn build && yarn test)
(cd api && yarn install && yarn build && yarn test)

./bin/build/ui.sh
./bin/build/api.sh

./bin/run/k8s-local.sh
minikube tunnel -c 2>&1 > /dev/null &

bin/util/wait-until-pods-ready.sh 1000 1

(cd e2e && yarn install && yarn test)