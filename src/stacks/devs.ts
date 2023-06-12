import { aws_iam as iam, Stack, StackProps, App} from "aws-cdk-lib";

/* This is a simple public bucket where we can manually upload files using the
 * web S3 console or AWS CLI tool. We can store anything we want to share
 * publicly here, though there is no directory listing functionality.
 */
export class DevsStack extends Stack {
  readonly devs: iam.Group;

  constructor(app: App, id: string, stackProps: StackProps) {
    super(app, id, stackProps);

    this.devs = new iam.Group(this, "Developers", {
      groupName: "developers"
    });
  }
}
