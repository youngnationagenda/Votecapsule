/**
 * Vote Capsule™ — Auth Stack
 * Amazon Cognito User Pool with MFA enforcement for privileged users
 */

import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export class VoteCapsuleAuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly adminClient: cognito.UserPoolClient;
  public readonly mobileClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    // Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'VoteCapsuleUserPool', {
      userPoolName: 'vote-capsule-users',

      // Self sign-up disabled — all users are invited
      selfSignUpEnabled: false,

      signInAliases: {
        email: true,
        username: false,
        phone: false,
      },

      // Password policy
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(7),
      },

      // MFA — required for privileged users, optional for others
      // Note: Individual MFA enforcement is handled by the Identity Service
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: false,     // TOTP only — more secure
        otp: true,      // Software TOTP (Google Authenticator, Authy, etc.)
      },

      // Account recovery
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,

      // Email configuration
      email: cognito.UserPoolEmail.withCognito(),

      // Standard attributes
      standardAttributes: {
        email: { required: true, mutable: true },
        givenName: { required: false, mutable: true },
        familyName: { required: false, mutable: true },
      },

      // Auto-verify email
      autoVerify: { email: true },

      // User pool deletion — retain in production
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Admin Portal App Client (web)
    this.adminClient = this.userPool.addClient('AdminPortalClient', {
      userPoolClientName: 'vote-capsule-admin-web',
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL],
        callbackUrls: [
          'http://localhost:3000/callback',
          'https://admin.votecapsule.co.ke/callback',
          'https://votecapsule.yna.co.ke/callback',
          'https://admin.votecapsule.yna.co.ke/callback',
        ],
        logoutUrls: [
          'http://localhost:3000/login',
          'https://admin.votecapsule.co.ke/login',
          'https://votecapsule.yna.co.ke/login',
          'https://admin.votecapsule.yna.co.ke/login',
        ],
      },
      accessTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
      preventUserExistenceErrors: true,
    });

    // Mobile App Client
    this.mobileClient = this.userPool.addClient('MobileClient', {
      userPoolClientName: 'vote-capsule-mobile',
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      accessTokenValidity: cdk.Duration.hours(8),
      refreshTokenValidity: cdk.Duration.days(30),
      preventUserExistenceErrors: true,
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      exportName: 'VoteCapsule-UserPoolId',
    });

    new cdk.CfnOutput(this, 'AdminClientId', {
      value: this.adminClient.userPoolClientId,
      exportName: 'VoteCapsule-AdminClientId',
    });
  }
}
