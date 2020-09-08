set -e

git remote add watch-with-dad-api https://git.heroku.com/watch-with-dad-api.git > /dev/null 2>&1 || echo 0 > /dev/null 2>&1
git remote add watch-with-dad-ui https://git.heroku.com/watch-with-dad-ui.git > /dev/null 2>&1 || echo 0 > /dev/null 2>&1

heroku buildpacks:add -a watch-with-dad-api https://github.com/lstoll/heroku-buildpack-monorepo -i 1 > /dev/null 2>&1 || echo 0 > /dev/null 2>&1
heroku buildpacks:add -a watch-with-dad-ui https://github.com/lstoll/heroku-buildpack-monorepo -i 1 > /dev/null 2>&1 || echo 0 > /dev/null 2>&1
heroku buildpacks:add -a watch-with-dad-ui mars/create-react-app -i 2 > /dev/null 2>&1 || echo 0 > /dev/null 2>&1

# Need to also add APP_BASE=ui and APP_BASE=api to the environment variables in heroku



### UI
heroku config:set --app watch-with-dad-ui REACT_APP_BACKEND_URL="wss://watch-with-dad-api.herokuapp.com/"
git push watch-with-dad-ui master

## API
git push watch-with-dad-api master



