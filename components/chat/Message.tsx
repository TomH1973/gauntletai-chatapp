import React from 'react';
import { format } from 'date-fns';
import { User } from '@prisma/client';
import { FileGallery } from './FileGallery';
import { useFileDownload } from '@/hooks/useFileDownload';
import { cn } from '@/lib/utils';

interface MessageProps {
  id: string;
  content: string;
  createdAt: Date;
  user: User;
  attachments?: Array<{
    id: string;
    url: string;
    filename: string;
    mimeType: string;
    size: number;
    isPublic?: boolean;
  }>;
  isEdited?: boolean;
  className?: string;
}

export function Message({
  content,
  createdAt,
  user,
  attachments = [],
  isEdited,
  className,
}: MessageProps) {
  const { downloadFile, downloadProgress } = useFileDownload();

  const handleDownload = async (fileId: string) => {
    const file = attachments.find(f => f.id === fileId);
    if (!file) return;

    try {
      await downloadFile(fileId, file.url, file.filename);
    } catch (error) {
      console.error('Download failed:', error);
      // TODO: Show error toast
    }
  };

  return (
    <div className={cn('flex flex-col space-y-2', className)}>
      <div className="flex items-start space-x-2">
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
          <img
            src={user.image || `https://ui-avatars.com/api/?name=${user.name}`}
            alt={user.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline space-x-2">
            <span className="font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">
              {format(createdAt, 'p')}
            </span>
            {isEdited && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
          {attachments.length > 0 && (
            <div className="mt-2">
              <FileGallery
                files={attachments.map(file => ({
                  ...file,
                  downloadProgress: downloadProgress[file.id],
                }))}
                onDownload={handleDownload}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 