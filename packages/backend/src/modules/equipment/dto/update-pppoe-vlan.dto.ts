import { PartialType } from '@nestjs/swagger';
import { CreatePppoeVlanDto } from './create-pppoe-vlan.dto';

export class UpdatePppoeVlanDto extends PartialType(CreatePppoeVlanDto) {}
