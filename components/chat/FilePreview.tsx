import React, { useState, useEffect } from 'react';
import { FileIcon, defaultStyles } from 'react-file-icon';
import { Document, Page } from 'react-pdf';
import { 
  Play, 
  File, 
  Image as ImageIcon, 
  FileText, 
  Music, 
  Archive,
  Download,
  ExternalLink,
  Maximize2,
  X,
  Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { cn } from '@/lib/utils';

interface FilePreviewProps {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  className?: string;
  onDownload?: () => void;
  isPublic?: boolean;
  downloadProgress?: number;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export function FilePreview({
  url,
  filename,
  mimeType,
  size,
  className,
  onDownload,
  isPublic = false,
  downloadProgress,
}: FilePreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pdfNumPages, setPdfNumPages] = useState<number>(0);
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const isDownloading = typeof downloadProgress === 'number';

  const DownloadButton = () => (
    <Button
      size="sm"
      variant="secondary"
      className="mr-2"
      onClick={onDownload}
      disabled={isDownloading}
    >
      {isDownloading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
    </Button>
  );

  // Image Preview
  if (mimeType.startsWith('image/')) {
    return (
      <Dialog>
        <div className={cn('relative group', className)}>
          <DialogTrigger asChild>
            <div className="relative cursor-pointer group">
              <img
                src={url}
                alt={filename}
                className="rounded-lg max-h-48 object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <Maximize2 className="w-6 h-6 text-white" />
              </div>
            </div>
          </DialogTrigger>
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DownloadButton />
            {isPublic && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => window.open(url, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
          </div>
          {isDownloading && (
            <div className="absolute bottom-0 left-0 right-0 bg-background/80 p-2">
              <Progress value={downloadProgress} className="h-1" />
              <p className="text-xs text-center mt-1">{downloadProgress}%</p>
            </div>
          )}
        </div>
        <DialogContent className="max-w-4xl w-full h-[80vh]">
          <div className="relative w-full h-full">
            <img
              src={url}
              alt={filename}
              className="w-full h-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // PDF Preview
  if (mimeType === 'application/pdf') {
    return (
      <div className={cn('relative group', className)}>
        <Dialog>
          <DialogTrigger asChild>
            <div className="cursor-pointer border rounded-lg p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10">
                  <FileIcon
                    extension={extension}
                    {...defaultStyles.pdf}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{filename}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(size)}
                  </p>
                </div>
                <Maximize2 className="w-5 h-5 text-muted-foreground" />
              </div>
              {isDownloading && (
                <div className="mt-2">
                  <Progress value={downloadProgress} className="h-1" />
                  <p className="text-xs text-center mt-1">{downloadProgress}%</p>
                </div>
              )}
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl w-full h-[80vh]">
            <Document
              file={url}
              onLoadSuccess={({ numPages }) => setPdfNumPages(numPages)}
              className="w-full h-full overflow-auto"
            >
              {Array.from(new Array(pdfNumPages), (_, index) => (
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  width={800}
                />
              ))}
            </Document>
          </DialogContent>
        </Dialog>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DownloadButton />
          {isPublic && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.open(url, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Video Preview
  if (mimeType.startsWith('video/')) {
    return (
      <div className={cn('relative group', className)}>
        <Dialog>
          <DialogTrigger asChild>
            <div className="relative cursor-pointer rounded-lg overflow-hidden">
              <video
                className="w-full max-h-48 object-cover"
                poster={`${url}#t=0.1`}
              >
                <source src={url} type={mimeType} />
              </video>
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Play className="w-12 h-12 text-white" />
              </div>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl w-full">
            <video controls className="w-full">
              <source src={url} type={mimeType} />
            </video>
          </DialogContent>
        </Dialog>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DownloadButton />
          {isPublic && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.open(url, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>
        {isDownloading && (
          <div className="absolute bottom-0 left-0 right-0 bg-background/80 p-2">
            <Progress value={downloadProgress} className="h-1" />
            <p className="text-xs text-center mt-1">{downloadProgress}%</p>
          </div>
        )}
      </div>
    );
  }

  // Audio Preview
  if (mimeType.startsWith('audio/')) {
    return (
      <div className={cn('relative group border rounded-lg p-4', className)}>
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10">
            <Music className="w-full h-full text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{filename}</p>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(size)}
            </p>
          </div>
          <audio controls className="max-w-[200px]">
            <source src={url} type={mimeType} />
          </audio>
        </div>
        {isDownloading && (
          <div className="mt-2">
            <Progress value={downloadProgress} className="h-1" />
            <p className="text-xs text-center mt-1">{downloadProgress}%</p>
          </div>
        )}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DownloadButton />
          {isPublic && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.open(url, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Default File Preview
  return (
    <div className={cn('relative group', className)}>
      <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10">
            {mimeType.includes('archive') ? (
              <Archive className="w-full h-full text-muted-foreground" />
            ) : (
              <FileIcon
                extension={extension}
                {...defaultStyles[extension as keyof typeof defaultStyles]}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{filename}</p>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(size)}
            </p>
          </div>
        </div>
        {isDownloading && (
          <div className="mt-2">
            <Progress value={downloadProgress} className="h-1" />
            <p className="text-xs text-center mt-1">{downloadProgress}%</p>
          </div>
        )}
      </div>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DownloadButton />
        {isPublic && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => window.open(url, '_blank')}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
} 