import { ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { LinkMailsRequestDto } from './dto/link-mails.request';
import { PrismaService } from 'src/prisma/prisma.service';
import { Mail, MailServer } from '@prisma/client';
import { ImapService } from './imap/imap.service';
import { EmailMessage } from './interfaces/email-message.interface';
import { AnalyseService } from 'src/analyse/analyse.service';

@Injectable()
export class MailsService {
    private readonly logger = new Logger(MailsService.name);

    constructor(
        private readonly prismaService: PrismaService,
        private readonly imapService: ImapService,
        private readonly analyseService: AnalyseService
    ) { }

    async subscribeToAllMails(): Promise<void> {
        const mailServers = await this.prismaService.mailServer.findMany();

        for (const mailServer of mailServers)
            await this.subscribeToMails(mailServer);
    }

    async subscribeToMails(mailServer: MailServer): Promise<void> {
        const emailClient = this.imapService.createEmailClient(mailServer);
        this.imapService.addEmailClient(mailServer.user, emailClient);

        this.imapService.setupEmailClientListeners(emailClient, mailServer.user);
        emailClient.connect();
    }

    async getUserMailServers(userId: string): Promise<MailServer[]> {
        const mailServers = await this.prismaService.mailServer.findMany({
            where: {
                userId: userId
            }
        });

        return mailServers;
    }

    async getMailDetails(mailId: string, userId: string): Promise<Mail> {
        const mail = await this.prismaService.mail.findFirst({
            where: {
                id: mailId,
                MailServer: {
                    userId: userId
                },
            },
        });

        if (!mail)
            throw new NotFoundException('Mail not found');

        return mail;
    }

    async deleteMail(mailId: string, userId: string): Promise<void> {
        const mail = await this.prismaService.mail.findFirst({
            where: {
                id: mailId,
                MailServer: {
                    userId: userId
                }
            }
        });

        if (!mail)
            throw new NotFoundException('Mail not found');

        await this.prismaService.mail.delete({
            where: {
                id: mailId
            }
        });
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
                name: config.name,
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

        this.imapService.removeEmailClient(email);
    }

    async fetchAllMails(userId: string, email: string): Promise<Omit<Mail, 'body'>[]> {
        const user = await this.prismaService.user.findUnique({
            where: { id: userId },
        });

        if (!user)
            throw new UnauthorizedException('User not allowed');

        const mailServer = await this.prismaService.mailServer.findFirst({
            where: {
                userId: userId,
                user: email
            },
            select: {
                Mails: {
                    select: {
                        id: true,
                        from: true,
                        to: true,
                        subject: true,
                        markdownSummary: true,
                        createdAt: true,
                        mailServerId: true,
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });

        if (!mailServer)
            throw new NotFoundException('Mail server not found');

        return mailServer.Mails;
    }

    async findMailServer(userEmail: string) {
        const mailServer = await this.prismaService.mailServer.findFirst({
            where: { user: userEmail }
        });

        if (!mailServer) {
            this.logger.error(`Mail server not found for user ${userEmail}`);
            return null;
        }

        return mailServer;
    }

    async saveEmailToDatabase(emailMessage: EmailMessage, mailServerId: string): Promise<Mail> {
        return await this.prismaService.mail.create({
            data: {
                from: emailMessage.headers.from?.[0] || '',
                to: emailMessage.headers.to?.[0] || '',
                subject: emailMessage.headers.subject?.[0] || '',
                body: emailMessage.content,
                mailServerId: mailServerId,
            }
        });
    }

    async generateMarkdownSummaryToMail(mail: Mail): Promise<Mail> {

        const markdownSummary = await this.analyseService.summarizeNewsletterToMarkdown(mail.body);

        const updatedMail = await this.prismaService.mail.update({
            where: {
                id: mail.id
            },
            data: {
                markdownSummary,
            },
        });

        return updatedMail;
    }


}