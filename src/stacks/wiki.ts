import * as cdk from "@aws-cdk/core";
import * as cfo from "@aws-cdk/aws-cloudfront-origins";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as iam from "@aws-cdk/aws-iam";
import * as cf from "@aws-cdk/aws-cloudfront";
import * as cb from "@aws-cdk/aws-codebuild";
import {BasicBucket} from "../constructs/bucket";

const CACHE_TTL_MINUTES = 120;

/* Implements the c20 wiki website, including its automated build from source.
 */
export class WikiStack extends cdk.Stack {
  readonly cdn: cf.Distribution;

  constructor(app: cdk.App, id: string, cert: acm.Certificate, stackProps: cdk.StackProps) {
    super(app, id, stackProps);

    //this S3 bucket stores the built version of the wiki
    const wikiBucket = new BasicBucket(this, "Bucket", {
      name: "reclaimers-wiki-files",
      public: true,
      errDoc: "404/index.html"
    });

    //cache for expensive build files (e.g. computationally, external bandwidth)
    const buildCache = new BasicBucket(this, "BuildCache", {
      name: "reclaimers-wiki-build-cache",
      public: false,
    });

    const build = new cb.Project(this, "Build", {
      projectName: "wiki-build",
      timeout: cdk.Duration.minutes(10),
      environment: {
        buildImage: cb.LinuxBuildImage.STANDARD_5_0,
        computeType: cb.ComputeType.SMALL,
      },
      description: "Automatically builds and deploys the wiki to S3",
      cache: cb.Cache.bucket(buildCache.bucket),
      source: cb.Source.gitHub({
        owner: "Sigmmma",
        repo: "c20",
        cloneDepth: 1,
        webhookFilters: [
          cb.FilterGroup.inEventOf(cb.EventAction.PUSH).andHeadRefIs("refs/heads/master"),
          cb.FilterGroup.inEventOf(cb.EventAction.PULL_REQUEST_MERGED).andHeadRefIs("refs/heads/master"),
        ],
      }),
      badge: true,
    });

    //the wiki build needs permission to sync build inputs and output to our S3 buckets
    wikiBucket.bucket.grantReadWrite(build);
    buildCache.bucket.grantReadWrite(build);
    //and it needs to be able to use PutBucketWebsite to write redirects
    build.role?.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: ["s3:PutBucketWebsite"],
      resources: [wikiBucket.bucket.bucketArn],
    }));

    //this CDN distro fronts our wiki bucket to add cache + TLS layer
    this.cdn = new cf.Distribution(this, "Cdn", {
      certificate: cert,
      //cloudfront will allow requests for these domains (CNAMES) in addition to its default
      domainNames: [
        "c20.reclaimers.net",
        "www.reclaimers.net",
        "test.reclaimers.net",
        "reclaimers.net",
      ],
      //serve from NA+Europe (cheapest)
      priceClass: cf.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        cachePolicy: new cf.CachePolicy(this, "Cache", {
          cachePolicyName: "c20-ttl-policy",
          defaultTtl: cdk.Duration.minutes(CACHE_TTL_MINUTES)
        }),
        viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        origin: new cfo.S3Origin(wikiBucket.bucket)
      }
    });
  }
}
