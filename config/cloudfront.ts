import { CloudFrontClient, CreateDistributionCommand, UpdateDistributionCommand } from '@aws-sdk/client-cloudfront';
import { AWS_CONFIG } from './aws';

const cloudFrontClient = new CloudFrontClient({
  region: AWS_CONFIG.region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const CLOUDFRONT_CONFIG = {
  // Origin configuration
  s3Origin: `${AWS_CONFIG.bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com`,
  
  // Cache behavior settings
  defaultTTL: 86400, // 24 hours
  maxTTL: 31536000, // 1 year
  minTTL: 0,
  
  // Allowed HTTP methods
  allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
  cachedMethods: ['GET', 'HEAD'],
  
  // Compression settings
  compress: true,
  
  // CORS configuration
  allowedOrigins: ['*'],
  allowedHeaders: ['Authorization', 'Origin', 'Content-Type'],
  
  // Security settings
  viewerProtocolPolicy: 'redirect-to-https',
  priceClass: 'PriceClass_100', // Use only North America and Europe edge locations
};

export async function createOrUpdateDistribution(distributionId?: string) {
  const distributionConfig = {
    CallerReference: Date.now().toString(),
    Comment: 'Chat App File Distribution',
    Enabled: true,
    DefaultRootObject: '',
    Origins: {
      Quantity: 1,
      Items: [
        {
          Id: 'S3Origin',
          DomainName: CLOUDFRONT_CONFIG.s3Origin,
          S3OriginConfig: {
            OriginAccessIdentity: '',
          },
          OriginPath: '',
          CustomHeaders: {
            Quantity: 0,
            Items: [],
          },
        },
      ],
    },
    DefaultCacheBehavior: {
      TargetOriginId: 'S3Origin',
      ViewerProtocolPolicy: CLOUDFRONT_CONFIG.viewerProtocolPolicy,
      AllowedMethods: {
        Quantity: CLOUDFRONT_CONFIG.allowedMethods.length,
        Items: CLOUDFRONT_CONFIG.allowedMethods,
        CachedMethods: {
          Quantity: CLOUDFRONT_CONFIG.cachedMethods.length,
          Items: CLOUDFRONT_CONFIG.cachedMethods,
        },
      },
      Compress: CLOUDFRONT_CONFIG.compress,
      DefaultTTL: CLOUDFRONT_CONFIG.defaultTTL,
      MaxTTL: CLOUDFRONT_CONFIG.maxTTL,
      MinTTL: CLOUDFRONT_CONFIG.minTTL,
      ForwardedValues: {
        QueryString: false,
        Cookies: {
          Forward: 'none',
        },
        Headers: {
          Quantity: CLOUDFRONT_CONFIG.allowedHeaders.length,
          Items: CLOUDFRONT_CONFIG.allowedHeaders,
        },
      },
    },
    PriceClass: CLOUDFRONT_CONFIG.priceClass,
    CustomErrorResponses: {
      Quantity: 1,
      Items: [
        {
          ErrorCode: 403,
          ResponsePagePath: '/error.html',
          ResponseCode: '404',
          ErrorCachingMinTTL: 300,
        },
      ],
    },
  };

  try {
    if (distributionId) {
      // Update existing distribution
      const command = new UpdateDistributionCommand({
        Id: distributionId,
        DistributionConfig: distributionConfig,
        IfMatch: '*',
      });
      await cloudFrontClient.send(command);
    } else {
      // Create new distribution
      const command = new CreateDistributionCommand({
        DistributionConfig: distributionConfig,
      });
      await cloudFrontClient.send(command);
    }
  } catch (error) {
    console.error('Failed to create/update CloudFront distribution:', error);
    throw error;
  }
} 