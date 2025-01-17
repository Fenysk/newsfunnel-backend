import { Module } from '@nestjs/common';
import { MailsController } from './mails.controller';
import { MailsService } from './mails.service';
import { ImapService } from './imap/imap.service';
import { AnalyseModule } from 'src/analyse/analyse.module';

@Module({
  imports: [AnalyseModule],
  controllers: [MailsController],
  providers: [
    MailsService,
    ImapService,
  ],
})
export class MailsModule {}
