import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { CreateOptionGroupDto, CreateOptionDto } from '../dto/option-group.dto.js';

@Injectable()
export class OptionRepository {
  constructor(private readonly db: DatabaseService) {}

  async insertOptionGroup(productId: string, dto: CreateOptionGroupDto): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO item_option_groups (item_id, name, min_selections, max_selections, is_required, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *;`,
      [productId, dto.name.trim(), dto.minSelections, dto.maxSelections, dto.isRequired ?? false, dto.displayOrder || 0]
    );
    return res.rows[0];
  }

  async findGroupsByProduct(productId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT * FROM item_option_groups WHERE item_id = $1 ORDER BY display_order ASC, name ASC;`,
      [productId]
    );
    return res.rows;
  }

  async findOptionsByProduct(productId: string): Promise<any[]> {
    const res = await this.db.query(
      `SELECT o.* FROM item_options o
       JOIN item_option_groups g ON g.id = o.option_group_id
       WHERE g.item_id = $1
       ORDER BY o.display_order ASC, o.name ASC;`,
      [productId]
    );
    return res.rows;
  }

  async findOptionGroupItemId(groupId: string): Promise<string> {
    const gCheck = await this.db.query('SELECT item_id FROM item_option_groups WHERE id = $1;', [groupId]);
    if (gCheck.rows.length === 0) throw new NotFoundException('Option group not found');
    return gCheck.rows[0].item_id;
  }

  async updateOptionGroup(groupId: string, updates: Record<string, any>): Promise<any> {
    const clauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [];

    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        params.push(val);
        clauses.push(`${key} = $${params.length}`);
      }
    }

    params.push(groupId);
    const res = await this.db.query(
      `UPDATE item_option_groups SET ${clauses.join(', ')} WHERE id = $${params.length} RETURNING *;`,
      params
    );
    return res.rows[0];
  }

  async deleteOptionGroup(groupId: string): Promise<void> {
    await this.db.query('DELETE FROM item_option_groups WHERE id = $1;', [groupId]);
  }

  async insertOption(groupId: string, dto: CreateOptionDto): Promise<any> {
    const res = await this.db.query(
      `INSERT INTO item_options (option_group_id, name, price_inr, is_available, display_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [groupId, dto.name.trim(), dto.priceInr || 0.0, dto.isAvailable ?? true, dto.displayOrder || 0]
    );
    return res.rows[0];
  }

  async findOptionItemId(optionId: string): Promise<string> {
    const optCheck = await this.db.query(
      `SELECT g.item_id FROM item_options o
       JOIN item_option_groups g ON g.id = o.option_group_id
       WHERE o.id = $1;`,
      [optionId]
    );
    if (optCheck.rows.length === 0) throw new NotFoundException('Option not found');
    return optCheck.rows[0].item_id;
  }

  async updateOption(optionId: string, updates: Record<string, any>): Promise<any> {
    const clauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [];

    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        params.push(val);
        clauses.push(`${key} = $${params.length}`);
      }
    }

    params.push(optionId);
    const res = await this.db.query(
      `UPDATE item_options SET ${clauses.join(', ')} WHERE id = $${params.length} RETURNING *;`,
      params
    );
    return res.rows[0];
  }

  async deleteOption(optionId: string): Promise<void> {
    await this.db.query('DELETE FROM item_options WHERE id = $1;', [optionId]);
  }
}
