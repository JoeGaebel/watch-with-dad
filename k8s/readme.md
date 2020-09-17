# This is a hap-hazard set of notes

# Set the cluster to GKE
```shell
gcloud container clusters get-credentials cluster-1 --zone australia-southeast1-a --project rentify-277707
```

# Target a context (GKE or Minikube)

`kubectl config get-contexts`

`kubectl config use-context gke_rentify-277707_australia-southeast1-a_cluster-1`

`kubectl config use-context minikube`

# Create a static ip
```
gcloud compute addresses create watch-with-dad-ip --region australia-southeast1
gcloud compute addresses list
```
Use that IP in the loadBalancerIP field of the UI service

# Push the apps
```
bin/run-k8s-local.sh
bin/run-k8s-cloud.sh
```
