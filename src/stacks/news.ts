import {
  aws_codebuild as cb,
  aws_ecr as ecr,
  aws_ec2 as ec2,
  aws_iam as iam,
  aws_ecs as ecs,
  aws_kms as kms,
  aws_dynamodb as dynamo,
  aws_events_targets as eventsTargets,
  aws_events as events,
  Stack,
  Duration,
  RemovalPolicy,
  StackProps,
  App
} from "aws-cdk-lib";

const IMAGE_REPO_NAME = "reclaimers-news";
const IMAGE_TAG = "latest";

/* Implements the "Halo CE News" notifications sent to Discord
 * when releases are posted on various community websites, based
 * on RSS feeds.
 */
export class NewsStack extends Stack {
  constructor(app: App, id: string, cluster: ecs.Cluster, stackProps: StackProps) {
    super(app, id, stackProps);

    //we need a place to store the built container image
    const imageRepo = new ecr.Repository(this, "ImageRepo", {
      repositoryName: IMAGE_REPO_NAME,
      removalPolicy: RemovalPolicy.DESTROY
    });

    //user for local development
    const devUser = new iam.User(this, "DevUser", {
      userName: "dev-news",
    });

    const taskRole = new iam.Role(this, "TaskRole", {
      assumedBy: new iam.CompositePrincipal(
        devUser,
        new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      ),
      roleName: "news-task",
    });
    taskRole.grantAssumeRole(devUser);

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
      removalPolicy: RemovalPolicy.RETAIN,
    });
    newsSentTable.grantReadWriteData(taskRole);

    //a KMS key for encrypted config
    const secretsKey = new kms.Key(this, "SecretsKey", {
      alias: "news-secrets",
    });
    secretsKey.grantEncryptDecrypt(taskRole);

    //define the container which will run the news scan task
    const newsTaskDef = new ecs.FargateTaskDefinition(this, "NewsTask", {
      family: "news-task",
      cpu: 256, //smallest (.25 vCPU)
      memoryLimitMiB: 512, //smallest for this vCPU amount
      taskRole: taskRole,
    });
    newsTaskDef.addContainer("ServiceContainer", {
      image: ecs.ContainerImage.fromEcrRepository(imageRepo, IMAGE_TAG),
      //we could override command, entryPoint, or environment here too
    });

    //schedule our task to run every hour in the cluster
    new events.Rule(this, "Schedule", {
      ruleName: "news-schedule",
      description: "Determines how often we poll RSS for CE news",
      schedule: events.Schedule.rate(Duration.hours(1)),
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
      timeout: Duration.minutes(10),
      environment: {
        buildImage: cb.LinuxBuildImage.AMAZON_LINUX_2_4,
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
      badge: true,
    });

    //allow the automated build to push to our container image repo
    imageRepo.grantPullPush(build);
  }
}
