killItByPort() {
    kill $(lsof -t -i:$1) > /dev/null 2>&1 || echo 0 > /dev/null 2>&1
}

function wait_for_port() {
    local PORT=$1
    while ! nc -z localhost $PORT &>/dev/null; do
        sleep 0.5;
        printf '.'
    done
}

killItByPort 3000
killItByPort 9090

./bin/build/api-local.sh
./bin/build/ui-local.sh

(cd ui && yarn start | cat - &) > /dev/null 2>&1
wait_for_port 3000
(cd api && yarn start &) > /dev/null 2>&1
wait_for_port 9090

echo "Started!"
