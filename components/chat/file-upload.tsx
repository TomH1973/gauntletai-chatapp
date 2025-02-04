import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, File, Image as ImageIcon } from 'lucide-react'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onUpload: (files: File[]) => Promise<string[]>
  maxFiles?: number
  maxSize?: number // in bytes
  accept?: Record<string, string[]>
  className?: string
}

interface UploadingFile {
  file: File
  progress: number
  preview?: string
}

export function FileUpload({
  onUpload,
  maxFiles = 5,
  maxSize = 5 * 1024 * 1024, // 5MB
  accept = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc', '.docx'],
  },
  className,
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      progress: 0,
      preview: file.type.startsWith('image/') 
        ? URL.createObjectURL(file)
        : undefined,
    }))

    setUploadingFiles(prev => [...prev, ...newFiles])

    try {
      const urls = await onUpload(acceptedFiles)
      // Update progress to 100% for uploaded files
      setUploadingFiles(prev =>
        prev.map((f, i) => ({
          ...f,
          progress: 100,
        }))
      )
    } catch (error) {
      console.error('Upload failed:', error)
      // Remove failed uploads
      setUploadingFiles(prev =>
        prev.filter(f => !acceptedFiles.includes(f.file))
      )
    }
  }, [onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept,
  })

  const removeFile = (index: number) => {
    setUploadingFiles(prev => {
      const newFiles = [...prev]
      if (prev[index].preview) {
        URL.revokeObjectURL(prev[index].preview)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer',
          isDragActive ? 'border-primary bg-primary/10' : 'border-muted',
          className
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          {isDragActive
            ? 'Drop files here...'
            : 'Drag & drop files here, or click to select'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Max {maxFiles} files, up to {Math.round(maxSize / 1024 / 1024)}MB each
        </p>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadingFiles.map((file, index) => (
            <div
              key={file.file.name + index}
              className="flex items-center gap-2 p-2 border rounded-lg"
            >
              {file.preview ? (
                <img
                  src={file.preview}
                  alt={file.file.name}
                  className="h-10 w-10 object-cover rounded"
                />
              ) : (
                <File className="h-10 w-10 p-2 border rounded" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{file.file.name}</p>
                <Progress value={file.progress} className="h-1 mt-1" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 