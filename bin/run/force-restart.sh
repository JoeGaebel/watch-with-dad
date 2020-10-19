set -e

function podIsRunning() {
  [[ "$(kubectl get pods -l app="$1" -o 'jsonpath={.items[0].status.conditions[?(@.type=="Ready")].status}')" == 'True' ]]
}

if podIsRunning watch-with-dad-ui && podIsRunning watch-with-dad-api; then
  echo "Setting Env vars to repull images"
  kubectl set env deploy/watch-with-dad-api DEPLOY_DATE="$(date)"
  kubectl set env deploy/watch-with-dad-ui DEPLOY_DATE="$(date)"
fi

