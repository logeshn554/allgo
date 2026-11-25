import { BadRequestException, Injectable } from '@nestjs/common';
import { CatalogRepository } from './data/catalog.repository.js';
import { OptionRepository } from './data/option.repository.js';
import {
  CreateOptionDto,
  CreateOptionGroupDto,
  UpdateOptionDto,
  UpdateOptionGroupDto,
} from './dto/option-group.dto.js';

@Injectable()
export class CatalogOptionService {
  constructor(
    private readonly catalogRepo: CatalogRepository,
    private readonly optionRepo: OptionRepository,
  ) {}

  async createOptionGroup(
    userId: string,
    productId: string,
    dto: CreateOptionGroupDto,
  ): Promise<any> {
    await this.catalogRepo.verifyProductOwnership(userId, productId);

    if (dto.minSelections < 0) throw new BadRequestException('minSelections cannot be negative');
    if (dto.maxSelections < dto.minSelections) {
      throw new BadRequestException('maxSelections must be greater than or equal to minSelections');
    }
    if (dto.isRequired && dto.minSelections < 1) {
      dto.minSelections = 1;
    }

    return this.optionRepo.insertOptionGroup(productId, dto);
  }

  async getOptionGroups(productId: string): Promise<any[]> {
    const [groups, options] = await Promise.all([
      this.optionRepo.findGroupsByProduct(productId),
      this.optionRepo.findOptionsByProduct(productId),
    ]);

    const optionsByGroup = new Map<string, any[]>();
    for (const opt of options) {
      const list = optionsByGroup.get(opt.option_group_id) || [];
      list.push({
        id: opt.id,
        optionGroupId: opt.option_group_id,
        name: opt.name,
        priceInr: Number.parseFloat(opt.price_inr),
        isAvailable: Boolean(opt.is_available),
        displayOrder: opt.display_order,
      });
      optionsByGroup.set(opt.option_group_id, list);
    }

    return groups.map((g: any) => ({
      id: g.id,
      itemId: g.item_id,
      name: g.name,
      minSelections: g.min_selections,
      maxSelections: g.max_selections,
      isRequired: Boolean(g.is_required),
      displayOrder: g.display_order,
      options: optionsByGroup.get(g.id) || [],
    }));
  }

  async updateOptionGroup(
    userId: string,
    groupId: string,
    dto: UpdateOptionGroupDto,
  ): Promise<any> {
    const itemId = await this.optionRepo.findOptionGroupItemId(groupId);
    await this.catalogRepo.verifyProductOwnership(userId, itemId);

    const updates: Record<string, any> = {};
    if (dto.name !== undefined) updates['name'] = dto.name.trim();
    if (dto.minSelections !== undefined) updates['min_selections'] = dto.minSelections;
    if (dto.maxSelections !== undefined) updates['max_selections'] = dto.maxSelections;
    if (dto.isRequired !== undefined) updates['is_required'] = dto.isRequired;
    if (dto.displayOrder !== undefined) updates['display_order'] = dto.displayOrder;

    return this.optionRepo.updateOptionGroup(groupId, updates);
  }

  async deleteOptionGroup(userId: string, groupId: string): Promise<{ success: boolean }> {
    const itemId = await this.optionRepo.findOptionGroupItemId(groupId);
    await this.catalogRepo.verifyProductOwnership(userId, itemId);
    await this.optionRepo.deleteOptionGroup(groupId);
    return { success: true };
  }

  async createOption(userId: string, groupId: string, dto: CreateOptionDto): Promise<any> {
    const itemId = await this.optionRepo.findOptionGroupItemId(groupId);
    await this.catalogRepo.verifyProductOwnership(userId, itemId);

    if (dto.priceInr < 0) throw new BadRequestException('Option price cannot be negative');

    const row = await this.optionRepo.insertOption(groupId, dto);
    return {
      ...row,
      priceInr: Number.parseFloat(row.price_inr),
    };
  }

  async updateOption(userId: string, optionId: string, dto: UpdateOptionDto): Promise<any> {
    const itemId = await this.optionRepo.findOptionItemId(optionId);
    await this.catalogRepo.verifyProductOwnership(userId, itemId);

    const updates: Record<string, any> = {};
    if (dto.name !== undefined) updates['name'] = dto.name.trim();
    if (dto.priceInr !== undefined) {
      if (dto.priceInr < 0) throw new BadRequestException('Price cannot be negative');
      updates['price_inr'] = dto.priceInr;
    }
    if (dto.isAvailable !== undefined) updates['is_available'] = dto.isAvailable;
    if (dto.displayOrder !== undefined) updates['display_order'] = dto.displayOrder;

    const row = await this.optionRepo.updateOption(optionId, updates);
    return {
      ...row,
      priceInr: Number.parseFloat(row.price_inr),
    };
  }

  async deleteOption(userId: string, optionId: string): Promise<{ success: boolean }> {
    const itemId = await this.optionRepo.findOptionItemId(optionId);
    await this.catalogRepo.verifyProductOwnership(userId, itemId);
    await this.optionRepo.deleteOption(optionId);
    return { success: true };
  }
}
