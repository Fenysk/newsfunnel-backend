import { Module } from '@nestjs/common';
import { SecurityService } from './security/security.service';

@Module({
  providers: [SecurityService],
  exports: [SecurityService]
})
export class CommonModule { }
