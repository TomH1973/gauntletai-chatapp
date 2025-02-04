import React from 'react';
import { FilePreview } from './FilePreview';
import { cn } from '@/lib/utils';

interface FileGalleryProps {
  files: Array<{
    id: string;
    url: string;
    filename: string;
    mimeType: string;
    size: number;
    isPublic?: boolean;
  }>;
  className?: string;
  onDownload?: (fileId: string) => void;
}

export function FileGallery({
  files,
  className,
  onDownload,
}: FileGalleryProps) {
  const imageFiles = files.filter(f => f.mimeType.startsWith('image/'));
  const otherFiles = files.filter(f => !f.mimeType.startsWith('image/'));

  return (
    <div className={cn('space-y-4', className)}>
      {imageFiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {imageFiles.map(file => (
            <FilePreview
              key={file.id}
              url={file.url}
              filename={file.filename}
              mimeType={file.mimeType}
              size={file.size}
              isPublic={file.isPublic}
              onDownload={() => onDownload?.(file.id)}
            />
          ))}
        </div>
      )}
      {otherFiles.length > 0 && (
        <div className="space-y-2">
          {otherFiles.map(file => (
            <FilePreview
              key={file.id}
              url={file.url}
              filename={file.filename}
              mimeType={file.mimeType}
              size={file.size}
              isPublic={file.isPublic}
              onDownload={() => onDownload?.(file.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
} 