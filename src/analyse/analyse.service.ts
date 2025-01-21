import { Injectable } from '@nestjs/common';
import { ClaudeService } from './claude/claude.service';
import { Prompts } from './prompts/prompts';
import { NewsletterMetaDataResponse } from './dto/article-meta-data.response';

@Injectable()
export class AnalyseService {
    constructor(
        private readonly claudeService: ClaudeService,
    ) { }

    async getNewletterMetaData(
        content: string
    ): Promise<NewsletterMetaDataResponse> {
        const summarize = await this.claudeService.getRawResponse({
            prompt: Prompts.GET_SUMMARIZE,
            userInput: content,
        })

        const analysisJsonString = await this.claudeService.analyzeText({
            prompt: Prompts.GET_META_DATA,
            userInput: summarize
        });

        const analysis = NewsletterMetaDataResponse.fromJSON(analysisJsonString);
        
        analysis.longResume = summarize;

        return analysis;
    }

}