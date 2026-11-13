import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';

@Injectable()
export class FileStorageService {
  private storageRoot: string;
  public readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  constructor() {
    this.storageRoot = path.resolve(
      process.env.DOCUMENT_STORAGE_ROOT || path.join(os.tmpdir(), 'allgo_private_storage')
    );
    this.ensureStorageRootExists();
  }

  public getStorageRoot(): string {
    return this.storageRoot;
  }

  public setStorageRootForTesting(newRoot: string) {
    this.storageRoot = path.resolve(newRoot);
    this.ensureStorageRootExists();
  }

  public ensureStorageRootExists() {
    if (!fs.existsSync(this.storageRoot)) {
      fs.mkdirSync(this.storageRoot, { recursive: true, mode: 0o700 });
    }
  }

  public resolveAndValidatePath(storageKey: string): string {
    if (!storageKey || typeof storageKey !== 'string') {
      throw new ForbiddenException('Invalid storage key format');
    }

    const resolved = path.resolve(this.storageRoot, storageKey);
    const relative = path.relative(this.storageRoot, resolved);

    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new ForbiddenException('Path traversal attempt detected');
    }

    if (fs.existsSync(resolved)) {
      const stat = fs.lstatSync(resolved);
      if (stat.isSymbolicLink()) {
        throw new ForbiddenException('Symbolic links are strictly prohibited at storage paths');
      }
    }

    return resolved;
  }

  public validateFileContent(buffer: Buffer, declaredMimeType: string): void {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Empty file received');
    }

    if (buffer.length > this.MAX_FILE_SIZE) {
      throw new PayloadTooLargeException('Uploaded file exceeds 5 MB limit');
    }

    if (declaredMimeType === 'application/pdf') {
      const magic = buffer.subarray(0, 5).toString('ascii');
      if (magic !== '%PDF-') {
        throw new BadRequestException('Invalid PDF file signature (magic bytes mismatch)');
      }
      const tail = buffer.subarray(Math.max(0, buffer.length - 2048)).toString('ascii');
      if (!tail.includes('%%EOF')) {
        throw new BadRequestException('Corrupted or malformed PDF: missing %%EOF termination marker');
      }
    } else if (declaredMimeType === 'image/jpeg') {
      if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
        throw new BadRequestException('Invalid JPEG file signature (magic bytes mismatch)');
      }
      const hasJpegEnd = buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9;
      if (!hasJpegEnd) {
        throw new BadRequestException('Corrupted or truncated JPEG file: missing EOI marker');
      }
    } else if (declaredMimeType === 'image/png') {
      const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      if (!buffer.subarray(0, 8).equals(pngSignature)) {
        throw new BadRequestException('Invalid PNG file signature (magic bytes mismatch)');
      }
      const tail = buffer.subarray(Math.max(0, buffer.length - 64));
      if (!tail.includes(Buffer.from('IEND'))) {
        throw new BadRequestException('Corrupted or truncated PNG file: missing IEND chunk');
      }
    } else {
      throw new BadRequestException(`Unsupported MIME type: ${declaredMimeType}`);
    }
  }

  public async scanFileWithClamAv(filePath: string): Promise<{ clean: boolean; error?: string }> {
    const clamHost = process.env.CLAMAV_HOST || '127.0.0.1';
    const clamPort = parseInt(process.env.CLAMAV_PORT || '3310', 10);

    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2000);

      socket.connect(clamPort, clamHost, () => {
        socket.write(`SCAN ${filePath}\n`);
      });

      let response = '';
      socket.on('data', (data) => {
        response += data.toString();
      });

      socket.on('end', () => {
        if (response.includes('OK')) {
          resolve({ clean: true });
        } else {
          resolve({ clean: false, error: response.trim() || 'ClamAV flagged threat' });
        }
      });

      socket.on('error', (err) => {
        socket.destroy();
        resolve({ clean: false, error: `ClamAV scanner unavailable: ${err.message}` });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ clean: false, error: 'ClamAV scanner socket timeout' });
      });
    });
  }

  public getFileBuffer(storageKey: string): Buffer {
    const filePath = this.resolveAndValidatePath(storageKey);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Requested document file does not exist on storage');
    }
    return fs.readFileSync(filePath);
  }

  public writeFile(targetPath: string, buffer: Buffer): void {
    fs.writeFileSync(targetPath, buffer, { mode: 0o600 });
  }

  public deleteFile(targetPath: string): void {
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
  }

  public fileExists(targetPath: string): boolean {
    return fs.existsSync(targetPath);
  }
}
