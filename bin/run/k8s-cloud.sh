set -e

kubectl apply -f ./k8s -l type!=local --record

./bin/run/force-restart.sh
