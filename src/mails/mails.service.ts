import { ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { LinkMailsRequestDto } from './dto/link-mails.request';
import { PrismaService } from 'src/prisma/prisma.service';
import { Mail, MailMetadata, MailServer } from '@prisma/client';
import { ImapService } from './imap/imap.service';
import { AnalyseService } from 'src/analyse/analyse.service';

@Injectable()
export class MailsService {
    private readonly logger = new Logger(MailsService.name);

    constructor(
        private readonly prismaService: PrismaService,
        private readonly imapService: ImapService,
        private readonly analyseService: AnalyseService,
    ) { }

    async subscribeToAllMails(): Promise<void> {
        const mailServers = await this.prismaService.mailServer.findMany();

        for (const mailServer of mailServers)
            await this.subscribeToMails(mailServer);
    }

    async subscribeToMails(mailServer: MailServer): Promise<void> {
        const imapClient = this.imapService.createImapClient(mailServer);
        this.imapService.addImapClient(mailServer.user, imapClient);

        this.imapService.setupImapEventListeners(imapClient, mailServer.user);
        imapClient.connect();
    }

    async getUserMailServers(userId: string): Promise<MailServer[]> {
        const mailServers = await this.prismaService.mailServer.findMany({
            where: {
                userId: userId
            }
        });

        return mailServers;
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

        this.imapService.removeImapClient(email);
    }

    async fetchAllMails(userId: string, email: string): Promise<Mail[]> {
        const user = await this.prismaService.user.findUnique({
            where: { id: userId }
        });

        if (!user)
            throw new UnauthorizedException('User not allowed');

        const mailServer = await this.prismaService.mailServer.findFirst({
            where: {
                userId: userId,
                user: email
            },
            include: {
                Mails: {
                    include: {
                        Metadata: true
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

    async fetchMailsMetadata(userId: string, email: string): Promise<MailMetadata[]> {
        const user = await this.prismaService.user.findUnique({
            where: { id: userId }
        });

        if (!user)
            throw new UnauthorizedException('User not allowed');

        const mailServer = await this.prismaService.mailServer.findFirst({
            where: {
                userId: userId,
                user: email
            },
            include: {
                Mails: {
                    include: {
                        Metadata: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });

        if (!mailServer)
            throw new NotFoundException('Mail server not found');

        return mailServer.Mails.map(mail => mail.Metadata);
    }

    async setMetaDataToMail(mail: Mail): Promise<MailMetadata> {
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                this.logger.debug(`Attempt ${attempts + 1}/${maxAttempts} to get metadata for mail ${mail.id}`);
                
                const metaData = await this.analyseService.getNewletterMetaData(mail.body);
                this.logger.debug(`Successfully retrieved metadata from analysis service for mail ${mail.id}`);

                const savedMetadata = await this.prismaService.mailMetadata.create({
                    data: {
                        mailId: mail.id,
                        isNewsletter: metaData.isNewsletter,
                        newsletterName: metaData.newsletterName,
                        theme: metaData.theme,
                        tags: metaData.tags,
                        mainSubjectsTitle: metaData.mainSubjectsTitle,
                        oneResumeSentence: metaData.oneResumeSentence,
                        longResume: metaData.longResume,
                        differentSubject: metaData.differentSubject,
                        isExplicitSponsored: metaData.isExplicitSponsored,
                        sponsorIfTrue: metaData.sponsorIfTrue,
                        unsubscribeLink: metaData.unsubscribeLink,
                        priority: metaData.priority
                    }
                });

                this.logger.debug(`Successfully saved metadata for mail ${mail.id}`);
                return savedMetadata;

            } catch (error) {
                attempts++;
                this.logger.error(`Failed attempt ${attempts}/${maxAttempts} to process metadata for mail ${mail.id}: ${error.message}`);
                
                if (attempts === maxAttempts) {
                    this.logger.error(`Max attempts reached for mail ${mail.id}, giving up`);
                    throw new InternalServerErrorException(`Failed to process metadata after ${maxAttempts} attempts: ${error.message}`);
                }
            }
        }
    }

}