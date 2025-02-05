import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { s3Client, AWS_CONFIG } from '../../config/aws';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';

const FileType = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  AUDIO: 'AUDIO',
  DOCUMENT: 'DOCUMENT',
  ARCHIVE: 'ARCHIVE',
  OTHER: 'OTHER',
} as const;

type FileType = typeof FileType[keyof typeof FileType];

const MAX_IMAGE_SIZE = 1920;
const IMAGE_QUALITY = 80;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/zip',
];

export class CloudStorage {
  private static instance: CloudStorage;

  private constructor() {}

  public static getInstance(): CloudStorage {
    if (!CloudStorage.instance) {
      CloudStorage.instance = new CloudStorage();
    }
    return CloudStorage.instance;
  }

  private async optimizeImage(buffer: Buffer, mimeType: string): Promise<Buffer> {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image metadata');
    }

    if (metadata.width > MAX_IMAGE_SIZE || metadata.height > MAX_IMAGE_SIZE) {
      image.resize(MAX_IMAGE_SIZE, MAX_IMAGE_SIZE, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    switch (mimeType) {
      case 'image/jpeg':
        return image.jpeg({ quality: IMAGE_QUALITY }).toBuffer();
      case 'image/png':
        return image.png({ quality: IMAGE_QUALITY }).toBuffer();
      case 'image/webp':
        return image.webp({ quality: IMAGE_QUALITY }).toBuffer();
      default:
        return buffer;
    }
  }

  private getFileType(mimeType: string): FileType {
    if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return FileType.IMAGE;
    if (mimeType === 'application/pdf') return FileType.DOCUMENT;
    if (mimeType.includes('word')) return FileType.DOCUMENT;
    if (mimeType === 'text/plain') return FileType.DOCUMENT;
    if (mimeType === 'application/zip') return FileType.ARCHIVE;
    return FileType.OTHER;
  }

  public async uploadFile(file: Buffer, originalFilename: string, mimeType: string, userId: string, messageId?: string, isPublic: boolean = false): Promise<{ url: string; attachment: any }> {
    if (!ALLOWED_FILE_TYPES.includes(mimeType)) {
      throw new Error('File type not allowed');
    }

    let processedBuffer = file;
    if (ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      processedBuffer = await this.optimizeImage(file, mimeType);
    }

    const fileExtension = originalFilename.split('.').pop() || '';
    const key = `${userId}/${randomUUID()}.${fileExtension}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: AWS_CONFIG.bucketName,
        Key: key,
        Body: processedBuffer,
        ContentType: mimeType,
      })
    );

    const fileUrl = AWS_CONFIG.cdnDomain 
      ? `https://${AWS_CONFIG.cdnDomain}/${key}`
      : `https://${AWS_CONFIG.bucketName}.s3.${AWS_CONFIG.region}.amazonaws.com/${key}`;

    const attachment = await prisma.attachment.create({
      data: {
        filename: originalFilename,
        key,
        url: fileUrl,
        size: processedBuffer.length,
        mimeType,
        fileType: this.getFileType(mimeType),
        isPublic,
        uploader: { connect: { id: userId } },
        ...(messageId && { message: { connect: { id: messageId } } }),
      },
    });

    return { url: fileUrl, attachment };
  }

  public async deleteFile(key: string, userId: string): Promise<void> {
    const attachment = await prisma.attachment.findFirst({
      where: { key, uploaderId: userId },
    });

    if (!attachment) {
      throw new Error('File not found or unauthorized');
    }

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: AWS_CONFIG.bucketName,
        Key: key,
      })
    );

    await prisma.attachment.update({
      where: { id: attachment.id },
      data: { isDeleted: true },
    });
  }

  public async generateSignedUrl(key: string, userId: string): Promise<string> {
    const attachment = await prisma.attachment.findFirst({
      where: { key, uploaderId: userId },
    });

    if (!attachment) {
      throw new Error('File not found or unauthorized');
    }

    const command = new GetObjectCommand({
      Bucket: AWS_CONFIG.bucketName,
      Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn: 3600 });
  }
} 