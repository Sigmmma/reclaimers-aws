import { aws_certificatemanager as acm, aws_cloudfront_origins as cfo, aws_cloudfront as cf, Stack, StackProps, App} from "aws-cdk-lib";
import { BasicBucket } from "../constructs/bucket";

/* This is a simple public bucket where we can manually upload files using the
 * web S3 console or AWS CLI tool. We can store anything we want to share
 * publicly here, though there is no directory listing functionality.
 */
export class FilesStack extends Stack {
  readonly cdn: cf.Distribution;

  constructor(app: App, id: string, cert: acm.Certificate, stackProps: StackProps) {
    super(app, id, stackProps);

    const filesBucket = new BasicBucket(this, "Bucket", {
      name: "reclaimers-public-files",
      public: true
    });

    this.cdn = new cf.Distribution(this, "Cdn", {
      certificate: cert,
      domainNames: [
        "files.reclaimers.net",
      ],
      priceClass: cf.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        origin: new cfo.S3Origin(filesBucket.bucket)
      }
    });
  }
}
