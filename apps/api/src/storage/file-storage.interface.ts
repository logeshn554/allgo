export interface SignedUrlOptions {
  action: 'read' | 'write';
  expiresInSeconds?: number;
  contentType?: string;
}

export interface StoredFileMetadata {
  storageKey: string;
  sizeBytes: number;
  mimeType: string;
  bucket: string;
  kmsEncrypted: boolean;
  kmsKeyId?: string;
  createdAt: Date;
}

export interface FileStorage {
  getStorageRoot(): string;
  resolveAndValidatePath(storageKey: string): string;
  validateFileContent(buffer: Buffer, declaredMimeType: string): void;
  scanFileWithClamAv(filePath: string): Promise<{ clean: boolean; error?: string }>;
  writeFile(targetPath: string, buffer: Buffer): Promise<void> | void;
  getFileBuffer(storageKey: string): Promise<Buffer> | Buffer;
  deleteFile(targetPath: string): Promise<void> | void;
  fileExists(targetPath: string): Promise<boolean> | boolean;

  // Cloud Storage & KMS additions
  generateSignedUploadUrl(storageKey: string, options?: SignedUrlOptions): Promise<string>;
  generateSignedDownloadUrl(storageKey: string, options?: SignedUrlOptions): Promise<string>;
  uploadBufferWithKms(
    storageKey: string,
    buffer: Buffer,
    declaredMimeType: string,
    kmsKeyId?: string
  ): Promise<StoredFileMetadata>;
  downloadBufferWithKms(storageKey: string): Promise<Buffer>;
}
