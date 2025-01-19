import { Injectable, Logger, InternalServerErrorException, Inject, forwardRef } from '@nestjs/common';
import { Mail, MailServer } from '@prisma/client';
import * as Imap from 'node-imap';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailsService } from '../mails.service';
import { EmailMessage } from '../interfaces/email-message.interface';

interface EmailFetchOptions {
    bodies: string[];
    struct?: boolean;
    markSeen?: boolean;
}

@Injectable()
export class ImapService {
    private readonly emailClientsByUser: Map<string, Imap>;
    private readonly logger = new Logger(ImapService.name);
    private readonly RECONNECT_DELAY_MS = 5000;
    private readonly MAX_RECONNECT_TRIES = 5;

    constructor(
        private readonly prismaService: PrismaService,
        @Inject(forwardRef(() => MailsService))
        private readonly mailsService: MailsService
    ) {
        this.emailClientsByUser = new Map();
    }

    createEmailClient(serverConfig: MailServer): Imap {
        try {
            return new Imap({
                user: serverConfig.user,
                password: serverConfig.password,
                host: serverConfig.host,
                port: serverConfig.port,
                tls: serverConfig.tls,
                tlsOptions: {
                    rejectUnauthorized: false,
                    servername: serverConfig.host
                },
                authTimeout: 30000,
                connTimeout: 30000,
            });
        } catch (error) {
            this.logger.error(`Failed to create email client: ${error.message}`);
            throw new InternalServerErrorException('Failed to create email client');
        }
    }

    setupEmailClientListeners(emailClient: Imap, userEmail: string): void {
        emailClient.on('ready', () => {
            this.startEmailMonitoring(emailClient, userEmail);
        });

        emailClient.on('error', (error) => {
            this.logger.error(`Email client error for user ${userEmail}: ${error.message}`);
        });
    }

    private async startEmailMonitoring(emailClient: Imap, userEmail: string): Promise<void> {
        try {
            emailClient.openBox('INBOX', false, (error, mailbox) => {
                if (error) {
                    this.logger.error(`Failed to open inbox for ${userEmail}: ${error.message}`);
                    return;
                }
                // On écoute uniquement les nouveaux mails
                this.listenForNewEmails(emailClient, userEmail);
            });
        } catch (error) {
            this.logger.error(`Failed to start email monitoring for ${userEmail}: ${error.message}`);
            setTimeout(() => this.attemptReconnection(userEmail, emailClient), this.RECONNECT_DELAY_MS);
        }
    }

    private listenForNewEmails(emailClient: Imap, userEmail: string): void {
        emailClient.on('mail', (newEmailCount) => {
            const fetchOptions: EmailFetchOptions = this.createFetchOptions();
            // On ne récupère que le dernier mail reçu
            const fetchOperation = emailClient.fetch('*', fetchOptions);

            this.handleFetchOperationErrors(fetchOperation, userEmail);
            this.handleIncomingMessages(fetchOperation, userEmail, emailClient);
        });
    }

    private createFetchOptions(): EmailFetchOptions {
        return {
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT)', 'TEXT'],
            struct: true,
            markSeen: true
        };
    }

    private handleFetchOperationErrors(fetchOperation: Imap.ImapFetch, userEmail: string): void {
        fetchOperation.on('error', (error) => {
            this.logger.error(`Failed to fetch emails for ${userEmail}: ${error.message}`);
            throw new InternalServerErrorException('Failed to fetch emails');
        });
    }

    private handleIncomingMessages(
        fetchOperation: Imap.ImapFetch,
        userEmail: string,
        emailClient: Imap
    ): void {
        fetchOperation.on('message', (message, seqno) => {
            const emailMessage: EmailMessage = { headers: {}, content: '' };

            this.handleMessageBody(message, emailMessage);
            this.handleMessageEnd(message, emailMessage, userEmail, emailClient);
        });
    }

    private handleMessageBody(message: Imap.ImapMessage, emailMessage: EmailMessage): void {
        message.on('body', (stream, info) => {
            let buffer = '';

            stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
            });

            stream.on('end', () => {
                this.processMessageBuffer(buffer, info, emailMessage);
            });
        });
    }

    private processMessageBuffer(buffer: string, info: any, emailMessage: EmailMessage): void {
        if (info.which === 'HEADER.FIELDS (FROM TO SUBJECT)') {
            emailMessage.headers = Imap.parseHeader(buffer);
        } else if (info.which === 'TEXT') {
            emailMessage.content = buffer;
        }
    }

    private handleMessageEnd(
        message: Imap.ImapMessage,
        emailMessage: EmailMessage,
        userEmail: string,
        emailClient: Imap
    ): void {
        message.on('end', async () => {
            if (this.isInvalidEmailMessage(emailMessage)) {
                this.logger.warn(`Invalid email message received for ${userEmail}`);
                return;
            }

            try {
                await this.processValidEmail(emailMessage, userEmail, emailClient);
            } catch (error) {
                this.logger.error(`Failed to process email for ${userEmail}: ${error.message}`);
            }
        });
    }

    private isInvalidEmailMessage(emailMessage: EmailMessage): boolean {
        return !emailMessage.headers || !Object.keys(emailMessage.headers).length || !emailMessage.content;
    }

    private async processValidEmail(
        emailMessage: EmailMessage,
        userEmail: string,
        emailClient: Imap
    ): Promise<void> {
        const mailServer = await this.mailsService.findMailServer(userEmail);
        if (!mailServer) return;

        const savedEmail = await this.mailsService.saveEmailToDatabase(emailMessage, mailServer.id);
        await this.mailsService.setMetaDataToMail(savedEmail);

        this.markEmailsAsRead('*', emailClient, userEmail);
    }


    private markEmailsAsRead(messageRange: string, emailClient: Imap, userEmail: string): void {
        emailClient.addFlags(messageRange, ['\\Seen'], (error) => {
            if (error) {
                this.logger.error(`Failed to mark emails as read for ${userEmail}: ${error.message}`);
            }
        });
    }

    private async attemptReconnection(userEmail: string, emailClient: Imap, attempts = 0): Promise<void> {
        try {
            emailClient.end();
            const mailServer = await this.prismaService.mailServer.findFirst({
                where: { user: userEmail }
            });

            if (mailServer) {
                const newClient = this.createEmailClient(mailServer);
                this.addEmailClient(userEmail, newClient);
                this.setupEmailClientListeners(newClient, userEmail);
                newClient.connect();
            }
        } catch (error) {
            this.logger.error(`Reconnection attempt ${attempts + 1} failed for ${userEmail}: ${error.message}`);
            if (attempts < this.MAX_RECONNECT_TRIES) {
                const nextDelay = this.RECONNECT_DELAY_MS * Math.pow(2, attempts);
                setTimeout(() => {
                    this.attemptReconnection(userEmail, emailClient, attempts + 1);
                }, nextDelay);
            }
        }
    }

    addEmailClient(userEmail: string, client: Imap): void {
        try {
            this.emailClientsByUser.set(userEmail, client);
        } catch (error) {
            this.logger.error(`Failed to add email client for ${userEmail}: ${error.message}`);
            throw new InternalServerErrorException('Failed to add email client');
        }
    }

    removeEmailClient(userEmail: string): void {
        try {
            const client = this.emailClientsByUser.get(userEmail);
            if (client) {
                client.end();
                this.emailClientsByUser.delete(userEmail);
            }
        } catch (error) {
            this.logger.error(`Failed to remove email client for ${userEmail}: ${error.message}`);
            throw new InternalServerErrorException('Failed to remove email client');
        }
    }

    getEmailClient(userEmail: string): Imap | undefined {
        try {
            return this.emailClientsByUser.get(userEmail);
        } catch (error) {
            this.logger.error(`Failed to get email client for ${userEmail}: ${error.message}`);
            throw new InternalServerErrorException('Failed to get email client');
        }
    }
}
