import { Controller, Post, Body } from '@nestjs/common';
import { ClaudeService } from './claude/claude.service';
import { Prompts } from './prompts/prompts';
import { NewsletterMetaDataResponse } from './dto/article-meta-data.response';
import { AnalyseService } from './analyse.service';

@Controller('analyse')
export class AnalyseController {
    constructor(
        private readonly claudeService: ClaudeService,
        private readonly analyseService: AnalyseService
    ) { }

    @Post('getNewletterMetaData')
    async getNewletterMetaData(
        @Body('text') text: string
    ): Promise<NewsletterMetaDataResponse> {
        const analysis = await this.analyseService.getNewletterMetaData(text);

        return analysis;
    }

}
