import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { UpdateRestrictionDto } from './dto/parcel.dto.js';

export interface RestrictionValidationResult {
  isPermitted: boolean;
  requiresReview: boolean;
  category: string;
  categoryDisplayName: string;
  maxWeightKg: number;
  maxDeclaredValueInr: number;
  warning?: string;
}

@Injectable()
export class ParcelRestrictionService {
  private readonly logger = new Logger(ParcelRestrictionService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Helper alias matching parameter list for test compatibility
   */
  async validateRestrictions(
    category: string,
    weightKg: number,
    lengthCm?: number,
    widthCm?: number,
    heightCm?: number,
    declaredValueInr?: number,
    customerId?: string,
    parcelId?: string,
  ): Promise<RestrictionValidationResult> {
    return this.validatePackage(
      category,
      weightKg,
      { lengthCm, widthCm, heightCm },
      declaredValueInr || 0,
      customerId,
      parcelId,
    );
  }

  /**
   * Validate parcel package parameters against server-authoritative restriction rules
   */
  async validatePackage(
    category: string,
    weightKg: number,
    dimensions: { lengthCm?: number; widthCm?: number; heightCm?: number },
    declaredValueInr = 0,
    customerId?: string,
    parcelId?: string,
  ): Promise<RestrictionValidationResult> {
    let safeCategory = (category || 'GENERAL').toUpperCase();
    if (safeCategory === 'CLOTHES') {
      safeCategory = 'CLOTHES_ITEMS';
    }
    const res = await this.db.query(
      `SELECT * FROM parcel_restrictions_config WHERE category_name = $1;`,
      [safeCategory],
    );

    if (res.rows.length === 0) {
      // Reject unknown category
      await this.logPolicyAudit(
        parcelId,
        customerId,
        safeCategory,
        'REJECTED',
        weightKg,
        dimensions,
        'Unrecognized package category',
      );
      throw new BadRequestException(
        `Unrecognized or unconfigured parcel package category: ${safeCategory}`,
      );
    }

    const rule = res.rows[0];

    // 1. Prohibited Category Check
    if (!rule.is_permitted) {
      const reason =
        rule.prohibited_reason ||
        `Items in category '${rule.display_name}' are prohibited under transport policy.`;
      await this.logPolicyAudit(
        parcelId,
        customerId,
        safeCategory,
        'REJECTED',
        weightKg,
        dimensions,
        reason,
      );
      throw new BadRequestException(`Prohibited package category: ${reason}`);
    }

    // 2. Weight limit check
    const maxWeight = Number(rule.max_weight_kg);
    if (weightKg > maxWeight) {
      const reason = `Weight ${weightKg}kg exceeds maximum permissible limit of ${maxWeight}kg for ${rule.display_name}`;
      await this.logPolicyAudit(
        parcelId,
        customerId,
        safeCategory,
        'REJECTED',
        weightKg,
        dimensions,
        reason,
      );
      throw new BadRequestException(reason);
    }

    // 3. Dimensions limit check
    const maxL = Number(rule.max_length_cm);
    const maxW = Number(rule.max_width_cm);
    const maxH = Number(rule.max_height_cm);

    if (dimensions.lengthCm && dimensions.lengthCm > maxL) {
      const reason = `Dimension limit exceeded: Length ${dimensions.lengthCm}cm exceeds max limit of ${maxL}cm for ${rule.display_name}`;
      await this.logPolicyAudit(
        parcelId,
        customerId,
        safeCategory,
        'REJECTED',
        weightKg,
        dimensions,
        reason,
      );
      throw new BadRequestException(reason);
    }
    if (dimensions.widthCm && dimensions.widthCm > maxW) {
      const reason = `Dimension limit exceeded: Width ${dimensions.widthCm}cm exceeds max limit of ${maxW}cm for ${rule.display_name}`;
      await this.logPolicyAudit(
        parcelId,
        customerId,
        safeCategory,
        'REJECTED',
        weightKg,
        dimensions,
        reason,
      );
      throw new BadRequestException(reason);
    }
    if (dimensions.heightCm && dimensions.heightCm > maxH) {
      const reason = `Dimension limit exceeded: Height ${dimensions.heightCm}cm exceeds max limit of ${maxH}cm for ${rule.display_name}`;
      await this.logPolicyAudit(
        parcelId,
        customerId,
        safeCategory,
        'REJECTED',
        weightKg,
        dimensions,
        reason,
      );
      throw new BadRequestException(reason);
    }

    // 4. Declared value check
    const maxVal = Number(rule.max_declared_value_inr);
    if (declaredValueInr > maxVal) {
      const reason = `Declared value ₹${declaredValueInr} exceeds max policy ceiling of ₹${maxVal} for ${rule.display_name}`;
      await this.logPolicyAudit(
        parcelId,
        customerId,
        safeCategory,
        'REJECTED',
        weightKg,
        dimensions,
        reason,
      );
      throw new BadRequestException(reason);
    }

    // Log policy approval or review flag
    const decision = rule.requires_review ? 'REQUIRES_REVIEW' : 'ALLOWED';
    const auditReason = rule.requires_review
      ? `Category ${rule.display_name} permitted subject to compliance verification`
      : `Category ${rule.display_name} standard parameters verified`;

    await this.logPolicyAudit(
      parcelId,
      customerId,
      safeCategory,
      decision,
      weightKg,
      dimensions,
      auditReason,
    );

    return {
      isPermitted: true,
      requiresReview: Boolean(rule.requires_review),
      category: rule.category_name,
      categoryDisplayName: rule.display_name,
      maxWeightKg: maxWeight,
      maxDeclaredValueInr: maxVal,
      warning: rule.requires_review
        ? 'Prescription / medical items may require compliance inspection at pickup'
        : undefined,
    };
  }

  /**
   * Log auditable record of package restriction decisions
   */
  async logPolicyAudit(
    parcelId: string | undefined,
    customerId: string | undefined,
    category: string,
    decision: 'ALLOWED' | 'REJECTED' | 'FLAGGED_FOR_REVIEW' | 'REQUIRES_REVIEW',
    weightKg: number,
    dimensions: any,
    reason: string,
  ): Promise<void> {
    try {
      const safeCat = category || 'GENERAL';
      await this.db.query(
        `INSERT INTO parcel_policy_audit_logs (
           parcel_id, customer_id, category, decision, weight_kg, dimensions, reason
         ) VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [
          parcelId || null,
          customerId || null,
          safeCat,
          decision,
          weightKg || 0,
          JSON.stringify(dimensions || {}),
          reason,
        ],
      );
    } catch (err: any) {
      this.logger.warn(`Failed to write policy audit log: ${err.message}`);
    }
  }

  /**
   * List all configured restrictions
   */
  async getAllRestrictions(): Promise<any[]> {
    const res = await this.db.query(
      `SELECT * FROM parcel_restrictions_config ORDER BY is_permitted DESC, display_name ASC;`,
    );
    return res.rows;
  }

  /**
   * Update restriction rule (Admin only)
   */
  async updateRestriction(category: string, dto: UpdateRestrictionDto): Promise<any> {
    const existing = await this.db.query(
      `SELECT * FROM parcel_restrictions_config WHERE category_name = $1;`,
      [category.toUpperCase()],
    );
    if (existing.rows.length === 0) {
      throw new BadRequestException(`Category ${category} not found`);
    }

    const current = existing.rows[0];
    const isPermitted = dto.isPermitted !== undefined ? dto.isPermitted : current.is_permitted;
    const requiresReview =
      dto.requiresReview !== undefined ? dto.requiresReview : current.requires_review;
    const maxWeight = dto.maxWeightKg !== undefined ? dto.maxWeightKg : current.max_weight_kg;
    const maxL = dto.maxLengthCm !== undefined ? dto.maxLengthCm : current.max_length_cm;
    const maxW = dto.maxWidthCm !== undefined ? dto.maxWidthCm : current.max_width_cm;
    const maxH = dto.maxHeightCm !== undefined ? dto.maxHeightCm : current.max_height_cm;
    const maxVal =
      dto.maxDeclaredValueInr !== undefined
        ? dto.maxDeclaredValueInr
        : current.max_declared_value_inr;
    const prohibitedReason =
      dto.prohibitedReason !== undefined ? dto.prohibitedReason : current.prohibited_reason;

    const res = await this.db.query(
      `UPDATE parcel_restrictions_config
       SET is_permitted = $1, requires_review = $2, max_weight_kg = $3,
           max_length_cm = $4, max_width_cm = $5, max_height_cm = $6,
           max_declared_value_inr = $7, prohibited_reason = $8, updated_at = NOW()
       WHERE category_name = $9
       RETURNING *;`,
      [
        isPermitted,
        requiresReview,
        maxWeight,
        maxL,
        maxW,
        maxH,
        maxVal,
        prohibitedReason,
        category.toUpperCase(),
      ],
    );

    return res.rows[0];
  }
}
