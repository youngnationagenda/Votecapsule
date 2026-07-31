#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const ECR      = '683541453923.dkr.ecr.us-east-1.amazonaws.com';
const CLUSTER  = 'arn:aws:ecs:us-east-1:683541453923:cluster/vote-capsule-services';
const EXEC_ROLE = 'arn:aws:iam::683541453923:role/vote-capsule-ecs-task-execution-role';
const LISTENER_ARN = 'arn:aws:elasticloadbalancing:us-east-1:683541453923:listener/app/vote-capsule-services-alb/aef21c0dc2379121/8cfcb22850289df4';
const SUBNETS  = ['subnet-0aa1a58541c87ae2a','subnet-0171d821c5d5ae868','subnet-0be09dbd825b75c07','subnet-09604eb63697ac228'];
const ALB_SG   = 'sg-0141328242fe8f272';
const VPC      = 'vpc-0ae6f8630af9fbfdc';
const DB_HOST  = 'vote-capsule-db.cluster-c43i6c8ow71c.us-east-1.rds.amazonaws.com';
const DB_SECRET = 'arn:aws:secretsmanager:us-east-1:683541453923:secret:vote-capsule/database/credentials-zTDMLX';
const JWT_SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:683541453923:secret:vote-capsule/jwt/secret-bB2dDP';

const SERVICES = [
  { name: 'identity',  port: 3001, path: '/api/v1/identity/*',  pri: 10,  cpu: '512',  mem: '1024', log: '/vote-capsule/services/identity' },
  { name: 'tenant',    port: 3002, path: '/api/v1/tenant/*',    pri: 20,  cpu: '512',  mem: '1024', log: '/vote-capsule/services/tenant' },
  { name: 'trust',     port: 3003, path: '/api/v1/trust/*',     pri: 30,  cpu: '512',  mem: '1024', log: '/vote-capsule/services/trust' },
  { name: 'geography', port: 3004, path: '/api/v1/geography/*', pri: 40,  cpu: '1024', mem: '2048', log: '/vote-capsule/services/geography' },
  { name: 'evidence',  port: 3005, path: '/api/v1/evidence/*',  pri: 50,  cpu: '512',  mem: '1024', log: '/vote-capsule/services/evidence' },
  { name: 'ai',        port: 3006, path: '/api/v1/ai/*',        pri: 60,  cpu: '1024', mem: '2048', log: '/vote-capsule/services/ai' },
  { name: 'workflow',  port: 3007, path: '/api/v1/workflow/*',  pri: 70,  cpu: '512',  mem: '1024', log: '/vote-capsule/services/workflow' },
  { name: 'admin-web', port: 80,   path: '/admin/*',            pri: 5,   cpu: '256',  mem: '512',  log: '/vote-capsule/apps/admin-web', nginx: true },
];

function pascal(s) {
  return s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

const commonEnv = (port) => [
  { Name: 'NODE_ENV',              Value: 'production' },
  { Name: 'PORT',                  Value: String(port) },
  { Name: 'AWS_REGION',            Value: 'us-east-1' },
  { Name: 'DB_HOST',               Value: DB_HOST },
  { Name: 'DB_PORT',               Value: '5432' },
  { Name: 'DB_NAME',               Value: 'votecapsule' },
  { Name: 'DB_USER',               Value: 'vcadmin' },
  { Name: 'DB_SSL',                Value: 'true' },
  { Name: 'DB_POOL_MAX',           Value: '10' },
  { Name: 'EVENT_BUS_NAME',        Value: 'votecapsule-events' },
  { Name: 'SQS_VALIDATION_URL',    Value: 'https://sqs.us-east-1.amazonaws.com/683541453923/votecapsule-validation' },
  { Name: 'S3_EVIDENCE_VAULT',     Value: 'vote-capsule-evidence-vault-683541453923' },
  { Name: 'COGNITO_USER_POOL_ID',  Value: 'us-east-1_i3N2tg34A' },
  { Name: 'COGNITO_CLIENT_ID',     Value: '3hi86ci06546ki038k6msmik0s' },
];

const commonSecrets = [
  { Name: 'DB_PASSWORD', ValueFrom: DB_SECRET + ':password::' },
  { Name: 'JWT_SECRET',  ValueFrom: JWT_SECRET_ARN + ':secret::' },
];

const Resources = {};
const Outputs   = {};

for (const svc of SERVICES) {
  const P    = pascal(svc.name);
  const repo = svc.name === 'admin-web' ? 'admin-web' : `${svc.name}-service`;
  const img  = `${ECR}/vote-capsule/${repo}:latest`;

  // ── Security Group ────────────────────────────────────
  const sgK = `${P}SG`;
  Resources[sgK] = {
    Type: 'AWS::EC2::SecurityGroup',
    Properties: {
      GroupName: `vc-${svc.name}-sg`,
      GroupDescription: `VoteCapsule ${svc.name} ECS tasks`,
      VpcId: VPC,
      SecurityGroupIngress: [{
        IpProtocol: 'tcp',
        FromPort: svc.port,
        ToPort: svc.port,
        SourceSecurityGroupId: ALB_SG,
        Description: 'From ALB',
      }],
      Tags: [{ Key: 'Project', Value: 'VoteCapsule' }, { Key: 'Service', Value: svc.name }],
    },
  };

  // ── Task Definition ───────────────────────────────────
  const tdK = `${P}TD`;
  const cdef = {
    Name: `vc-${svc.name}`,
    Image: img,
    Essential: true,
    PortMappings: [{ ContainerPort: svc.port, Protocol: 'tcp' }],
    LogConfiguration: {
      LogDriver: 'awslogs',
      Options: {
        'awslogs-group':         svc.log,
        'awslogs-region':        'us-east-1',
        'awslogs-stream-prefix': svc.name,
        'awslogs-create-group':  'true',
      },
    },
  };
  if (!svc.nginx) {
    cdef.Environment = commonEnv(svc.port);
    cdef.Secrets     = commonSecrets;
  }

  Resources[tdK] = {
    Type: 'AWS::ECS::TaskDefinition',
    Properties: {
      Family:                  `vc-${svc.name}`,
      Cpu:                     svc.cpu,
      Memory:                  svc.mem,
      NetworkMode:             'awsvpc',
      RequiresCompatibilities: ['FARGATE'],
      ExecutionRoleArn:        EXEC_ROLE,
      TaskRoleArn:             EXEC_ROLE,
      ContainerDefinitions:    [cdef],
      Tags: [{ Key: 'Project', Value: 'VoteCapsule' }, { Key: 'Service', Value: svc.name }],
    },
  };

  // ── Target Group ──────────────────────────────────────
  const tgK  = `${P}TG`;
  const tgName = `vc-${svc.name.substring(0, 10)}-tg`;
  Resources[tgK] = {
    Type: 'AWS::ElasticLoadBalancingV2::TargetGroup',
    Properties: {
      Name:                       tgName,
      Port:                       svc.port,
      Protocol:                   'HTTP',
      VpcId:                      VPC,
      TargetType:                 'ip',
      HealthCheckPath:            '/health',
      HealthCheckIntervalSeconds: 30,
      HealthCheckTimeoutSeconds:  5,
      HealthyThresholdCount:      2,
      UnhealthyThresholdCount:    3,
      Matcher:                    { HttpCode: '200,404' },
      Tags: [{ Key: 'Project', Value: 'VoteCapsule' }, { Key: 'Service', Value: svc.name }],
    },
  };

  // ── ALB Listener Rule ─────────────────────────────────
  const rlK = `${P}Rule`;
  Resources[rlK] = {
    Type: 'AWS::ElasticLoadBalancingV2::ListenerRule',
    Properties: {
      ListenerArn: LISTENER_ARN,
      Priority:    svc.pri,
      Conditions:  [{ Field: 'path-pattern', Values: [svc.path] }],
      Actions:     [{ Type: 'forward', TargetGroupArn: { Ref: tgK } }],
    },
  };

  // ── ECS Service ───────────────────────────────────────
  const svK = `${P}Service`;
  Resources[svK] = {
    Type: 'AWS::ECS::Service',
    DependsOn: [rlK],
    Properties: {
      ServiceName:      `vc-${svc.name}`,
      Cluster:          CLUSTER,
      TaskDefinition:   { Ref: tdK },
      DesiredCount:     1,
      LaunchType:       'FARGATE',
      NetworkConfiguration: {
        AwsvpcConfiguration: {
          Subnets:         SUBNETS,
          SecurityGroups:  [{ 'Fn::GetAtt': [sgK, 'GroupId'] }],
          AssignPublicIp:  'ENABLED',
        },
      },
      LoadBalancers: [{
        ContainerName:  `vc-${svc.name}`,
        ContainerPort:  svc.port,
        TargetGroupArn: { Ref: tgK },
      }],
      HealthCheckGracePeriodSeconds: 90,
      Tags: [{ Key: 'Project', Value: 'VoteCapsule' }, { Key: 'Service', Value: svc.name }],
    },
  };

  Outputs[`${P}ServiceArn`] = { Description: `${svc.name} ECS service ARN`, Value: { Ref: svK } };
  Outputs[`${P}TGArn`]      = { Description: `${svc.name} target group ARN`, Value: { Ref: tgK } };
}

const template = {
  AWSTemplateFormatVersion: '2010-09-09',
  Description: 'VoteCapsule ECS Task Definitions, Fargate Services, Target Groups, ALB routing rules Tasks 17 and 18',
  Resources,
  Outputs,
};

const outPath = path.join(__dirname, 'vote-capsule-ecs-services.json');
fs.writeFileSync(outPath, JSON.stringify(template, null, 2));
console.log(`Written: ${outPath}`);
console.log(`Resources: ${Object.keys(Resources).length}`);
console.log(`Outputs:   ${Object.keys(Outputs).length}`);
