import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, AlertCircle, FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { bytesToSize } from '@/lib/utils';

interface FileUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  maxSize?: number;
  maxFiles?: number;
  accept?: Record<string, string[]>;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  error?: string;
}

export function FileUpload({
  onUpload,
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 5,
  accept,
  className
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [error, setError] = useState<string>();

  const handleUpload = useCallback(async (files: File[]) => {
    const newFiles = files.map(file => ({ file, progress: 0 }));
    setUploadingFiles(prev => [...prev, ...newFiles]);
    setError(undefined);

    try {
      // Create array of upload promises
      const uploadPromises = files.map(async (file, index) => {
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded * 100) / event.total);
            setUploadingFiles(prev => prev.map((f, i) => 
              i === index ? { ...f, progress } : f
            ));
          }
        });

        // Return a promise that resolves when the upload is complete
        return new Promise<void>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error('Upload failed'));
          xhr.open('POST', '/api/upload');
          xhr.send(formData);
        });
      });

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      
      // Notify parent component
      await onUpload(files);
      
      // Clear completed uploads after a delay
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.progress < 100));
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      // Mark failed uploads
      setUploadingFiles(prev => prev.map(f => 
        f.progress < 100 ? { ...f, error: 'Upload failed' } : f
      ));
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    maxSize,
    maxFiles,
    accept,
    disabled: uploadingFiles.some(f => f.progress < 100 && !f.error),
  });

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={`
          p-4 border-2 border-dashed rounded-lg text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted'}
          ${uploadingFiles.some(f => f.progress < 100 && !f.error) ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {isDragActive
            ? 'Drop files here'
            : `Drag & drop files here, or click to select files`}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Max size: {bytesToSize(maxSize)} • Max files: {maxFiles}
        </p>
      </div>

      {error && (
        <div className="mt-2 p-2 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadingFiles.map((f, i) => (
            <div
              key={`${f.file.name}-${i}`}
              className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
            >
              <FileIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-sm truncate">{f.file.name}</p>
                  <span className="text-xs text-muted-foreground">
                    {bytesToSize(f.file.size)}
                  </span>
                </div>
                <Progress value={f.progress} className="h-1" />
              </div>
              {f.error ? (
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
              ) : f.progress === 100 ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setUploadingFiles(prev => prev.filter((_, idx) => idx !== i))}
                >
                  <X className="w-4 h-4" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 