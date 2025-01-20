import { ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { LinkMailsRequestDto } from './dto/link-mails.request';
import { PrismaService } from 'src/prisma/prisma.service';
import { Mail, MailMetadata, MailServer } from '@prisma/client';
import { ImapService } from './imap/imap.service';
import { AnalyseService } from 'src/analyse/analyse.service';
import { EmailMessage } from './interfaces/email-message.interface';

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
                        createdAt: true,
                        mailServerId: true,
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
        this.logger.log(`Starting metadata processing for mail ${mail.id}`);
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                this.logger.debug(`Attempt ${attempts + 1}/${maxAttempts} to get metadata for mail ${mail.id}`);
                this.logger.log(`Calling analysis service for mail ${mail.id}`);

                const metaData = await this.analyseService.getNewletterMetaData(mail.body);
                this.logger.debug(`Successfully retrieved metadata from analysis service for mail ${mail.id}`);
                this.logger.log(`Metadata analysis complete for mail ${mail.id}`);

                if (!metaData.isNewsletter) {
                    this.logger.debug(`Mail ${mail.id} is not a newsletter, deleting it`);
                    this.logger.log(`Deleting non-newsletter mail ${mail.id}`);
                    await this.prismaService.mail.delete({
                        where: { id: mail.id }
                    });
                    this.logger.log(`Successfully deleted non-newsletter mail ${mail.id}`);
                    return null;
                }

                this.logger.log(`Creating metadata record in database for mail ${mail.id}`);
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
                this.logger.log(`Metadata processing complete for mail ${mail.id}`);
                return savedMetadata;

            } catch (error) {
                attempts++;
                this.logger.error(`Failed attempt ${attempts}/${maxAttempts} to process metadata for mail ${mail.id}: ${error.message}`);
                this.logger.log(`Error details: ${JSON.stringify(error)}`);

                if (attempts === maxAttempts) {
                    this.logger.error(`Max attempts reached for mail ${mail.id}, giving up`);
                    this.logger.log(`Terminating metadata processing for mail ${mail.id} after max attempts`);
                    throw new InternalServerErrorException(`Failed to process metadata after ${maxAttempts} attempts: ${error.message}`);
                }

                this.logger.log(`Preparing for retry attempt ${attempts + 1} for mail ${mail.id}`);
            }
        }
    }

}