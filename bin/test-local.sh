set -e

trap 'catch $? $LINENO' EXIT SIGINT

catch() {
  killItByPort 3000
  killItByPort 9090

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


(cd ui && yarn install && REACT_APP_BACKEND_URL="ws://localhost:9090" yarn build && yarn test)
(cd api && yarn install && yarn build && yarn test)

(cd ui && yarn start | cat - &) > /dev/null 2>&1
wait_for_port 3000
(cd api && yarn start &) > /dev/null 2>&1
wait_for_port 9090

(cd e2e && yarn install && yarn test)
