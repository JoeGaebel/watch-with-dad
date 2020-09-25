set -e

kubectl apply -f ./k8s/watch-with-dad-namespace.yml
kubectl config set-context --current --namespace=watch-with-dad
kubectl apply -f ./k8s -l type!=local

kubectl set env deploy/watch-with-dad-api DEPLOY_DATE="$(date)"
kubectl set env deploy/watch-with-dad-ui DEPLOY_DATE="$(date)"
