import { PartialType } from '@nestjs/swagger';
import { CreateNotificationChannelDto } from './create-notification-channel.dto';

export class UpdateNotificationChannelDto extends PartialType(CreateNotificationChannelDto) {}