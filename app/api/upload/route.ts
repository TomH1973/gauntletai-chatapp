import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { fileStorage } from '@/lib/fileStorage';
import { FileScanner } from '@/lib/security/fileScanner';

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file size (e.g., 10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Scan file for viruses
    const scanResult = await FileScanner.scanFile(buffer);
    if (!scanResult.isClean) {
      return NextResponse.json(
        { error: 'File contains malware', threat: scanResult.threat },
        { status: 400 }
      );
    }
    
    const result = await fileStorage.saveFile(
      buffer,
      file.name,
      file.type,
      userId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 