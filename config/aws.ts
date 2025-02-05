import { S3Client } from '@aws-sdk/client-s3';

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION || !process.env.AWS_BUCKET_NAME) {
  throw new Error('Missing required AWS environment variables');
}

export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const AWS_CONFIG = {
  bucketName: process.env.AWS_BUCKET_NAME,
  region: process.env.AWS_REGION,
  cdnDomain: process.env.AWS_CLOUDFRONT_DOMAIN,
}; 