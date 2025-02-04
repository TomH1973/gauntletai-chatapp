import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CloudStorage } from '@/lib/storage/cloudStorage';
import { FileScanner } from '@/lib/security/fileScanner';
import { prisma } from '@/lib/prisma';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
};

/**
 * @route POST /api/upload
 * @description Handles file uploads with security scanning and storage
 * 
 * @param {Object} request - Next.js request object
 * @param {FormData} request.formData - Form data containing the file
 * @param {File} request.formData.file - The file to upload
 * 
 * @returns {Promise<NextResponse>} JSON response containing the uploaded file details
 * @throws {401} If user is not authenticated
 * @throws {400} If no file is provided or file is too large
 * @throws {400} If file fails security scan
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const messageId = formData.get('messageId') as string;
    const isPublic = formData.get('isPublic') === 'true';
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Scan file for malware
    const scanResult = await FileScanner.scanFile(buffer);
    
    if (!scanResult.isClean) {
      return NextResponse.json({ error: 'File failed security scan' }, { status: 400 });
    }

    const cloudStorage = CloudStorage.getInstance();
    const { url: fileUrl, attachment } = await cloudStorage.uploadFile(
      buffer,
      file.name,
      file.type,
      session.user.id,
      messageId,
      isPublic
    );

    return NextResponse.json({
      id: attachment.id,
      url: fileUrl,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      isPublic,
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'File upload failed' },
      { status: 500 }
    );
  }
} 