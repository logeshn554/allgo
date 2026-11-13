import {
  Controller,
  Post,
  Put,
  Get,
  Param,
  Body,
  Req,
  Res,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { StorageService } from './storage.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CreateUploadTicketDto } from './dto/create-upload-ticket.dto.js';
import { DatabaseService } from '../database/database.service.js';

@ApiTags('documents')
@Controller(['v1/documents', 'v1/storage'])
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StorageController {
  constructor(
    private readonly storageService: StorageService,
    private readonly db: DatabaseService
  ) {}

  @Post('upload-ticket')
  @ApiOperation({ summary: 'Generate a short-lived document upload ticket' })
  @ApiResponse({ status: 201, description: 'Upload ticket created' })
  async createTicket(@Req() req: any, @Body() dto: CreateUploadTicketDto) {
    return this.storageService.createTicket(req.user.userId, dto);
  }

  @Post('upload/:ticketId')
  @Put('upload/:ticketId')
  @ApiOperation({ summary: 'Upload document binary data for an active upload ticket' })
  @ApiResponse({ status: 200, description: 'File validated and stored' })
  async uploadFile(@Req() req: any, @Param('ticketId') ticketId: string) {
    // In express, raw body buffer or chunk stream
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const fullBuffer = Buffer.concat(chunks);
    return this.storageService.saveUploadedFile(ticketId, req.user.userId, fullBuffer);
  }

  @Get(['download/:storageKey', 'documents/:storageKey'])
  @ApiOperation({ summary: 'Stream authenticated document (enforces owner or admin check)' })
  @ApiResponse({ status: 200, description: 'Document binary stream' })
  async downloadFile(
    @Req() req: any,
    @Param('storageKey') storageKey: string,
    @Res() res: Response
  ) {
    const userId = req.user.userId;
    const roles: string[] = req.user.roles || [];
    const isAdmin = roles.includes('ADMIN');

    // If not admin, verify ownership via partner_documents, merchant_documents, or document_upload_tickets
    if (!isAdmin) {
      let isOwner = false;
      try {
        const ticketRes = await this.db.query(
          `SELECT uploader_user_id FROM document_upload_tickets WHERE storage_key = $1;`,
          [storageKey]
        );
        if (ticketRes.rows.length > 0 && ticketRes.rows[0].uploader_user_id === userId) {
          isOwner = true;
        }

        if (!isOwner) {
          const partnerDocRes = await this.db.query(
            `SELECT p.user_id FROM partner_documents pd
             JOIN partners p ON p.id = pd.partner_id
             WHERE pd.storage_key = $1;`,
            [storageKey]
          );
          if (partnerDocRes.rows.length > 0 && partnerDocRes.rows[0].user_id === userId) {
            isOwner = true;
          }
        }

        if (!isOwner) {
          const merchantDocRes = await this.db.query(
            `SELECT m.owner_id FROM merchant_documents md
             JOIN merchants m ON m.id = md.merchant_id
             WHERE md.storage_key = $1;`,
            [storageKey]
          );
          if (merchantDocRes.rows.length > 0 && merchantDocRes.rows[0].owner_id === userId) {
            isOwner = true;
          }
        }
      } catch {
        // Fallback for in-memory or offline tickets
        const ticket = await this.storageService.getTicket(storageKey);
        if (ticket && ticket.uploader_user_id === userId) {
          isOwner = true;
        }
      }

      if (!isOwner) {
        throw new ForbiddenException('You do not have permission to access or download this document');
      }
    }

    const buffer = this.storageService.getFileBuffer(storageKey);
    const mimeType = storageKey.endsWith('.pdf')
      ? 'application/pdf'
      : storageKey.endsWith('.png')
      ? 'image/png'
      : 'image/jpeg';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${storageKey}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }
}
