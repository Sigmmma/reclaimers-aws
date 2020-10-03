import * as cdk from "@aws-cdk/core";
import {WikiStack} from "./wiki";
import {FilesStack} from "./files";
import {DnsStack} from "./dns";
import {DiscordRedirectStack} from "./discord";
import {DomainStack} from "./domain";
import {ClusterStack} from "./cluster";
import {NewsStack} from "./news";

/* Top-level stack which creates all child stacks and wires them together.
 */
export default class MainStack extends cdk.Stack {
  constructor(app: cdk.App, id: string) {
    super(app, id);

    //general low-level infrastructure
    const domainStack = new DomainStack(app, "Domain2");
    const clusterStack = new ClusterStack(app, "Services");

    //services
    new NewsStack(app, "News", clusterStack.cluster);
    const wikiStack = new WikiStack(app, "Wiki", domainStack.cert);
    const filesStack = new FilesStack(app, "Files", domainStack.cert);
    const discordStack = new DiscordRedirectStack(app, "DiscordRedirect", domainStack.cert);

    //general high-level infrastructure
    new DnsStack(app, "Dns", {
      dnsZone: domainStack.dnsZone,
      wikiCdn: wikiStack.cdn,
      filesCdn: filesStack.cdn,
      discordRedirectApi: discordStack.apiGateway,
    });
  }
}
