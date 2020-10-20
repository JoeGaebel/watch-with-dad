set -e

(cd api && yarn install && yarn build && yarn test)

