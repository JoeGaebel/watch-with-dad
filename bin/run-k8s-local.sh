set -e

kubectl apply -f ./k8s/watch-with-dad-namespace.yml
kubectl config set-context --current --namespace=watch-with-dad
kubectl apply -f ./k8s -l type!=cloud

