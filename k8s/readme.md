# Set the cluster to GKE
```shell
gcloud container clusters get-credentials cluster-1 --zone australia-southeast1-a --project rentify-277707
```

# Target a context (GKE or Minikube)

`kubectl config get-contexts`

`kubectl config use-context gke_rentify-277707_australia-southeast1-a_cluster-1`

`kubectl config use-context minikube`



# Push the apps
```
bin/run-k8s.sh
```
