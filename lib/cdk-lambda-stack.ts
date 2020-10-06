import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as ec2 from "@aws-cdk/aws-ec2";
import * as elbv2 from "@aws-cdk/aws-elasticloadbalancingv2";
import * as targets from "@aws-cdk/aws-elasticloadbalancingv2-targets";
import * as ga from "@aws-cdk/aws-globalaccelerator";


export class CdkLambdaStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

  
    const vpc = new ec2.Vpc(this, "cdk-vpc", {
      cidr: "10.0.0.0/16"
    });

    //ALB
    const lb = new elbv2.ApplicationLoadBalancer(this, 'LB', {
      vpc,
      internetFacing: false
    });

    const listener = lb.addListener('Listener', {
      port: 80
    });

    //Global Accelerator
    const accelerator = new ga.Accelerator(this, 'Accelerator');
    const alistener = new ga.Listener(this, 'Listener', {
      accelerator,
      portRanges: [
        {
          fromPort: 80,
          toPort: 80,
        },
      ],
    });

    const endpointGroup = new ga.EndpointGroup(this, 'Group', {
      listener: alistener
    });
    endpointGroup.addLoadBalancer('cdk-alb', lb);
    const agaSg = ga.AcceleratorSecurityGroup.fromVpc(this, 'GlobalAcceleratorSG', vpc, endpointGroup);
    lb.connections.allowFrom(agaSg, ec2.Port.tcp(80));

    //Lambda
    const hello = new lambda.Function(this, "Hellohandler", {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset("src/lambda"),
      handler: "index.handler"
    });

    listener.addTargets('Lambda',{
      targets: [new targets.LambdaTarget(hello)],

      healthCheck: {
        enabled: true,
      }
    });


    // Integration 作成
    const restApi = new apigateway.RestApi(this, 'RestApi', {
      deploy: true,
    });
    const slack = restApi.root.addResource('slack');
    
    const getSlackIntegration = new apigateway.LambdaIntegration(hello);
    slack.addMethod('POST', getSlackIntegration);
  }
}
