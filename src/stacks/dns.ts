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

    /* CDK seems to have a bug in it where if you just reference a
     * cloudfront distribution from another stack rather than define it in
     * this one then it will be missing some internal zone mapping info.
     * We can directly inject CloudFormation template here as a workaround.
     */
    new cdk.CfnInclude(this, "CloudFrontHack", {
      template: {
        Mappings: {
          AWSCloudFrontPartitionHostedZoneIdMap: {
            "aws": {zoneId: "Z2FDTNDATAQYW2"},
            "aws-cn": {zoneId: "Z3RFFRIM2A3IF5"}
          }
        }
      }
    });

    const baseDnsProps = {
      zone: props.dnsZone,
      ttl: cdk.Duration.days(5),
    };

    //these DNS records allow @reclaimers.net email to work
    const fastmailMxRecordValues = [
      {priority: 10, hostName: "in1-smtp.messagingengine.com.",},
      {priority: 20, hostName: "in2-smtp.messagingengine.com."},
    ];

    new r53.MxRecord(this, "FastmailMxA", {
      ...baseDnsProps,
      values: fastmailMxRecordValues,
      recordName: "reclaimers.net",
    });
    new r53.MxRecord(this, "FastmailMxB", {
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
    new r53.TxtRecord(this, "FastmailTxt", {
      ...baseDnsProps,
      recordName: "reclaimers.net",
      values: ["v=spf1 include:spf.messagingengine.com ?all"],
    });

    //DNS records for the wiki
    const dnsWikiProps = {
      ...baseDnsProps,
      recordName: "test.reclaimers.net",
      target: r53.RecordTarget.fromAlias(new r53t.CloudFrontTarget(props.wikiCdn)),
    };
    new r53.ARecord(this, "WikiIpv4", dnsWikiProps);
    new r53.AaaaRecord(this, "WikiIpv6", dnsWikiProps);

    //DNS records for the main domain, currently pointing to the wiki
    // const dnsMainProps = {
    //   ...baseDnsProps,
    //   recordName: "reclaimers.net",
    //   target: r53.RecordTarget.fromAlias(new r53t.CloudFrontTarget(props.wikiCdn)),
    // };
    // new r53.ARecord(this, "MainIpv4", dnsMainProps);
    // new r53.AaaaRecord(this, "MainIpv6", dnsMainProps);

    //todo: www.

    //easy subdomain for gamenights
    new r53.ARecord(this, "PlayIpv4", {
      ...baseDnsProps,
      recordName: "play.reclaimers.net",
      target: r53.RecordTarget.fromIpAddresses(GAMENIGHT_SERVER_IPV4)
    });

    //easy subdomain for discord invites
    // const discordRedirectProps = {
    //   ...baseDnsProps,
    //   recordName: "discord.reclaimers.net",
    //   target: r53.RecordTarget.fromAlias(new r53t.ApiGateway(props.discordRedirectApi)),
    // };
    // new r53.ARecord(this, "DiscordIpv4", discordRedirectProps);
    // new r53.AaaaRecord(this, "DiscordIpv6", discordRedirectProps);

    //legacy account records -- to be removed after finishing and testing this account's services
    new r53.ARecord(this, "LegacyDiscordIpv4", {
      ...baseDnsProps,
      recordName: "disord.reclaimers.net",
      target: r53.RecordTarget.fromIpAddresses("13.224.8.101")
    });
    new r53.AaaaRecord(this, "LegacyDiscordIpv6", {
      ...baseDnsProps,
      recordName: "disord.reclaimers.net",
      target: r53.RecordTarget.fromIpAddresses("2600:9000:2196:5a00:15:6834:c400:93a1")
    });
    new r53.ARecord(this, "LegacyWikiIpv4", {
      ...baseDnsProps,
      recordName: "c20.reclaimers.net",
      target: r53.RecordTarget.fromIpAddresses("13.224.29.111")
    });
    new r53.ARecord(this, "LegacyWwwIpv4", {
      ...baseDnsProps,
      recordName: "www.reclaimers.net",
      target: r53.RecordTarget.fromIpAddresses("13.224.29.111")
    });
    new r53.ARecord(this, "LegacyMainIpv4", {
      ...baseDnsProps,
      recordName: "reclaimers.net",
      target: r53.RecordTarget.fromIpAddresses("13.224.29.111")
    });
  }
}
