import { aws_ecs as ecs, aws_ec2 as ec2, Stack, StackProps, App} from "aws-cdk-lib";

/* This ECS cluster is a place where container tasks and services can be run
 * as needed. It currently does not include any provisioned EC2 instances,
 * and uses Fargate resources. This is fine until we want to have some 24/7
 * services and consider reducing cost by using buying some reserved EC2 capacity.
 */
export class ClusterStack extends Stack {
  readonly cluster: ecs.Cluster;

  constructor(app: App, id: string, stackProps: StackProps) {
    super(app, id, stackProps);

    this.cluster = new ecs.Cluster(this, "Cluster", {
      clusterName: "common-cluster",
      vpc: ec2.Vpc.fromLookup(this, "GetDefaultVpc", {
        isDefault: true
      })
    });
  }
}
