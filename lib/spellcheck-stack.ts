import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda_nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export class SpellcheckStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const correctorLambda = new lambda_nodejs.NodejsFunction(
      this,
      'TextCorrector',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(__dirname, '../lambda/textCorrector.ts'),
        handler: 'handler',
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
        bundling: {
          minify: true,
          sourceMap: true,
        },
      }
    );

    const bedrockPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['bedrock:InvokeModel'],
      resources: [
        `arn:aws:bedrock:${this.region}::foundation-model/mistral.mistral-small-2402-v1:0`,
      ],
    });

    correctorLambda.addToRolePolicy(bedrockPolicy);

    new lambda.FunctionUrl(this, 'CorrectorUrl', {
      function: correctorLambda,
      authType: lambda.FunctionUrlAuthType.NONE,
    });
  }
}
