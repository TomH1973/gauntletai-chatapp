import { DatabaseClientManager } from './clientManager';
import { DB_CONFIG } from './config';

// Create singleton instance
const dbManager = new DatabaseClientManager(DB_CONFIG.write, DB_CONFIG.replicas);

// Export read and write clients
export const db = {
  read: dbManager.read,
  write: dbManager.write,
  health: () => dbManager.checkHealth(),
  disconnect: () => dbManager.disconnect()
};

// Handle cleanup on shutdown
process.on('beforeExit', async () => {
  await dbManager.disconnect();
}); 