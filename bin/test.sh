set -e

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

(cd ui && yarn install && yarn test)
(cd api && yarn install && yarn test)

(cd ui && yarn start | cat - &) > /dev/null 2>&1
wait_for_port 3000
(cd api && yarn startdev &) > /dev/null 2>&1
wait_for_port 9090
(cd e2e && yarn install && yarn test)

killItByPort 9090
killItByPort 3000
