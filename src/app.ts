import * as cdk from "@aws-cdk/core";
import MainStack from "./stacks/main";

const app = new cdk.App();
new MainStack(app, "ReclaimersStack");
app.synth();
