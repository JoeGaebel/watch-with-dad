set -e

kubectl apply -f ./k8s -l type!=cloud --record

./bin/run/force-restart.sh
