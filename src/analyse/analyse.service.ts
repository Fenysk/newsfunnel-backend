import { Injectable } from '@nestjs/common';
import { ClaudeService } from './claude/claude.service';
import { Prompts } from './prompts/prompts';
import { NewsletterMetaDataResponse } from './dto/article-meta-data.response';
import { MailMetadata } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AnalyseService {
    constructor(
        private readonly claudeService: ClaudeService,
        private readonly prismaService: PrismaService,
    ) { }

    async getNewletterMetaData(
        content: string
    ): Promise<NewsletterMetaDataResponse> {

        const analysisJson = await this.claudeService.analyzeText({
            context: Prompts.GET_META_DATA,
            userInput: content
        });

        const analysis = NewsletterMetaDataResponse.fromJSON(analysisJson);

        return analysis;
    }

}