export const DB_CONFIG = {
  write: process.env.DATABASE_URL || '',
  replicas: [
    // List of read replicas
    { url: process.env.DATABASE_REPLICA_1_URL || '' },
    { url: process.env.DATABASE_REPLICA_2_URL || '' },
  ].filter(replica => replica.url !== '') // Only include replicas with valid URLs
}; 