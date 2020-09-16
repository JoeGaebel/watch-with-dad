set -e

kubectl apply -f ./k8s/watch-with-dad-namespace.yml
kubectl config set-context --current --namespace=watch-with-dad
kubectl apply -f ./k8s

bin/wait-until-pods-ready.sh 1000 1
sleep 0.2

kubectl port-forward \
  --address 0.0.0.0 \
  deployment/watch-with-dad-api \
  9090:9090 \
   --pod-running-timeout=10s \
  > /dev/null &

kubectl port-forward \
  --address 0.0.0.0 \
  deployment/watch-with-dad-ui \
  3000:80 \
  --pod-running-timeout=10s \
  > /dev/null &
