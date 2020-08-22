import * as cdk from "@aws-cdk/core";
import {WikiStack} from "./wiki";
import {DnsStack} from "./dns";
import {DiscordRedirectStack} from "./discord";
import {DomainStack} from "./domain";

export default class MainStack extends cdk.Stack {
  constructor(app: cdk.App, id: string) {
    super(app, id);

    const domainStack = new DomainStack(app, "Domain");
    const wikiStack = new WikiStack(app, "Wiki", domainStack.cert);
    const discordStack = new DiscordRedirectStack(app, "DiscordRedirect", domainStack.cert);

    new DnsStack(app, "Dns", {
      dnsZone: domainStack.dnsZone,
      wikiCdn: wikiStack.cdn,
      discordRedirectApi: discordStack.apiGateway,
    });
  }
}
