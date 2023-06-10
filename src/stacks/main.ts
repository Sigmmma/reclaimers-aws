import { WikiStack } from "./wiki";
import { FilesStack } from "./files";
import { DnsStack } from "./dns";
import { DiscordRedirectStack } from "./discord";
import { DomainStack } from "./domain";
import { ClusterStack } from "./cluster";
import { NewsStack } from "./news";
import { Stack, App } from "aws-cdk-lib";

//stops us from accidentally deploying to the wrong account
const STACK_PROPS = {
  env: {
    account: "413062193480",
    region: "us-east-1"
  }
};

/* Top-level stack which creates all child stacks and wires them together.
 */
export default class MainStack extends Stack {
  constructor(app: App, id: string) {
    super(app, id, STACK_PROPS);

    //general low-level infrastructure
    const domainStack = new DomainStack(app, "Domain2", STACK_PROPS);
    const clusterStack = new ClusterStack(app, "Cluster", STACK_PROPS);

    //services
    new NewsStack(app, "News", clusterStack.cluster, STACK_PROPS);
    const wikiStack = new WikiStack(app, "Wiki", domainStack.cert, STACK_PROPS);
    const filesStack = new FilesStack(app, "Files", domainStack.cert, STACK_PROPS);
    const discordStack = new DiscordRedirectStack(app, "DiscordRedirect", domainStack.cert, STACK_PROPS);

    //general high-level infrastructure
    new DnsStack(app, "Dns", {
      dnsZone: domainStack.dnsZone,
      wikiCdn: wikiStack.cdn,
      filesCdn: filesStack.cdn,
      discordRedirectApi: discordStack.apiGateway,
    }, STACK_PROPS);
  }
}
