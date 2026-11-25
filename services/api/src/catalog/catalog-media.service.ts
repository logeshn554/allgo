import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Response } from 'express';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class CatalogMediaService {
  private readonly logger = new Logger(CatalogMediaService.name);
  private storageRoot: string;
  public readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  constructor(private readonly db: DatabaseService) {
    this.storageRoot = path.resolve(
      process.env.CATALOG_STORAGE_ROOT ||
        path.join(
          process.env.DOCUMENT_STORAGE_ROOT || path.join(os.tmpdir(), 'allgo_private_storage'),
          'catalog_images',
        ),
    );
    this.ensureStorageRootExists();
  }

  private ensureStorageRootExists() {
    try {
      if (!fs.existsSync(this.storageRoot)) {
        fs.mkdirSync(this.storageRoot, { recursive: true });
      }
    } catch (err: any) {
      this.logger.error(`Failed to initialize catalog media directory: ${err.message}`);
    }
  }

  public getStorageRoot(): string {
    return this.storageRoot;
  }

  /**
   * Validate image buffer size, MIME, and magic bytes
   */
  public validateImage(
    buffer: Buffer,
    declaredMimeType?: string,
  ): { mimeType: string; extension: string } {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Empty image payload');
    }

    if (buffer.length > this.MAX_FILE_SIZE) {
      throw new PayloadTooLargeException(
        `Image exceeds maximum allowed size of 5 MB (actual: ${buffer.length} bytes)`,
      );
    }

    let detectedMime: string | null = null;
    let ext = 'jpg';

    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      detectedMime = 'image/jpeg';
      ext = 'jpg';
    } else if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      detectedMime = 'image/png';
      ext = 'png';
    } else if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      detectedMime = 'image/webp';
      ext = 'webp';
    }

    if (!detectedMime) {
      throw new BadRequestException(
        'Unsupported or invalid image format. Allowed formats: JPEG, PNG, WEBP',
      );
    }

    if (declaredMimeType && declaredMimeType.toLowerCase() !== detectedMime) {
      if (!(declaredMimeType.toLowerCase() === 'image/jpg' && detectedMime === 'image/jpeg')) {
        throw new BadRequestException(
          `Image content mismatch: header declared '${declaredMimeType}' but magic bytes indicate '${detectedMime}'`,
        );
      }
    }

    return { mimeType: detectedMime, extension: ext };
  }

  /**
   * Upload and associate an image to a merchant product
   */
  async uploadProductImage(
    userId: string,
    productId: string,
    buffer: Buffer,
    declaredMime?: string,
  ): Promise<{ storageKey: string; imageUrl: string; images: string[] }> {
    const pCheck = await this.db.query(
      `SELECT i.id, i.image_url, i.images, m.owner_id
       FROM items i
       JOIN categories c ON c.id = i.category_id
       JOIN catalogs cat ON cat.id = c.catalog_id
       JOIN outlets o ON o.id = cat.outlet_id
       JOIN merchants m ON m.id = o.merchant_id
       WHERE i.id = $1;`,
      [productId],
    );

    if (pCheck.rows.length === 0) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    if (pCheck.rows[0].owner_id !== userId) {
      throw new ForbiddenException('You do not own this product');
    }

    const { mimeType, extension } = this.validateImage(buffer, declaredMime);

    const uniqueId = crypto.randomUUID();
    const storageKey = `${uniqueId}.${extension}`;
    const filePath = path.join(this.storageRoot, storageKey);

    this.ensureStorageRootExists();
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/v1/customer/catalog/images/${storageKey}`;
    const currentImages: string[] =
      typeof pCheck.rows[0].images === 'string'
        ? JSON.parse(pCheck.rows[0].images)
        : pCheck.rows[0].images || [];

    currentImages.push(publicUrl);
    const primaryImage = pCheck.rows[0].image_url || publicUrl;

    await this.db.query(
      `UPDATE items
       SET image_url = $1,
           images = $2,
           updated_at = NOW()
       WHERE id = $3;`,
      [primaryImage, JSON.stringify(currentImages), productId],
    );

    return {
      storageKey,
      imageUrl: publicUrl,
      images: currentImages,
    };
  }

  /**
   * Remove an associated image from a product (with disk orphan cleanup)
   */
  async deleteProductImage(
    userId: string,
    productId: string,
    storageKey: string,
  ): Promise<{ success: boolean; images: string[] }> {
    const pCheck = await this.db.query(
      `SELECT i.id, i.image_url, i.images, m.owner_id
       FROM items i
       JOIN categories c ON c.id = i.category_id
       JOIN catalogs cat ON cat.id = c.catalog_id
       JOIN outlets o ON o.id = cat.outlet_id
       JOIN merchants m ON m.id = o.merchant_id
       WHERE i.id = $1;`,
      [productId],
    );

    if (pCheck.rows.length === 0) throw new NotFoundException(`Product ${productId} not found`);
    if (pCheck.rows[0].owner_id !== userId)
      throw new ForbiddenException('You do not own this product');

    const sanitizedKey = path.basename(storageKey);
    const targetUrl = `/v1/customer/catalog/images/${sanitizedKey}`;

    const currentImages: string[] =
      typeof pCheck.rows[0].images === 'string'
        ? JSON.parse(pCheck.rows[0].images)
        : pCheck.rows[0].images || [];

    const updatedImages = currentImages.filter((url) => !url.includes(sanitizedKey));
    const newPrimary =
      pCheck.rows[0].image_url === targetUrl
        ? updatedImages.length > 0
          ? updatedImages[0]
          : null
        : pCheck.rows[0].image_url;

    await this.db.query(
      `UPDATE items SET image_url = $1, images = $2, updated_at = NOW() WHERE id = $3;`,
      [newPrimary, JSON.stringify(updatedImages), productId],
    );

    const filePath = path.join(this.storageRoot, sanitizedKey);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to clean up image file on disk: ${err.message}`);
    }

    return {
      success: true,
      images: updatedImages,
    };
  }

  /**
   * Safe public catalog image delivery
   * Enforces directory traversal defense and serves with proper headers
   */
  public serveCatalogImage(storageKey: string, res: Response) {
    if (
      !storageKey ||
      storageKey.includes('..') ||
      storageKey.includes('/') ||
      storageKey.includes('\\')
    ) {
      throw new BadRequestException('Invalid storage key');
    }

    const sanitizedKey = path.basename(storageKey);
    const filePath = path.join(this.storageRoot, sanitizedKey);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Catalog image not found');
    }

    const ext = path.extname(sanitizedKey).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    if (ext === '.webp') mimeType = 'image/webp';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  }
}
