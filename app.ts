import * as cdk from "@aws-cdk/core";
import ReclaimersStack from "./src/stack";

const app = new cdk.App();
new ReclaimersStack(app, "ReclaimersStack");
app.synth();
