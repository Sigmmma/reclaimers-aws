import * as cdk from "@aws-cdk/core";
import * as cfo from "@aws-cdk/aws-cloudfront-origins";
import * as cf from "@aws-cdk/aws-cloudfront";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as r53 from "@aws-cdk/aws-route53";
import * as r53t from "@aws-cdk/aws-route53-targets";
import {BasicBucket} from "./constructs/bucket";

class ReclaimersStack extends cdk.Stack {
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

    //these DNS records allow @reclaimers.net email to work
    new r53.MxRecord(this, "DnsFastmailMxA", {
      zone: dnsZone,
      recordName: "reclaimers.net",
      values: [
        {priority: 10, hostName: "in1-smtp.messagingengine.com.",},
        {priority: 20, hostName: "in2-smtp.messagingengine.com."},
      ],
      ttl: cdk.Duration.days(1),
    });
    new r53.MxRecord(this, "DnsFastmailMxB", {
      zone: dnsZone,
      recordName: "*.reclaimers.net",
      values: [
        {priority: 10, hostName: "in1-smtp.messagingengine.com.",},
        {priority: 20, hostName: "in2-smtp.messagingengine.com."},
      ],
      ttl: cdk.Duration.days(1),
    });
    new r53.CnameRecord(this, "DnsFastmailCnameA", {
      zone: dnsZone,
      recordName: "fm1._domainkey.reclaimers.net",
      domainName: "fm1.reclaimers.net.dkim.fmhosted.com",
      ttl: cdk.Duration.days(1),
    });
    new r53.CnameRecord(this, "DnsFastmailCnameB", {
      zone: dnsZone,
      recordName: "fm2._domainkey.reclaimers.net",
      domainName: "fm2.reclaimers.net.dkim.fmhosted.com",
      ttl: cdk.Duration.days(1),
    });
    new r53.CnameRecord(this, "DnsFastmailCnameC", {
      zone: dnsZone,
      recordName: "fm3._domainkey.reclaimers.net",
      domainName: "fm3.reclaimers.net.dkim.fmhosted.com",
      ttl: cdk.Duration.days(1),
    });
    new r53.TxtRecord(this, "DnsFastmailTxt", {
      zone: dnsZone,
      recordName: "reclaimers.net",
      values: ["v=spf1 include:spf.messagingengine.com ?all"],
      ttl: cdk.Duration.days(1),
    });

    //DNS records for the wiki
    new r53.ARecord(this, "DnsWikiIpv4", {
      zone: dnsZone,
      recordName: "c20.reclaimers.net",
      target: r53.RecordTarget.fromAlias(new r53t.CloudFrontTarget(wikiCdn))
    });
    new r53.AaaaRecord(this, "DnsWikiIpv6", {
      zone: dnsZone,
      recordName: "c20.reclaimers.net",
      target: r53.RecordTarget.fromAlias(new r53t.CloudFrontTarget(wikiCdn))
    });

    //DNS records for the main domain, currently pointing to the wiki
    new r53.ARecord(this, "DnsMainIpv4", {
      zone: dnsZone,
      recordName: "reclaimers.net",
      target: r53.RecordTarget.fromAlias(new r53t.CloudFrontTarget(wikiCdn))
    });
    new r53.AaaaRecord(this, "DnsMainIpv6", {
      zone: dnsZone,
      recordName: "reclaimers.net",
      target: r53.RecordTarget.fromAlias(new r53t.CloudFrontTarget(wikiCdn))
    });
  }
}

const app = new cdk.App();
new ReclaimersStack(app, "ReclaimersStack");
app.synth();
