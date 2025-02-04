import { createHash } from 'crypto';
import ClamAV from 'clamav.js';
import { prisma } from '../prisma';

const VIRUS_SCAN_ENABLED = process.env.VIRUS_SCAN_ENABLED === 'true';
const CLAM_AV_HOST = process.env.CLAM_AV_HOST || 'localhost';
const CLAM_AV_PORT = parseInt(process.env.CLAM_AV_PORT || '3310');

interface ScanResult {
  isClean: boolean;
  threat?: string;
  hash: string;
}

export class FileScanner {
  private static scanner: ClamAV;
  private static isInitialized = false;

  private static async initialize() {
    if (!VIRUS_SCAN_ENABLED) return;
    
    if (!this.isInitialized) {
      this.scanner = new ClamAV();
      await this.scanner.init({
        removeInfected: true,
        quarantineInfected: true,
        scanLog: null,
        debugMode: false,
        fileList: null,
        scanArchives: true,
        clamscan: {
          host: CLAM_AV_HOST,
          port: CLAM_AV_PORT,
          timeout: 60000,
          bypassTest: false,
        },
      });
      this.isInitialized = true;
    }
  }

  static async scanFile(buffer: Buffer): Promise<ScanResult> {
    // Always compute file hash
    const hash = createHash('sha256').update(buffer).digest('hex');

    // Check cache first
    const cachedResult = await prisma.fileScanResult.findUnique({
      where: { hash },
    });

    if (cachedResult) {
      return {
        isClean: cachedResult.isClean,
        threat: cachedResult.threat || undefined,
        hash,
      };
    }

    // If virus scanning is disabled, return clean result
    if (!VIRUS_SCAN_ENABLED) {
      await this.cacheResult(hash, true);
      return { isClean: true, hash };
    }

    try {
      await this.initialize();
      const { isInfected, viruses } = await this.scanner.scanBuffer(buffer);
      
      const result = {
        isClean: !isInfected,
        threat: isInfected ? viruses[0] : undefined,
        hash,
      };

      // Cache the result
      await this.cacheResult(hash, result.isClean, result.threat);

      return result;
    } catch (error) {
      console.error('File scanning error:', error);
      throw new Error('File scanning failed');
    }
  }

  private static async cacheResult(
    hash: string,
    isClean: boolean,
    threat?: string
  ) {
    await prisma.fileScanResult.create({
      data: {
        hash,
        isClean,
        threat,
        scannedAt: new Date(),
      },
    });
  }
} 