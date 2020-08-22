import * as cdk from "@aws-cdk/core";
import * as cfo from "@aws-cdk/aws-cloudfront-origins";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as cf from "@aws-cdk/aws-cloudfront";
import {BasicBucket} from "../constructs/bucket";

export class WikiStack extends cdk.Stack {
  readonly cdn: cf.Distribution;

  constructor(app: cdk.App, id: string, cert: acm.Certificate) {
    super(app, id);

    //this S3 bucket stores the built version of the wiki
    const wikiBucket = new BasicBucket(this, "Bucket", {
      name: "reclaimers-wiki-files",
      public: true
    });

    //this CDN distro fronts our wiki bucket to add cache + TLS layer
    this.cdn = new cf.Distribution(this, "Cdn", {
      certificate: cert,
      //serve from NA+Europe (cheapest)
      priceClass: cf.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: new cfo.S3Origin(wikiBucket.bucket)
      }
    });
  }
}
