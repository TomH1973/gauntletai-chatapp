import { FileType } from '@prisma/client';
import { prisma } from '../prisma';
import { ResourceIsolation } from '../auth/resourceIsolation';

const ALLOWED_FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  VIDEO: ['video/mp4', 'video/webm'],
  AUDIO: ['audio/mp3', 'audio/wav', 'audio/ogg'],
  DOCUMENT: ['application/pdf', 'text/plain', 'application/msword'],
  OTHER: []
} as const;

const MAX_FILE_SIZES = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  VIDEO: 100 * 1024 * 1024, // 100MB
  AUDIO: 50 * 1024 * 1024, // 50MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  OTHER: 1 * 1024 * 1024 // 1MB
} as const;

export class FileStorage {
  // Validate file before upload
  static validateFile(
    filename: string,
    mimeType: string,
    size: number
  ): { isValid: boolean; fileType: FileType; error?: string } {
    // Determine file type from mime type
    const fileType = Object.entries(ALLOWED_FILE_TYPES).find(([_, types]) =>
      types.includes(mimeType)
    )?.[0] as FileType | undefined ?? 'OTHER';

    // Check file size
    if (size > MAX_FILE_SIZES[fileType]) {
      return {
        isValid: false,
        fileType,
        error: `File size exceeds maximum allowed size for ${fileType}`
      };
    }

    // Check if mime type is allowed
    if (fileType !== 'OTHER' && !ALLOWED_FILE_TYPES[fileType].includes(mimeType)) {
      return {
        isValid: false,
        fileType,
        error: `File type ${mimeType} is not allowed`
      };
    }

    return { isValid: true, fileType };
  }

  // Create attachment record
  static async createAttachment(
    messageId: string,
    uploaderId: string,
    file: {
      filename: string;
      mimeType: string;
      size: number;
      url: string;
      key: string;
    }
  ) {
    const validation = this.validateFile(file.filename, file.mimeType, file.size);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    return prisma.attachment.create({
      data: {
        filename: file.filename,
        fileType: validation.fileType,
        mimeType: file.mimeType,
        size: file.size,
        url: file.url,
        key: file.key,
        messageId,
        uploaderId
      }
    });
  }

  // Validate access to attachment
  static async validateAccess(attachmentId: string, userId: string): Promise<boolean> {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      select: {
        isPublic: true,
        uploaderId: true,
        messageId: true,
        message: {
          select: {
            threadId: true
          }
        }
      }
    });

    if (!attachment) {
      return false;
    }

    // Public files are accessible to everyone
    if (attachment.isPublic) {
      return true;
    }

    // File uploader always has access
    if (attachment.uploaderId === userId) {
      return true;
    }

    // Check thread access for private files
    return ResourceIsolation.validateThreadAccess(attachment.message.threadId, userId);
  }

  // Get secure URL for attachment
  static async getSecureUrl(attachmentId: string, userId: string): Promise<string> {
    const hasAccess = await this.validateAccess(attachmentId, userId);
    if (!hasAccess) {
      throw new Error('Access denied to attachment');
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      select: { url: true }
    });

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // In a real implementation, this would generate a signed URL with expiration
    return attachment.url;
  }

  // Soft delete attachment
  static async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
    const hasAccess = await this.validateAccess(attachmentId, userId);
    if (!hasAccess) {
      throw new Error('Access denied to attachment');
    }

    await prisma.attachment.update({
      where: { id: attachmentId },
      data: { isDeleted: true }
    });
  }
} 