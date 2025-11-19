import { PartialType } from '@nestjs/swagger';
import { CreateProviderInfoDto } from './create-provider-info.dto';

export class UpdateProviderInfoDto extends PartialType(CreateProviderInfoDto) {}
