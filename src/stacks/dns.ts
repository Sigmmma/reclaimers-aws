import { aws_route53 as r53, aws_route53_targets as r53t, aws_cloudfront as cf, aws_apigateway as apigw, Stack, StackProps, App, Duration} from "aws-cdk-lib";

const GAMENIGHT_SERVERS = {
  //SlowBullet's CE3/Reclaimers server
  "play.reclaimers.net": "18.216.124.132", //2302
  //killzone's "Reclaimers West"
  "play2.reclaimers.net": "52.38.12.237", //2305
  //þsϵυdø.þrø×϶n's servers:
  "play3.reclaimers.net": "70.35.197.81", //2302 (FFA)
  "play4.reclaimers.net": "70.35.197.81", //2304 (Team)
};

export interface DnsStackProps {
  dnsZone: r53.PublicHostedZone;
  wikiCdn: cf.Distribution;
  filesCdn: cf.Distribution;
  discordRedirectApi: apigw.RestApi;
}

/* Creates DNS entries within the reclaimers.net domain's hosted zone.
 * This allows us to have @reclaimers.net emails, and various subdomains
 * with services.
 */
export class DnsStack extends Stack {
  constructor(app: App, id: string, props: DnsStackProps, stackProps: StackProps) {
    super(app, id, stackProps);

    /* CDK seems to have a bug in it where if you just reference a
     * cloudfront distribution from another stack rather than define it in
     * this one then it will be missing some internal zone mapping info.
     * We can directly inject CloudFormation template here as a workaround.
     */
    // new CfnInclude(this, "CloudFrontHack", {
    //   template: {
    //     Mappings: {
    //       AWSCloudFrontPartitionHostedZoneIdMap: {
    //         "aws": {zoneId: "Z2FDTNDATAQYW2"},
    //         "aws-cn": {zoneId: "Z3RFFRIM2A3IF5"}
    //       }
    //     }
    //   }
    // });

    const baseDnsProps = {
      zone: props.dnsZone,
      ttl: Duration.days(5),
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
      target: r53.RecordTarget.fromAlias(new r53t.CloudFrontTarget(props.wikiCdn)),
      recordName: "c20.reclaimers.net",
    };
    new r53.ARecord(this, "WikiIpv4", dnsWikiProps);
    new r53.AaaaRecord(this, "WikiIpv6", dnsWikiProps);

    //public shared files domain
    const dnsFilesProps = {
      ...baseDnsProps,
      target: r53.RecordTarget.fromAlias(new r53t.CloudFrontTarget(props.filesCdn)),
      recordName: "files.reclaimers.net",
    };
    new r53.ARecord(this, "FilesIpv4", dnsFilesProps);
    new r53.AaaaRecord(this, "FilesIpv6", dnsFilesProps);

    //DNS records for the main domain, currently pointing to the wiki
    new r53.ARecord(this, "MainIpv4", {
      ...dnsWikiProps,
      recordName: "reclaimers.net",
    });
    new r53.AaaaRecord(this, "MainIpv6", {
      ...dnsWikiProps,
      recordName: "reclaimers.net",
    });
    new r53.ARecord(this, "WwwIpv4", {
      ...dnsWikiProps,
      recordName: "www.reclaimers.net",
    });
    new r53.AaaaRecord(this, "WwwIpv6", {
      ...dnsWikiProps,
      recordName: "www.reclaimers.net",
    });

    //easy subdomains for gamenights
    Object.entries(GAMENIGHT_SERVERS).forEach(([name, ip]) => {
      new r53.ARecord(this, `Gamenight-${name}-Ipv4`, {
        ...baseDnsProps,
        ttl: Duration.minutes(15),
        recordName: name,
        target: r53.RecordTarget.fromIpAddresses(ip)
      });
    });

    // easy subdomain for discord invites
    const discordRedirectProps = {
      ...baseDnsProps,
      recordName: "discord.reclaimers.net",
      target: r53.RecordTarget.fromAlias(new r53t.ApiGateway(props.discordRedirectApi)),
    };
    new r53.ARecord(this, "DiscordIpv4", discordRedirectProps);
    new r53.AaaaRecord(this, "DiscordIpv6", discordRedirectProps);
  }
}
