import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    example: 'Main Course / Biryani',
    description: 'Category name or existing category UUID',
  })
  @IsString()
  @IsNotEmpty()
  categoryName!: string;

  @ApiProperty({ example: 'Chettinad Chicken Biryani', description: 'Product title' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'Authentic seeraga samba rice cooked with tender country chicken',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 320.0, description: 'Base selling price in INR' })
  @IsNumber()
  @Min(0.01)
  basePriceInr!: number;

  @ApiProperty({ example: false, description: 'Vegetarian classification indicator' })
  @IsBoolean()
  isVeg!: boolean;

  @ApiProperty({ example: true, description: 'Perishable item classification' })
  @IsBoolean()
  @IsOptional()
  isPerishable?: boolean;

  @ApiProperty({ example: 15, description: 'Item prep time in minutes' })
  @IsNumber()
  @IsOptional()
  preparationTimeMinutes?: number;

  @ApiProperty({ example: 'https://cdn.allgo.in/items/biryani.jpg', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: 50, description: 'Initial stock inventory level' })
  @IsNumber()
  @Min(0)
  stockQuantity!: number;
}
