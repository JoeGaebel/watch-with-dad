set -e

trap 'catch $? $LINENO' EXIT

catch() {
  ./bin/kill-all-k8s.sh

  killItByPort 9090
  killItByPort 3000

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

killItByPort 9090
killItByPort 3000

(cd ui && yarn build && yarn install && yarn test)
(cd api && yarn build && yarn install && yarn test)

./bin/run-k8s.sh

wait_for_port 9090
wait_for_port 3000

(cd e2e && yarn install && yarn test)
