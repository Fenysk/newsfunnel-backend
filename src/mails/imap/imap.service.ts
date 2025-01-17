import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { MailServer } from '@prisma/client';
import * as Imap from 'node-imap';
import { PrismaService } from 'src/prisma/prisma.service';

interface MessageData {
    headerInfo: {
        from?: string[];
        to?: string[];
        subject?: string[];
    };
    bodyInfo: string;
}

interface ImapFetchOptions {
    bodies: string[];
}

@Injectable()
export class ImapService {
    private readonly imapClients: Map<string, Imap>;
    private readonly logger = new Logger(ImapService.name);

    constructor(private readonly prismaService: PrismaService) {
        this.imapClients = new Map();
    }

    createImapClient(mailServer: MailServer): Imap {
        try {
            return new Imap({
                user: mailServer.user,
                password: mailServer.password,
                host: mailServer.host,
                port: mailServer.port,
                tls: mailServer.tls
            });
        } catch (error) {
            this.handleError('Failed to create IMAP client', error);
        }
    }

    setupImapEventListeners(imapClient: Imap, user: string): void {
        imapClient.on('ready', () => {
            this.logger.log(`IMAP client ready for user: ${user}`);
            this.listenForNewEmails(imapClient, user);
        });

        imapClient.on('error', (error) => {
            this.handleError(`IMAP error for user ${user}`, error);
        });

        imapClient.on('end', () => {
            this.logger.log(`IMAP connection ended for user: ${user}`);
        });
    }

    private async listenForNewEmails(imapClient: Imap, user: string): Promise<void> {
        try {
            imapClient.openBox('INBOX', false, (err, box) => {
                if (err) throw err;

                imapClient.on('mail', () => {
                    const fetchOptions: ImapFetchOptions = { bodies: ['HEADER.FIELDS (FROM TO SUBJECT)', 'TEXT'] };
                    const fetch = imapClient.seq.fetch('*', fetchOptions);

                    fetch.on('message', (msg) => {
                        const messageData: MessageData = {
                            headerInfo: {},
                            bodyInfo: ''
                        };

                        msg.on('body', (stream, info) => {
                            let buffer = '';
                            stream.on('data', (chunk) => {
                                buffer += chunk.toString('utf8');
                            });

                            stream.on('end', () => {
                                if (info.which.includes('HEADER')) {
                                    const header = Imap.parseHeader(buffer);
                                    messageData.headerInfo = header;
                                } else {
                                    messageData.bodyInfo = buffer;
                                }
                            });
                        });

                        msg.on('end', async () => {
                            await this.saveMail(user, messageData);
                        });
                    });
                });
            });
        } catch (error) {
            this.handleError('Failed to listen for new emails', error);
        }
    }

    private async saveMail(user: string, messageData: MessageData): Promise<void> {
        try {
            const mailServer = await this.prismaService.mailServer.findFirst({
                where: { user: user }
            });

            if (!mailServer) return;

            await this.prismaService.mail.create({
                data: {
                    from: messageData.headerInfo.from?.[0] || '',
                    to: messageData.headerInfo.to?.[0] || '',
                    subject: messageData.headerInfo.subject?.[0] || '',
                    body: messageData.bodyInfo,
                    mailServerId: mailServer.id
                }
            });
        } catch (error) {
            this.handleError('Failed to save mail to database', error);
        }
    }

    addImapClient(user: string, client: Imap): void {
        try {
            this.imapClients.set(user, client);
        } catch (error) {
            this.handleError('Failed to add IMAP client', error);
        }
    }

    removeImapClient(user: string): void {
        try {
            const client = this.imapClients.get(user);
            if (client) {
                client.end();
                this.imapClients.delete(user);
            }
        } catch (error) {
            this.handleError('Failed to remove IMAP client', error);
        }
    }

    getImapClient(user: string): Imap | undefined {
        try {
            return this.imapClients.get(user);
        } catch (error) {
            this.handleError('Failed to get IMAP client', error);
        }
    }

    private handleError(message: string, error: Error): never {
        this.logger.error(`${message}: ${error.message}`);
        throw new InternalServerErrorException(message);
    }
}
