# fastify-plugin-example

Fastify plugin template.

## Triggering a Release

_Prerequisite: Update repository access for the shared [NPM_PUBLISH_TOKEN](https://github.com/organizations/autotelic/settings/secrets/actions/NPM_PUBLISH_TOKEN) secret._

Trigger the release workflow via a tag

  ```sh
  git checkout main && git pull
  npm version { minor | major | path }
  git push --follow-tags
  ```