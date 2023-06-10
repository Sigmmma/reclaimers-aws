import { aws_route53 as r53, aws_certificatemanager as acm, Stack, StackProps, App} from "aws-cdk-lib";

/* Creates a hosted DNS zone for the reclaimers.net domain (which the account
 * must already own) and generates an SSL certificate that our services can use.
 */
export class DomainStack extends Stack {
  readonly dnsZone: r53.PublicHostedZone;
  readonly cert: acm.Certificate;

  constructor(app: App, id: string, stackProps: StackProps) {
    super(app, id, stackProps);

    this.dnsZone = new r53.PublicHostedZone(this, "ReclaimersZone", {
      zoneName: "reclaimers.net",
      //adds CAA record telling clients to only expect Amazon-issued certs for this domain
      caaAmazon: true
    });

    //provisions the cert which we can use for any reclaimers.net domains
    this.cert = new acm.Certificate(this, "ReclaimersCert", {
      domainName: "reclaimers.net",
      //on receiving our cert, clients verify the domain they requested is part of this signed set
      subjectAlternativeNames: [
        "reclaimers.net",
        "*.reclaimers.net"
      ],
      //ACM requires us to verify that we own the domain -- do this in the ACM dashboard the first time
      validation: acm.CertificateValidation.fromDns(this.dnsZone)
    });
  }
}
