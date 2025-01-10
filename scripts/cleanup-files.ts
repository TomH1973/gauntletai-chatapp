import { fileStorage } from '@/lib/fileStorage';

async function cleanup() {
  try {
    console.log('Starting file cleanup...');
    await fileStorage.cleanupOrphanedFiles();
    console.log('File cleanup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during file cleanup:', error);
    process.exit(1);
  }
}

cleanup(); 