import { useState, useCallback, useRef } from "react";
import { Upload, FileImage, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface FileWithProgress {
  file: File;
  progress: number;
  processing: boolean;
}

interface UploadZoneProps {
  onUpload: (files: File[]) => void;
  uploadedCount?: number;
}

export function UploadZone({ onUpload, uploadedCount = 0 }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processedRef = useRef(false);

  const processFiles = useCallback((selectedFiles: File[]) => {
    const newFiles = selectedFiles.map(file => ({
      file,
      progress: 0,
      processing: true
    }));
    
    setFiles(newFiles);
    processedRef.current = false;

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 15;
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        setFiles(prev => prev.map(f => ({ ...f, progress: 100, processing: false })));
        
        if (!processedRef.current) {
          processedRef.current = true;
          const allFiles = newFiles.map(f => f.file);
          onUpload(allFiles);
          setFiles([]);
        }
      } else {
        setFiles(prev => prev.map(f => ({ ...f, progress: currentProgress })));
      }
    }, 80);
  }, [onUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith("image/") || file.name.endsWith(".dcm")
    );
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, [processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const isProcessing = files.some(f => f.processing);

  return (
    <Card className="p-8">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-md transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="file-upload"
          className="hidden"
          accept="image/*,.dcm"
          multiple
          onChange={handleFileInput}
          data-testid="input-file-upload"
        />
        
        {!isProcessing ? (
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center justify-center py-16 cursor-pointer"
          >
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2" data-testid="text-upload-instruction">
              Drop MRI scans here or click to browse
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Select multiple files for batch upload
            </p>
            <div className="flex gap-2 mb-4">
              <Badge variant="secondary">DICOM</Badge>
              <Badge variant="secondary">JPG</Badge>
              <Badge variant="secondary">PNG</Badge>
            </div>
            {uploadedCount > 0 && (
              <Badge variant="default" className="mt-2" data-testid="badge-uploaded-count">
                {uploadedCount} uploaded this session
              </Badge>
            )}
          </label>
        ) : (
          <div className="py-8 px-4">
            <div className="flex items-center gap-2 mb-4">
              <FileImage className="h-5 w-5 text-primary" />
              <span className="font-medium" data-testid="text-files-count">
                Processing {files.length} file{files.length !== 1 ? 's' : ''}...
              </span>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {files.map((fileData, index) => (
                <div
                  key={`${fileData.file.name}-${index}`}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-md"
                  data-testid={`file-item-${index}`}
                >
                  <FileImage className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fileData.file.name}</p>
                    <Progress value={fileData.progress} className="h-1 mt-1" />
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {fileData.progress}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
