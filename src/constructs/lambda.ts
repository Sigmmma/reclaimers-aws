import { Construct } from "constructs";
import { aws_lambda as lambda } from "aws-cdk-lib";

/* Abstraction over a Lambda for up to 4 KB of inline JS source code.
 * Use this for lightweight event processors and request handlers.
 */
export class InlineNodeLambda extends Construct {
  readonly func: lambda.Function;

  constructor(scope: Construct, id: string, src: string) {
    super(scope, id);
    this.func = new lambda.Function(this, "Function", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "index.handler",
      code: lambda.Code.fromInline(src)
    });
  }
}
