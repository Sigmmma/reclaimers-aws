import * as cdk from "@aws-cdk/core";
import * as apigw from "@aws-cdk/aws-apigateway";
import * as acm from "@aws-cdk/aws-certificatemanager";
import {InlineNodeLambda} from "../constructs/lambda";

export class DiscordRedirectStack extends cdk.Stack {
  readonly apiGateway: apigw.RestApi;

  constructor(app: cdk.App, id: string, cert: acm.Certificate) {
    super(app, id);

    const discordRedirectLambda = new InlineNodeLambda(this, "Lambda", `
      exports.handler = async (event) => {
        return {
          statusCode: 301,
          headers: {
            Location: "https://discord.gg/k6Q4JBp"
          }
        };
      };
    `);

    this.apiGateway = new apigw.LambdaRestApi(this, "Api", {
      restApiName: "discord-redirect",
      handler: discordRedirectLambda.func
    });
  }
}
