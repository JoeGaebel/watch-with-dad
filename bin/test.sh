set -e

killItByPort() {
    kill $(lsof -t -i:$1) 2> /dev/null || echo 0 2> /dev/null
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

(cd ui && yarn start | cat - &)
wait_for_port 3000
(cd api && yarn startdev &)
wait_for_port 9090
(cd e2e && yarn install && yarn test)

killItByPort 9090
killItByPort 3000
