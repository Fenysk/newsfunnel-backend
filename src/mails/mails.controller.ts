import { Controller, Post, Body, Delete, Param, Get } from '@nestjs/common';
import { MailsService } from './mails.service';
import { SubscribeMailsRequestDto } from './dto/subscribe-mails.request';
import { LinkMailsRequestDto } from './dto/link-mails.request';
import { GetUser } from 'src/common/decorator/get-user.decorator';
import { Mail, MailServer, User } from '@prisma/client';

@Controller('mails')
export class MailsController {
    constructor(private readonly mailsService: MailsService) { }

    @Post('subscribe')
    async subscribeToMails(
        @Body() mailServer: MailServer,
    ): Promise<void> {
        return await this.mailsService.subscribeToMails(mailServer);
    }

    @Post('link')
    async linkMail(
        @Body() requestBody: LinkMailsRequestDto,
        @GetUser() user: User,
    ): Promise<MailServer> {
        const mailServer = await this.mailsService.linkMail({ config: requestBody, userId: user.id });

        await this.mailsService.subscribeToMails(mailServer);

        return mailServer;
    }

    @Delete('unlink/:email')
    async unlinkMail(
        @Param('email') email: string,
        @GetUser() user: User,
    ): Promise<void> {
        return await this.mailsService.unlinkMail({ email: email, userId: user.id });
    }

    @Get('fetch-all/:email')
    async fetchAllMails(
        @Param('email') email: string,
        @GetUser() user: User,
    ): Promise<Mail[]> {
        return await this.mailsService.fetchAllMails(user.id, email);
    }
}
