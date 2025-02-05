import { createOrUpdateDistribution } from '../config/cloudfront';

async function setupCDN() {
  try {
    console.log('Setting up CloudFront distribution...');
    
    // Create or update the distribution
    await createOrUpdateDistribution();
    
    console.log('CloudFront distribution setup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up CloudFront distribution:', error);
    process.exit(1);
  }
}

setupCDN(); 