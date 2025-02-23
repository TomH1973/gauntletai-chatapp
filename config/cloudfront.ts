import { CloudFrontClient, CreateDistributionCommand, UpdateDistributionCommand, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { AWS_CONFIG } from './aws';
import { metrics } from '@/lib/metrics';

const cloudFrontClient = new CloudFrontClient({
  region: AWS_CONFIG.region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  maxAttempts: 3,
  retryMode: 'adaptive',
});

export const CLOUDFRONT_CONFIG = {
  // Origin configuration
  s3Origin: `${AWS_CONFIG.bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com`,
  
  // Cache behavior settings
  defaultTTL: 86400, // 24 hours
  maxTTL: 31536000, // 1 year
  minTTL: 0,
  
  // Cache settings by content type
  contentTypeTTL: {
    'image/*': 31536000, // 1 year
    'video/*': 31536000, // 1 year
    'audio/*': 31536000, // 1 year
    'application/pdf': 86400, // 24 hours
    'text/*': 3600, // 1 hour
  },
  
  // Allowed HTTP methods
  allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
  cachedMethods: ['GET', 'HEAD'],
  
  // Compression settings
  compress: true,
  
  // CORS configuration
  allowedOrigins: process.env.NODE_ENV === 'production' 
    ? [process.env.NEXT_PUBLIC_APP_URL!]
    : ['*'],
  allowedHeaders: ['Authorization', 'Origin', 'Content-Type'],
  
  // Security settings
  viewerProtocolPolicy: 'redirect-to-https',
  priceClass: process.env.NODE_ENV === 'production' 
    ? 'PriceClass_All' // Use all edge locations in production
    : 'PriceClass_100', // Use only North America and Europe edge locations in development
  
  // Error handling
  errorTTL: 300, // 5 minutes
  customErrorResponses: [
    {
      errorCode: 403,
      responseCode: 404,
      responsePagePath: '/404.html',
      errorCachingMinTTL: 300,
    },
    {
      errorCode: 404,
      responseCode: 404,
      responsePagePath: '/404.html',
      errorCachingMinTTL: 300,
    },
  ],
};

export async function createOrUpdateDistribution(distributionId?: string) {
  const startTime = performance.now();
  
  try {
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
        TrustedSigners: {
          Enabled: false,
          Quantity: 0,
        },
        FunctionAssociations: {
          Quantity: 0,
          Items: [],
        },
        LambdaFunctionAssociations: {
          Quantity: 0,
          Items: [],
        },
      },
      CacheBehaviors: {
        Quantity: 1,
        Items: [
          {
            PathPattern: '/media/*',
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
        ],
      },
      CustomErrorResponses: {
        Quantity: CLOUDFRONT_CONFIG.customErrorResponses.length,
        Items: CLOUDFRONT_CONFIG.customErrorResponses,
      },
      PriceClass: CLOUDFRONT_CONFIG.priceClass,
      Restrictions: {
        GeoRestriction: {
          RestrictionType: 'none',
          Quantity: 0,
        },
      },
      WebACLId: '',
      HttpVersion: 'http2',
      IsIPV6Enabled: true,
    };

    let result;
    if (distributionId) {
      // Update existing distribution
      const command = new UpdateDistributionCommand({
        Id: distributionId,
        DistributionConfig: distributionConfig,
        IfMatch: '*',
      });
      result = await cloudFrontClient.send(command);
      metrics.cdnUpdates.inc({ type: 'update' });
    } else {
      // Create new distribution
      const command = new CreateDistributionCommand({
        DistributionConfig: distributionConfig,
      });
      result = await cloudFrontClient.send(command);
      metrics.cdnUpdates.inc({ type: 'create' });
    }

    const duration = performance.now() - startTime;
    metrics.cdnOperationDuration.observe({ operation: distributionId ? 'update' : 'create' }, duration / 1000);

    return result;
  } catch (error) {
    console.error('Failed to create/update CloudFront distribution:', error);
    metrics.cdnErrors.inc({ operation: distributionId ? 'update' : 'create' });
    throw error;
  }
}

export async function invalidateCache(paths: string[]) {
  const startTime = performance.now();
  
  try {
    const command = new CreateInvalidationCommand({
      DistributionId: process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID!,
      InvalidationBatch: {
        Paths: {
          Quantity: paths.length,
          Items: paths.map(path => path.startsWith('/') ? path : `/${path}`),
        },
        CallerReference: Date.now().toString(),
      },
    });

    const result = await cloudFrontClient.send(command);
    
    const duration = performance.now() - startTime;
    metrics.cdnOperationDuration.observe({ operation: 'invalidate' }, duration / 1000);
    metrics.cdnInvalidations.inc({ count: paths.length });

    return result;
  } catch (error) {
    console.error('Failed to invalidate CloudFront cache:', error);
    metrics.cdnErrors.inc({ operation: 'invalidate' });
    throw error;
  }
} 