import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileIcon, DownloadIcon } from 'lucide-react';
import type { ProgressMap } from '@/hooks/useFileDownload';

interface FileGalleryProps {
  files: Array<{
    id: string;
    url: string;
    filename: string;
    fileType: string;
  }>;
  onDownload: (url: string) => Promise<void>;
  downloadProgress: ProgressMap;
}

export function FileGallery({ files, onDownload, downloadProgress }: FileGalleryProps) {
  return (
    <div className="flex flex-col gap-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
        >
          <FileIcon className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-sm truncate">{file.filename}</span>
          {downloadProgress[file.id] !== undefined ? (
            <Progress value={downloadProgress[file.id]} className="w-20" />
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDownload(file.url)}
            >
              <DownloadIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
} 