import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  basePriceInr!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  salePriceInr?: number;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsBoolean()
  @IsOptional()
  isVeg = true;

  @IsBoolean()
  @IsOptional()
  isPerishable = false;

  @IsNumber()
  @IsOptional()
  preparationTimeMinutes = 15;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsArray()
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  hsnSacCode?: string;

  @IsNumber()
  @IsOptional()
  gstRatePercentage?: number;

  @IsNumber()
  @IsOptional()
  displayOrder?: number;

  @IsString()
  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'INACTIVE'])
  productStatus?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  dietaryFlags?: Record<string, boolean>;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stockQuantity?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  lowStockThreshold?: number;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  basePriceInr?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  salePriceInr?: number;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsBoolean()
  @IsOptional()
  isVeg?: boolean;

  @IsBoolean()
  @IsOptional()
  isPerishable?: boolean;

  @IsNumber()
  @IsOptional()
  preparationTimeMinutes?: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsArray()
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  hsnSacCode?: string;

  @IsNumber()
  @IsOptional()
  gstRatePercentage?: number;

  @IsNumber()
  @IsOptional()
  displayOrder?: number;

  @IsString()
  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'])
  productStatus?: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

  @IsOptional()
  dietaryFlags?: Record<string, boolean>;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stockQuantity?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  lowStockThreshold?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ProductQueryDto {
  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsBoolean()
  @IsOptional()
  isVeg?: boolean;

  @IsString()
  @IsOptional()
  productStatus?: string;

  @IsNumber()
  @IsOptional()
  minPrice?: number;

  @IsNumber()
  @IsOptional()
  maxPrice?: number;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  sortBy?: 'name' | 'price_asc' | 'price_desc' | 'display_order' | 'created_at';
}

export class ModerateProductDto {
  @IsString()
  @IsIn(['APPROVED', 'REJECTED'])
  adminStatus!: 'APPROVED' | 'REJECTED';

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
