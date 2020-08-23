import * as cdk from "@aws-cdk/core";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as r53 from "@aws-cdk/aws-route53";

export class DomainStack extends cdk.Stack {
  readonly dnsZone: r53.PublicHostedZone;
  readonly cert: acm.Certificate;

  constructor(app: cdk.App, id: string) {
    super(app, id);

    this.dnsZone = new r53.PublicHostedZone(this, "ReclaimersZone", {
      zoneName: "reclaimers.net",
      //adds CAA record telling clients to only expect Amazon-issued certs for this domain
      caaAmazon: true
    });

    //provisions the cert which we can use for any reclaimers.net domains
    this.cert = new acm.Certificate(this, "ReclaimersCert", {
      domainName: "reclaimers.net",
      //on receiving our cert, clients verify the domain they requested is part of this signed set
      subjectAlternativeNames: ["reclaimers.net", "*.reclaimers.net"],
      //ACM requires us to verify that we own the domain -- do this in the ACM dashboard the first time
      validation: acm.CertificateValidation.fromDns(this.dnsZone)
    });
  }
}
