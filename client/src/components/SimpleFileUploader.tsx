import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, Upload, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadedFile {
  url: string;
  filename: string;
  originalName: string;
}

interface SimpleFileUploaderProps {
  onFilesSelected?: (files: File[]) => void;
  onUploadComplete?: (uploadedFiles: UploadedFile[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // em bytes
  acceptedTypes?: string[];
  disabled?: boolean;
  buttonText?: string;
  buttonClassName?: string;
  showConfirmButton?: boolean;
  uploadEndpoint?: string;
}

export function SimpleFileUploader({
  onFilesSelected,
  onUploadComplete,
  maxFiles = 5,
  maxFileSize = 10485760, // 10MB
  acceptedTypes = ["*/*"],
  disabled = false,
  buttonText = "Anexar Arquivo",
  buttonClassName = "",
  showConfirmButton = true,
  uploadEndpoint = "/api/upload",
}: SimpleFileUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const validateFile = (file: File): boolean => {
    if (file.size > maxFileSize) {
      toast({
        title: "Erro",
        description: `Arquivo muito grande. Tamanho máximo: ${formatFileSize(maxFileSize)}`,
        variant: "destructive",
      });
      return false;
    }

    if (acceptedTypes.length > 0 && !acceptedTypes.includes("*/*")) {
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      const mimeType = file.type;

      const isTypeAccepted = acceptedTypes.some(type => 
        type === mimeType || 
        type === fileExtension ||
        type.endsWith("/*") && mimeType.startsWith(type.replace("/*", ""))
      );

      if (!isTypeAccepted) {
        toast({
          title: "Erro",
          description: `Tipo de arquivo não permitido. Tipos aceitos: ${acceptedTypes.join(", ")}`,
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    if (selectedFiles.length + files.length > maxFiles) {
      toast({
        title: "Erro",
        description: `Máximo de ${maxFiles} arquivo(s) permitido(s)`,
        variant: "destructive",
      });
      return;
    }

    const validFiles = files.filter(validateFile);

    if (validFiles.length > 0) {
      const newFiles = [...selectedFiles, ...validFiles];
      setSelectedFiles(newFiles);
      onFilesSelected?.(newFiles);

      toast({
        title: "Sucesso",
        description: `${validFiles.length} arquivo(s) selecionado(s)`,
      });
    }

    // Limpar o input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesSelected?.(newFiles);
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    onFilesSelected?.([]);
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      const uploadResults: UploadedFile[] = [];

      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(uploadEndpoint, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Falha no upload do arquivo ${file.name}`);
        }

        const result = await response.json();
        uploadResults.push({
          url: result.url,
          filename: result.filename,
          originalName: result.originalName
        });
      }

      setUploadedFiles(uploadResults);
      setSelectedFiles([]);
      onUploadComplete?.(uploadResults);

      toast({
        title: "Sucesso",
        description: `${uploadResults.length} arquivo(s) enviado(s) com sucesso!`,
      });

    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro",
        description: "Erro ao fazer upload dos arquivos",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const openFileDialog = () => {
    if (fileInputRef.current && !disabled) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(",")}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* Upload button */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={openFileDialog}
          disabled={disabled || selectedFiles.length >= maxFiles}
          className={`${buttonClassName}`}
          data-testid="button-file-upload"
        >
          <Paperclip className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>

        {showConfirmButton && selectedFiles.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={uploadFiles}
            disabled={isUploading}
            data-testid="button-confirm-upload"
            className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            {isUploading ? (
              <>
                <Upload className="mr-1 h-3 w-3 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="mr-1 h-3 w-3" />
                Confirmar
              </>
            )}
          </Button>
        )}
      </div>

      {/* Selected files list */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Arquivos selecionados ({selectedFiles.length}/{maxFiles})
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAllFiles}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar todos
            </Button>
          </div>

          <div className="space-y-1 max-h-32 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-2 bg-gray-50 rounded border text-sm"
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="truncate">{file.name}</span>
                  <span className="text-gray-500 flex-shrink-0">
                    ({formatFileSize(file.size)})
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="ml-2 text-red-600 hover:text-red-700 flex-shrink-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm text-green-600 font-medium">
            <CheckCircle className="inline mr-1 h-3 w-3" />
            Arquivo(s) enviado(s) com sucesso:
          </p>
          {uploadedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded text-sm">
              <span className="text-green-700">{file.originalName}</span>
              <span className="text-xs text-green-600">✓ Enviado</span>
            </div>
          ))}
        </div>
      )}

      {/* Upload info */}
      <div className="text-xs text-gray-500">
        Máximo {maxFiles} arquivo(s), até {formatFileSize(maxFileSize)} cada
      </div>
    </div>
  );
}