export interface CsvMenuUploadRow {
  name: string;
  categoryName: string;
  basePriceInr: number;
  salePriceInr?: number;
  isVeg: boolean;
  isPerishable: boolean;
  prepTimeMinutes: number;
  stockQuantity: number;
  description?: string;
}

export interface CsvUploadValidationResult {
  totalRows: number;
  validRows: number;
  insertedCount: number;
  errors: Array<{ rowNumber: number; reason: string }>;
}
