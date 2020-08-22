import * as cdk from "@aws-cdk/core";
import * as cfo from "@aws-cdk/aws-cloudfront-origins";
import * as cf from "@aws-cdk/aws-cloudfront";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as r53 from "@aws-cdk/aws-route53";
import * as apigw from "@aws-cdk/aws-apigateway";
import {BasicBucket} from "./constructs/bucket";
import {InlineNodeLambda} from "./constructs/lambda";
import {DnsStack} from "./stacks/dns";

export default class ReclaimersStack extends cdk.Stack {
  constructor(app: cdk.App, id: string) {
    super(app, id);

    const dnsZone = new r53.PublicHostedZone(this, "ReclaimersDns", {
      zoneName: "reclaimers.net",
      //adds CAA record telling clients to only expect Amazon-issued certs for this domain
      caaAmazon: true
    });

    //provisions the cert which we can use for any reclaimers.net domains
    const cert = new acm.Certificate(this, "ReclaimersCert", {
      domainName: "reclaimers.net",
      //on receiving our cert, clients verify the domain they requested is part of this signed set
      subjectAlternativeNames: ["reclaimers.net", "*.reclaimers.net"],
      //ACM requires us to verify that we own the domain -- easy since it's provisioned above
      validation: acm.CertificateValidation.fromDns(dnsZone)
    });

    //this S3 bucket stores the built version of the wiki
    const wikiBucket = new BasicBucket(this, "WikiBucket", {
      name: "reclaimers-wiki-files",
      public: true
    });

    //this CDN distro fronts our wiki bucket to add cache + TLS layer
    const wikiCdn = new cf.Distribution(this, "WikiCdn", {
      certificate: cert,
      //serve from NA+Europe (cheapest)
      priceClass: cf.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: new cfo.S3Origin(wikiBucket.bucket)
      }
    });

    const discordRedirect = new InlineNodeLambda(this, "DiscordRedirectLambda", `
      exports.handler = async (event) => {
        return {
          statusCode: 301,
          headers: {
            Location: "https://discord.gg/k6Q4JBp"
          }
        };
      };
    `);

    // DnsStack
    //
    // const apiGateway = new apigw.RestApi(this, "DiscordRedirectApi", {
    //
    // });
    //
    // setupDns(this, dnsZone, wikiCdn);
  }
}
