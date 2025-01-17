import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from "argon2";
import * as crypto from 'crypto';

@Injectable()
export class SecurityService {
    private readonly ALGORITHM = 'aes-256-gcm';
    private readonly IV_LENGTH = 12;
    private readonly AUTH_TAG_LENGTH = 16;

    constructor(
        private readonly configService: ConfigService
    ) { }

    async hashData({
        data
    }: {
        data: string
    }): Promise<string> {
        try {
            const secret = Buffer.from(this.configService.getOrThrow<string>("ARGON2_SECRET"));

            const hashedData = await argon2.hash(data, {
                secret: secret,
            });

            return hashedData;
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException(`Failed to hash data: ${error.message}`);
        }
    }

    async verifyData({
        hashedData,
        dataToCompare
    }: {
        hashedData: string,
        dataToCompare: string
    }): Promise<boolean> {
        try {
            const secret = Buffer.from(this.configService.getOrThrow<string>("ARGON2_SECRET"));

            const isDataMatched = await argon2.verify(hashedData, dataToCompare, {
                secret: secret,
            });

            return isDataMatched;
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException(`Failed to verify data: ${error.message}`);
        }
    }

    async encryptData({
        initialData
    }: {
        initialData: string
    }): Promise<string> {
        try {
            const encryptionKey = Buffer.from(this.configService.getOrThrow<string>('ENCRYPTION_KEY'));
            const initializationVector = crypto.randomBytes(this.IV_LENGTH);

            const cipher = crypto.createCipheriv(this.ALGORITHM, encryptionKey, initializationVector);
            const encryptedBuffer = Buffer.concat([cipher.update(initialData, 'utf8'), cipher.final()]);
            const authTag = cipher.getAuthTag();

            const result = Buffer.concat([initializationVector, authTag, encryptedBuffer]);
            return result.toString('base64');
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException(`Failed to encrypt data: ${error.message}`);
        }
    }

    async decryptData({
        encryptedData
    }: {
        encryptedData: string
    }): Promise<string> {
        try {
            const encryptionKey = Buffer.from(this.configService.getOrThrow<string>('ENCRYPTION_KEY'));
            const buffer = Buffer.from(encryptedData, 'base64');

            const initializationVector = buffer.subarray(0, this.IV_LENGTH);
            const authTag = buffer.subarray(this.IV_LENGTH, this.IV_LENGTH + this.AUTH_TAG_LENGTH);
            const encryptedBuffer = buffer.subarray(this.IV_LENGTH + this.AUTH_TAG_LENGTH);

            const decipher = crypto.createDecipheriv(this.ALGORITHM, encryptionKey, initializationVector);
            decipher.setAuthTag(authTag);

            const decryptedBuffer = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
            return decryptedBuffer.toString('utf8');
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException(`Failed to decrypt data: ${error.message}`);
        }
    }
}
