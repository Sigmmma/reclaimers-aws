# reclaimers.net AWS infrastructure
This [CDK project][cdk] implements the hosting infrastructure and resources necessary to run the [reclaimers.net](https://reclaimers.net) website and associated services.

## Initial account setup
This infrastructure is mainly account-agnostic and automatic, but assumes the AWS account has been prepared:

* An admin has already connected AWS to GitHub using OAuth via the CodeBuild project wizard -- this allows AWS to create webhooks in the necessary repos.
* The account owns the **reclaimers.net** domain.
* CDK will create a second Route 53 hosted zone for the reclaimers.net domain. Transfer the NS and SOA records from the original to the new one, then delete the original.

Account admins should avoid modifying resources directly in the AWS dashboard, aside from trivial temporary changes. Defining resources in this project is preferable because it makes the setup more repeatable, auditable, and clearly organized.

Non-trivial implementations and service code should generally stay outside this project -- e.g. this is not the place to write the backend code for an API. We prefer to keep such projects platform-agnostic and easy to develop locally, with CDK only used for any infrastructure which must be AWS-specific.

# Usage
Deployments happen from the developer's local system. You must be authenticated with the AWS account in order to deploy. This is done by setting some [environment variables][env]:

```sh
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=<replace me>
export AWS_SECRET_ACCESS_KEY=<replace me>
```

The values can be obtained from IAM in the AWS web console by creating a new user in the admin group with programmatic API access. The values should be kept secret. In order to actually develop and deploy changes, NPM is used to orchestrate actions:

```sh
# install dependencies first
npm ci

# make code changes, then verify diff before deploying
npm run diff
# deploy infrastructure changes
npm run deploy
```

[cdk]: https://docs.aws.amazon.com/cdk
[env]: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html
