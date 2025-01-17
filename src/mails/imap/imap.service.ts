import { Injectable } from '@nestjs/common';
import { MailServer } from '@prisma/client';
import * as Imap from 'node-imap';

@Injectable()
export class ImapService {
    private readonly imapClients: Map<string, Imap>;

    constructor() {
        this.imapClients = new Map();
    }

    createImapClient(mailServer: MailServer): Imap {
        return new Imap({
            user: mailServer.user,
            password: mailServer.password,
            host: mailServer.host,
            port: mailServer.port,
            tls: mailServer.tls
        });
    }

    setupImapEventListeners(imapClient: Imap, user: string): void {
        imapClient.once('ready', () => {
            this.handleImapReady(imapClient, user);
        });

        imapClient.once('error', (err) => {
            console.error(`IMAP Error for ${user}:`, err);
        });
    }

    private handleImapReady(imapClient: Imap, user: string): void {
        console.log(`IMAP client ready for ${user}`);

        imapClient.openBox('INBOX', false, (err) => {
            if (err) throw err;

            imapClient.on('mail', (numNew) => {
                console.log(`New message(s) received for ${user}: ${numNew}`);
                this.fetchNewEmails(user);
            });
        });
    }

    private async fetchNewEmails(user: string): Promise<void> {
        const imapClient = this.imapClients.get(user);
        if (!imapClient) {
            throw new Error(`No IMAP client found for user: ${user}`);
        }

        const fetch = imapClient.seq.fetch('*', {
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT)', 'TEXT'],
        });

        fetch.on('message', (msg) => {
            this.handleNewMessage(msg, user);
        });
    }

    private handleNewMessage(msg: any, user: string): void {
        let headerInfo = {};
        let bodyInfo = '';

        msg.on('body', (stream, info) => {
            let buffer = '';
            stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
            });

            stream.once('end', () => {
                if (info.which === 'TEXT') {
                    bodyInfo = buffer;
                } else {
                    headerInfo = Imap.parseHeader(buffer);
                }
            });
        });

        msg.once('end', () => {
            console.log(`Processed message for ${user}:`, {
                headers: headerInfo,
                body: bodyInfo
            });
        });
    }

    addImapClient(user: string, client: Imap): void {
        this.imapClients.set(user, client);
    }

    removeImapClient(user: string): void {
        if (this.imapClients.has(user)) {
            const client = this.imapClients.get(user);
            client.end();
            this.imapClients.delete(user);
        }
    }

    getImapClient(user: string): Imap | undefined {
        return this.imapClients.get(user);
    }
}
