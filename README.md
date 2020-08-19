# reclaimers.net AWS infrastructure
This [CDK project][cdk] implements the hosting infrastructure necessary to run the [reclaimers.net](https://reclaimers.net) website and associated services. This codebase is still a WIP, since the manually-created resources are being ported into

# Usage
This infrastructure is mainly account-agnostic, but assumes the account owns the **reclaimers.net** domain. To authenticate, some [environment variables][env] must be set:

```sh
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=<replace me>
export AWS_SECRET_ACCESS_KEY=<replace me>
```

The values can be obtained from the IAM console by creating a user and should be kept secret. In order to actually develop and deploy changes, NPM is used to orchestrate actions:

```sh
# install dependencies
npm ci

# make code changes, then verify diff before deploying
npm run diff
# deploy infrastructure
npm run deploy
```

[cdk]: https://docs.aws.amazon.com/cdk
[env]: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html
