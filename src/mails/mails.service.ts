import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Imap from 'node-imap';
import { SubscribeMailsRequestDto } from './dto/subscribe-mails.request';
import { LinkMailsRequestDto } from './dto/link-mails.request';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailServer } from '@prisma/client';
import { ImapService } from './imap/imap.service';

@Injectable()
export class MailsService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly imapService: ImapService,
    ) { }

    async subscribeToAllMails(): Promise<void> {
        const mailServers = await this.prismaService.mailServer.findMany();

        for (const mailServer of mailServers) {
            console.log(`Subscribing to mail server: ${mailServer.host} for user: ${mailServer.user}`);
            await this.subscribeToMails(mailServer);
        }

        console.log('Finished subscribing to all mail servers');
    }

    async subscribeToMails(mailServer: MailServer): Promise<void> {
        const imapClient = this.imapService.createImapClient(mailServer);
        this.imapService.addImapClient(mailServer.user, imapClient);

        this.imapService.setupImapEventListeners(imapClient, mailServer.user);
        imapClient.connect();
    }

    async linkMail({
        config,
        userId,
    }: {
        config: LinkMailsRequestDto,
        userId: string,
    }): Promise<MailServer> {
        const existingMailServer = await this.prismaService.mailServer.findFirst({
            where: {
                user: config.user,
                host: config.host,
                userId: userId
            }
        });

        if (existingMailServer)
            throw new ConflictException('Mail server configuration already exists for this user');

        const mailServer = await this.prismaService.mailServer.create({
            data: {
                user: config.user,
                password: config.password,
                host: config.host,
                port: config.port,
                tls: config.tls,
                userId: userId,
            }
        });

        return mailServer;
    }

    async unlinkMail({
        email,
        userId,
    }: {
        email: string,
        userId: string,
    }): Promise<void> {
        const mailServer = await this.prismaService.mailServer.findFirst({
            where: {
                user: email,
                userId: userId
            }
        });

        if (!mailServer)
            throw new NotFoundException('Mail server configuration not found');

        await this.prismaService.mailServer.delete({
            where: {
                id: mailServer.id
            }
        });

        this.imapService.removeImapClient(email);
    }
}