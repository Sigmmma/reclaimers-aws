import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";

//supports up to 4 KB of source code inline
export class InlineNodeLambda extends cdk.Construct {
  readonly func: lambda.Function;

  constructor(scope: cdk.Construct, id: string, src: string) {
    super(scope, id);
    this.func = new lambda.Function(this, "Function", {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: "index.handler",
      code: lambda.Code.fromInline(src)
    });
  }
}
