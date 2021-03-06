import * as cdk from "@aws-cdk/core";
import * as events from "@aws-cdk/aws-events";
import * as eventsTargets from "@aws-cdk/aws-events-targets";
import * as dynamo from "@aws-cdk/aws-dynamodb";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecr from "@aws-cdk/aws-ecr";
import * as iam from "@aws-cdk/aws-iam";
import * as cb from "@aws-cdk/aws-codebuild";

const IMAGE_REPO_NAME = "reclaimers-news";
const IMAGE_TAG = "latest";

/* Implements the "Halo CE News" notifications sent to Discord
 * when releases are posted on various community websites, based
 * on RSS feeds.
 */
export class NewsStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, cluster: ecs.Cluster, stackProps: cdk.StackProps) {
    super(app, id, stackProps);

    //we need a table to store which RSS items have been sent to Discord already
    const newsSentTable = new dynamo.Table(this, "NewsSentMessages", {
      tableName: "news-sent-messages",
      partitionKey: {
        name: "sourceId",
        type: dynamo.AttributeType.STRING,
      },
      sortKey: {
        name: "guid",
        type: dynamo.AttributeType.STRING,
      },
      billingMode: dynamo.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    //we need a place to store the built container image
    const imageRepo = new ecr.Repository(this, "ImageRepo", {
      repositoryName: IMAGE_REPO_NAME,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    //define the container which will run the news scan task
    const newsTaskDef = new ecs.FargateTaskDefinition(this, "NewsTask", {
      family: "news-task",
      cpu: 256, //smallest (.25 vCPU)
      memoryLimitMiB: 512, //smallest for this vCPU amount
    });
    newsTaskDef.addContainer("ServiceContainer", {
      image: ecs.ContainerImage.fromEcrRepository(imageRepo, IMAGE_TAG),
      //we could override command, entryPoint, or environment here too
    });

    //the container's role will be allowed to read/write the sent messages table
    newsSentTable.grantReadWriteData(newsTaskDef.taskRole);

    //schedule our task to run every hour in the cluster
    new events.Rule(this, "Schedule", {
      ruleName: "news-schedule",
      description: "Determines how often we poll RSS for CE news",
      schedule: events.Schedule.rate(cdk.Duration.hours(1)),
      // eventPattern: {},
      targets: [
        new eventsTargets.EcsTask({
          cluster,
          subnetSelection: {
            subnetType: ec2.SubnetType.PUBLIC
          },
          taskDefinition: newsTaskDef
        })
      ]
    });

    const build = new cb.Project(this, "Build", {
      projectName: "news-build",
      timeout: cdk.Duration.minutes(10),
      environment: {
        buildImage: cb.LinuxBuildImage.AMAZON_LINUX_2_3,
        computeType: cb.ComputeType.SMALL,
        environmentVariables: {
          AWS_DEFAULT_REGION: {value: "us-east-1"},
          AWS_ACCOUNT_ID: {value: this.account},
          IMAGE_REPO_NAME: {value: imageRepo.repositoryName},
          IMAGE_TAG: {value: IMAGE_TAG},
        },
        privileged: true
      },
      description: "Automatically builds and deploys the RSS news scanner",
      source: cb.Source.gitHub({
        owner: "Sigmmma",
        repo: "reclaimers-news",
        cloneDepth: 1,
        webhookFilters: [
          cb.FilterGroup.inEventOf(cb.EventAction.PUSH).andHeadRefIs("refs/heads/master"),
          cb.FilterGroup.inEventOf(cb.EventAction.PULL_REQUEST_MERGED).andHeadRefIs("refs/heads/master"),
        ],
      }),
      secondarySources: [
        cb.Source.gitHub({
          identifier: "config", //this is used in the buildspec.yml as `CODEBUILD_SRC_DIR_config`
          owner: "Sigmmma",
          repo: "reclaimers-news-sources",
          cloneDepth: 1,
          webhookFilters: [
            cb.FilterGroup.inEventOf(cb.EventAction.PUSH).andHeadRefIs("refs/heads/master"),
            cb.FilterGroup.inEventOf(cb.EventAction.PULL_REQUEST_MERGED).andHeadRefIs("refs/heads/master"),
          ],
        })
      ],
      badge: true,
    });

    //allow the automated build to push to our container image repo
    imageRepo.grantPullPush(build);
  }
}
