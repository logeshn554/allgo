import { Injectable, BadRequestException } from '@nestjs/common';
import { CatalogRepository } from './data/catalog.repository.js';
import { CategoryRepository } from './data/category.repository.js';
import { ProductRepository } from './data/product.repository.js';
import { OverrideRepository } from './data/override.repository.js';
import { CatalogCategoryService } from './catalog-category.service.js';
import { CsvUploadValidationResult } from './dto/csv-menu.dto.js';

@Injectable()
export class MerchantCsvMenuService {
  constructor(
    private readonly catalogRepo: CatalogRepository,
    private readonly categoryRepo: CategoryRepository,
    private readonly productRepo: ProductRepository,
    private readonly overrideRepo: OverrideRepository,
    private readonly categoryService: CatalogCategoryService
  ) {}

  parseCsv(content: string): string[][] {
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    return lines.map((line) => {
      const row: string[] = [];
      let inQuotes = false;
      let curr = '';
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
          row.push(curr.trim());
          curr = '';
        } else {
          curr += c;
        }
      }
      row.push(curr.trim());
      return row;
    });
  }

  async processBulkMenuCsv(
    userId: string,
    outletId: string,
    csvContent: string
  ): Promise<CsvUploadValidationResult> {
    await this.catalogRepo.verifyOutletOwnership(userId, outletId);

    const rows = this.parseCsv(csvContent);
    if (rows.length < 2 || !rows[0]) {
      throw new BadRequestException('CSV file must include a header and at least one data row.');
    }

    const headers = rows[0].map((h) => h.toLowerCase().trim());
    const expectedHeaders = ['name', 'category', 'base_price', 'is_veg'];
    for (const reqH of expectedHeaders) {
      if (!headers.includes(reqH)) {
        throw new BadRequestException(`Missing mandatory CSV header: ${reqH}`);
      }
    }

    const nameIdx = headers.indexOf('name');
    const catIdx = headers.indexOf('category');
    const priceIdx = headers.indexOf('base_price');
    const vegIdx = headers.indexOf('is_veg');
    const stockIdx = headers.indexOf('stock');

    const result: CsvUploadValidationResult = {
      totalRows: rows.length - 1,
      validRows: 0,
      insertedCount: 0,
      errors: [],
    };

    const categories = await this.categoryRepo.findCategoriesByOutlet(outletId);
    const categoryMap = new Map<string, string>();
    for (const cat of categories) {
      categoryMap.set(cat.name.toLowerCase().trim(), cat.id);
    }

    for (let i = 1; i < rows.length; i++) {
      const rowNum = i + 1;
      const row = rows[i];
      if (!row) continue;

      const name = (row[nameIdx] || '').trim();
      const rawCat = (row[catIdx] || '').trim();
      const catKey = rawCat.toLowerCase();
      const basePrice = parseFloat(row[priceIdx] || '0');
      const isVeg = (row[vegIdx] || '').toLowerCase() === 'true' || row[vegIdx] === '1';
      const stock = stockIdx >= 0 ? parseInt(row[stockIdx] || '50', 10) : 50;

      if (!name) {
        result.errors.push({ rowNumber: rowNum, reason: 'Product name cannot be empty' });
        continue;
      }
      if (isNaN(basePrice) || basePrice < 0) {
        result.errors.push({ rowNumber: rowNum, reason: `Invalid base price: ${row[priceIdx]}` });
        continue;
      }

      let categoryId: string = categoryMap.get(catKey) || '';
      if (!categoryId) {
        const catNameToUse = rawCat || 'General';
        const newCat = await this.categoryService.createCategory(userId, outletId, {
          name: catNameToUse,
          displayOrder: 1,
        });
        categoryId = newCat.id as string;
        categoryMap.set(catNameToUse.toLowerCase(), categoryId);
      }

      try {
        const product = await this.productRepo.insertProduct(
          {
            categoryId,
            name,
            basePriceInr: basePrice,
            isVeg,
            isPerishable: false,
            preparationTimeMinutes: 15,
          },
          'ACTIVE',
          '[]',
          '{}'
        );
        await this.overrideRepo.upsertStock(outletId, product.id, stock, 5);
        result.validRows++;
        result.insertedCount++;
      } catch (err: any) {
        result.errors.push({ rowNumber: rowNum, reason: err.message || 'Insert error' });
      }
    }

    return result;
  }
}
