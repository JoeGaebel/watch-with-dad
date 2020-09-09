cd ui
REACT_APP_BACKEND_URL="wss://watch-with-dad-api.cfapps.io:4443" yarn build

cd ../api
yarn build

cd ..

cf push -f manifest.yml
