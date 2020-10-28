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

./bin/run/local.sh

(cd e2e && yarn install && yarn test)
