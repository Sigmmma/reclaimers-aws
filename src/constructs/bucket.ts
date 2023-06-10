import { aws_s3 as s3 } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface BasicBucketProps {
  readonly name: string;
  readonly public?: boolean;
  readonly errDoc?: string;
}

/* This is an abstraction over and S3 bucket which requires less boilerplate
 * to create. Comes in either public or private types.
 */
export class BasicBucket extends Construct {
  readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: BasicBucketProps) {
    super(scope, id);
    this.bucket = new s3.Bucket(this, "Bucket", {
      bucketName: props.name,
      publicReadAccess: props.public,
      websiteIndexDocument: props.public ?
        "index.html" :
        undefined,
      websiteErrorDocument: props.errDoc ?
        props.errDoc :
        undefined,
      accessControl: props.public ?
        s3.BucketAccessControl.PUBLIC_READ :
        s3.BucketAccessControl.PRIVATE,
    });
  }
}
