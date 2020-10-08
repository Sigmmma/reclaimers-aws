import * as cdk from "@aws-cdk/core";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ec2 from "@aws-cdk/aws-ec2";

/* This ECS cluster is a place where container tasks and services can be run
 * as needed. It currently does not include any provisioned EC2 instances,
 * and uses Fargate resources. This is fine until we want to have some 24/7
 * services and consider reducing cost by using buying some reserved EC2 capacity.
 */
export class ClusterStack extends cdk.Stack {
  readonly cluster: ecs.Cluster;

  constructor(app: cdk.App, id: string, stackProps: cdk.StackProps) {
    super(app, id, stackProps);

    this.cluster = new ecs.Cluster(this, "Cluster", {
      clusterName: "common-cluster",
      vpc: ec2.Vpc.fromLookup(this, "GetDefaultVpc", {
        isDefault: true
      })
    });
  }
}
