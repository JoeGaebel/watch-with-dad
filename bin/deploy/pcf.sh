branch_name=$(git symbolic-ref -q HEAD)

if [ "$branch_name" != "refs/heads/master" ]
then
  echo "Can only deploy master, man."
  exit 0
fi

(cd ui && REACT_APP_BACKEND_URL="wss://watch-with-dad-api.cfapps.io:4443" yarn build)
(cd api && yarn build)

cf push -f manifest.yml
