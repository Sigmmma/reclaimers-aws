# reclaimers.net AWS infrastructure
This [CDK project][cdk] implements the hosting infrastructure and resources necessary to run the [reclaimers.net](https://reclaimers.net) website and associated services.

Account admins should avoid modifying resources directly in the AWS dashboard, aside from trivial temporary changes. Defining resources in this project is preferable because it makes the setup more repeatable, auditable, and clearly organized.

Non-trivial implementations and service code should generally stay outside this project -- e.g. this is not the place to write the backend code for an API. We prefer to keep such projects platform-agnostic and easy to develop locally, with CDK only used for any infrastructure which must be AWS-specific.

## Initial account setup
This project fully automates infrastructure updates during normal usage, but assumes the AWS account has been prepared in a few ways:

* An admin has already connected AWS to GitHub using OAuth via the CodeBuild project wizard -- this allows AWS to create webhooks in the necessary repos.
* The account owns the **reclaimers.net** domain.
* While AWS creates a default hosted zone for the owned domain, CDK will create a second one with all the required DNS records for the reclaimers.net domain. Obtain the nameservers from this new zone's details section and update the registered domain's nameservers to match. Delete the unused default hosted zone once the confirmation email is received.
* Budgeting notifications are set up manually in billing services, as this area seems buggy/poorly supported by AWS' automation.

## Usage
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
