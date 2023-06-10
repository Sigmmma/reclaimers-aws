import { aws_apigateway as apigw, aws_certificatemanager as acm, Stack, StackProps, App} from "aws-cdk-lib";
import { InlineNodeLambda } from "../constructs/lambda";

/* Implements the discord.reclaimers.net redirect to the invite URL. This
 * stack implements the origin itself, but also requires a DNS entry from the
 * DnsStack.
 */
export class DiscordRedirectStack extends Stack {
  readonly apiGateway: apigw.RestApi;

  constructor(app: App, id: string, cert: acm.Certificate, stackProps: StackProps) {
    super(app, id, stackProps);

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
      domainName: {
        domainName: "discord.reclaimers.net",
        certificate: cert,
      },
      restApiName: "discord-redirect",
      handler: discordRedirectLambda.func
    });
  }
}
