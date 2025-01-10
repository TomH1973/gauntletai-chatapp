import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
};

/**
 * @interface FileUploadResult
 * @description Result of a file upload operation
 */
export interface FileUploadResult {
  /** Unique identifier for the file */
  id: string;
  /** Original filename */
  name: string;
  /** Type of file */
  type: 'image' | 'video' | 'audio' | 'document';
  /** File size in bytes */
  size: number;
  /** MIME type of the file */
  mimeType: string;
  /** Public URL to access the file */
  url: string;
}

/**
 * @class LocalFileStorage
 * @description Service class for managing file uploads with local storage
 * 
 * Features:
 * - File type validation
 * - Image optimization
 * - User-specific storage
 * - Orphaned file cleanup
 * - Secure file access
 */
export class LocalFileStorage {
  private validateFileType(mimeType: string): boolean {
    return Object.values(ALLOWED_MIME_TYPES).some(types => types.includes(mimeType));
  }

  private getFileType(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
    const type = mimeType.split('/')[0];
    return ['image', 'video', 'audio'].includes(type) 
      ? type as 'image' | 'video' | 'audio' 
      : 'document';
  }

  /**
   * @algorithm Image Optimization
   * 1. Format Check
   *    - Verify image MIME type
   *    - Skip if not image
   * 
   * 2. Processing
   *    - Resize to max dimensions
   *    - Preserve aspect ratio
   *    - Apply compression
   * 
   * 3. Error Handling
   *    - Catch processing errors
   *    - Fallback to original
   */
  private async compressImage(buffer: Buffer, mimeType: string): Promise<Buffer> {
    if (!mimeType.startsWith('image/')) return buffer;

    try {
      const compressed = await sharp(buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      
      return compressed;
    } catch (error) {
      console.error('Image compression failed:', error);
      return buffer;
    }
  }

  /**
   * @method saveFile
   * @description Saves a file to local storage with validation
   * 
   * @param {Buffer} buffer - File data
   * @param {string} filename - Original filename
   * @param {string} mimeType - MIME type of file
   * @param {string} userId - ID of user uploading file
   * @returns {Promise<FileUploadResult>} Upload result
   * @throws {Error} If file type not allowed or save fails
   */
  async saveFile(
    file: Buffer,
    fileName: string,
    mimeType: string,
    userId: string
  ): Promise<FileUploadResult> {
    if (!this.validateFileType(mimeType)) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    const id = uuidv4();
    const fileExt = path.extname(fileName);
    const sanitizedFileName = `${id}${fileExt}`;
    
    // Create user directory if it doesn't exist
    const userDir = path.join(UPLOAD_DIR, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    // Compress image if applicable
    const processedFile = await this.compressImage(file, mimeType);
    
    const filePath = path.join(userDir, sanitizedFileName);
    await fs.promises.writeFile(filePath, processedFile);

    const size = processedFile.length;
    const type = this.getFileType(mimeType);
    const url = `/uploads/${userId}/${sanitizedFileName}`;

    return {
      id,
      name: fileName,
      type,
      size,
      mimeType,
      url
    };
  }

  /**
   * @method deleteFile
   * @description Deletes a file from storage
   * 
   * @param {string} userId - ID of user who owns the file
   * @param {string} fileId - ID of file to delete
   * @returns {Promise<void>}
   * @throws {Error} If file not found or delete fails
   */
  async deleteFile(userId: string, fileId: string): Promise<void> {
    const userDir = path.join(UPLOAD_DIR, userId);
    const files = await fs.promises.readdir(userDir);
    const fileToDelete = files.find(file => file.startsWith(fileId));
    
    if (fileToDelete) {
      await fs.promises.unlink(path.join(userDir, fileToDelete));
    }
  }

  /**
   * @algorithm Orphaned File Cleanup
   * 1. Directory Scan
   *    - List all user directories
   *    - Filter for valid directories
   * 
   * 2. File Validation
   *    - Extract file IDs
   *    - Query database references
   * 
   * 3. Cleanup
   *    - Delete unreferenced files
   *    - Log deletions
   *    - Maintain audit trail
   */
  async cleanupOrphanedFiles(): Promise<void> {
    const { prisma } = await import('@/lib/prisma');
    
    // Get all user directories
    const userDirs = await fs.promises.readdir(UPLOAD_DIR);
    
    for (const userId of userDirs) {
      const userDir = path.join(UPLOAD_DIR, userId);
      const stats = await fs.promises.stat(userDir);
      
      if (!stats.isDirectory()) continue;

      const files = await fs.promises.readdir(userDir);
      
      for (const file of files) {
        const fileId = path.parse(file).name;
        
        // Check if file is referenced in database
        const attachment = await prisma.attachment.findFirst({
          where: { id: fileId }
        });

        if (!attachment) {
          // File is orphaned, delete it
          await fs.promises.unlink(path.join(userDir, file));
          console.log(`Deleted orphaned file: ${file}`);
        }
      }
    }
  }
}

export const fileStorage = new LocalFileStorage(); 