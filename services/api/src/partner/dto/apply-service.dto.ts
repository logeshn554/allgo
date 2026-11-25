import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class ApplyServiceDto {
  @ApiProperty({
    description: 'Specific service category to apply for',
    enum: [
      'FOOD_DELIVERY',
      'GROCERY_DELIVERY',
      'PARCEL',
      'BIKE_TAXI',
      'AUTO_RICKSHAW',
      'CAB_SEDAN',
      'CAB_HATCHBACK',
      'CAB_SUV',
      'HIRE_DRIVER',
    ],
    example: 'FOOD_DELIVERY',
  })
  @IsString()
  @IsIn([
    'FOOD_DELIVERY',
    'GROCERY_DELIVERY',
    'PARCEL',
    'BIKE_TAXI',
    'AUTO_RICKSHAW',
    'CAB_SEDAN',
    'CAB_HATCHBACK',
    'CAB_SUV',
    'HIRE_DRIVER',
  ])
  serviceType!: string;
}
