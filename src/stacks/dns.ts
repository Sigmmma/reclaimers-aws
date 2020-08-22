import * as cdk from "@aws-cdk/core";
import * as r53 from "@aws-cdk/aws-route53";
import * as r53t from "@aws-cdk/aws-route53-targets";
import * as cf from "@aws-cdk/aws-cloudfront";
import * as apigw from "@aws-cdk/aws-apigateway";

//SlowBullet's CE3/Reclaimers server
const GAMENIGHT_SERVER_IPV4 = "108.61.232.93";

export interface DnsStackProps {
  dnsZone: r53.PublicHostedZone;
  wikiCdn: cf.Distribution;
  discordRedirectApi: apigw.RestApi;
}

export class DnsStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, props: DnsStackProps) {
    super(app, id);

    const baseDnsProps = {
      zone: props.dnsZone,
      ttl: cdk.Duration.days(5),
    };

    //these DNS records allow @reclaimers.net email to work
    const fastmailMxRecordValues = [
      {priority: 10, hostName: "in1-smtp.messagingengine.com.",},
      {priority: 20, hostName: "in2-smtp.messagingengine.com."},
    ];
    new r53.MxRecord(this, "DnsFastmailMxA", {
      ...baseDnsProps,
      values: fastmailMxRecordValues,
      recordName: "reclaimers.net",
    });
    new r53.MxRecord(this, "DnsFastmailMxB", {
      ...baseDnsProps,
      values: fastmailMxRecordValues,
      recordName: "*.reclaimers.net",
    });
    [1, 2, 3].forEach(serverNum => {
      new r53.CnameRecord(this, `DnsFastmailCname${serverNum}`, {
        ...baseDnsProps,
        recordName: `fm${serverNum}._domainkey.reclaimers.net`,
        domainName: `fm${serverNum}.reclaimers.net.dkim.fmhosted.com`,
      });
    });
    new r53.TxtRecord(this, "DnsFastmailTxt", {
      ...baseDnsProps,
      recordName: "reclaimers.net",
      values: ["v=spf1 include:spf.messagingengine.com ?all"],
    });

    //DNS records for the wiki
    const dnsWikiProps = {
      ...baseDnsProps,
      recordName: "c20.reclaimers.net",
      target: r53.RecordTarget.fromAlias(new r53t.CloudFrontTarget(props.wikiCdn)),
    };
    new r53.ARecord(this, "DnsWikiIpv4", dnsWikiProps);
    new r53.AaaaRecord(this, "DnsWikiIpv6", dnsWikiProps);

    //DNS records for the main domain, currently pointing to the wiki
    const dnsMainProps = {
      ...baseDnsProps,
      recordName: "reclaimers.net",
      target: r53.RecordTarget.fromAlias(new r53t.CloudFrontTarget(props.wikiCdn)),
    };
    new r53.ARecord(this, "DnsMainIpv4", dnsMainProps);
    new r53.AaaaRecord(this, "DnsMainIpv6", dnsMainProps);

    //easy subdomain for gamenights
    new r53.ARecord(this, "DnsMainIpv4", {
      ...baseDnsProps,
      recordName: "play.reclaimers.net",
      target: r53.RecordTarget.fromIpAddresses(GAMENIGHT_SERVER_IPV4)
    });

    //easy subdomain for discord invites
    const discordRedirectProps = {
      ...baseDnsProps,
      recordName: "discord.reclaimers.net",
      target: r53.RecordTarget.fromAlias(new r53t.ApiGateway(props.discordRedirectApi)),
    };
    new r53.ARecord(this, "DnsMainIpv4", discordRedirectProps);
    new r53.AaaaRecord(this, "DnsMainIpv6", discordRedirectProps);
  }
}
