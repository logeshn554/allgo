import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

export interface SubmitRatingDto {
  targetType: 'MERCHANT' | 'OUTLET' | 'PARTNER';
  targetId: string;
  score: number;
  feedback?: string;
  orderGroupId?: string;
  subOrderId?: string;
  deliveryLegId?: string;
  partnerJobId?: string;
  rideId?: string;
  parcelId?: string;
  hireDriverBookingId?: string;
}

@Injectable()
export class RatingsService {
  private readonly logger = new Logger(RatingsService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Submit service rating
   */
  async submitRating(reviewerId: string, dto: SubmitRatingDto) {
    const {
      targetType,
      targetId,
      score,
      feedback,
      orderGroupId,
      subOrderId,
      deliveryLegId,
      partnerJobId,
      rideId,
      parcelId,
      hireDriverBookingId,
    } = dto;

    if (!score || score < 1 || score > 5 || !Number.isInteger(score)) {
      throw new BadRequestException('Rating score must be an integer between 1 and 5');
    }

    if (!targetType || !targetId) {
      throw new BadRequestException('targetType and targetId are required');
    }

    // Duplicate rating check for the same booking / service
    const existingCheck = await this.db.query(
      `SELECT id FROM ratings 
       WHERE reviewer_id = $1 
         AND target_id = $2
         AND (
           (order_group_id IS NOT NULL AND order_group_id = $3) OR
           (sub_order_id IS NOT NULL AND sub_order_id = $4) OR
           (ride_id IS NOT NULL AND ride_id = $5) OR
           (parcel_id IS NOT NULL AND parcel_id = $6) OR
           (hire_driver_booking_id IS NOT NULL AND hire_driver_booking_id = $7)
         );`,
      [
        reviewerId,
        targetId,
        orderGroupId || null,
        subOrderId || null,
        rideId || null,
        parcelId || null,
        hireDriverBookingId || null,
      ],
    );

    if (existingCheck.rows.length > 0) {
      throw new ConflictException(
        'You have already submitted a rating for this completed service.',
      );
    }

    const res = await this.db.query(
      `INSERT INTO ratings (
         reviewer_id, target_type, target_id, score, feedback,
         order_group_id, sub_order_id, delivery_leg_id, partner_job_id,
         ride_id, parcel_id, hire_driver_booking_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *;`,
      [
        reviewerId,
        targetType,
        targetId,
        score,
        feedback || null,
        orderGroupId || null,
        subOrderId || null,
        deliveryLegId || null,
        partnerJobId || null,
        rideId || null,
        parcelId || null,
        hireDriverBookingId || null,
      ],
    );

    return res.rows[0];
  }

  /**
   * Get ratings and aggregate metrics for a target
   */
  async getRatingsForTarget(targetType: string, targetId: string, includeHidden = false) {
    const hiddenCondition = includeHidden ? '' : 'AND is_hidden = FALSE';

    const aggregateRes = await this.db.query(
      `SELECT 
         COUNT(*) as total_ratings,
         COALESCE(AVG(score), 0.0) as average_score,
         COUNT(CASE WHEN score = 5 THEN 1 END) as star_5,
         COUNT(CASE WHEN score = 4 THEN 1 END) as star_4,
         COUNT(CASE WHEN score = 3 THEN 1 END) as star_3,
         COUNT(CASE WHEN score = 2 THEN 1 END) as star_2,
         COUNT(CASE WHEN score = 1 THEN 1 END) as star_1
       FROM ratings
       WHERE target_type = $1 AND target_id = $2 ${hiddenCondition};`,
      [targetType, targetId],
    );

    const reviewsRes = await this.db.query(
      `SELECT r.*, u.name as reviewer_name
       FROM ratings r
       JOIN users u ON u.id = r.reviewer_id
       WHERE r.target_type = $1 AND r.target_id = $2 ${hiddenCondition}
       ORDER BY r.created_at DESC
       LIMIT 50;`,
      [targetType, targetId],
    );

    const agg = aggregateRes.rows[0];

    return {
      totalRatings: Number.parseInt(agg.total_ratings, 10),
      averageScore: Math.round(Number.parseFloat(agg.average_score) * 10) / 10,
      breakdown: {
        5: Number.parseInt(agg.star_5, 10),
        4: Number.parseInt(agg.star_4, 10),
        3: Number.parseInt(agg.star_3, 10),
        2: Number.parseInt(agg.star_2, 10),
        1: Number.parseInt(agg.star_1, 10),
      },
      recentReviews: reviewsRes.rows,
    };
  }

  /**
   * Admin moderate review (hide / unhide)
   */
  async moderateRating(ratingId: string, adminId: string, isHidden: boolean, reason?: string) {
    const res = await this.db.query(
      `UPDATE ratings
       SET is_hidden = $1, moderated_by = $2, moderation_reason = $3, moderated_at = NOW()
       WHERE id = $4 RETURNING *;`,
      [isHidden, adminId, reason || null, ratingId],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException(`Rating not found: ${ratingId}`);
    }

    return res.rows[0];
  }

  /**
   * List all ratings for Admin review
   */
  async listAllRatings(limit = 100, offset = 0) {
    const res = await this.db.query(
      `SELECT r.*, u.name as reviewer_name, u.phone as reviewer_phone,
              m.name as moderated_by_name
       FROM ratings r
       JOIN users u ON u.id = r.reviewer_id
       LEFT JOIN users m ON m.id = r.moderated_by
       ORDER BY r.created_at DESC
       LIMIT $1 OFFSET $2;`,
      [limit, offset],
    );
    return res.rows;
  }
}
