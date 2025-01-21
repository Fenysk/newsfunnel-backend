import { Injectable } from '@nestjs/common';
import { ClaudeService } from './claude/claude.service';
import { Prompts } from './prompts/prompts';
import { MarkdownService } from 'src/common/utils/markdown.service';

@Injectable()
export class AnalyseService {
    constructor(
        private readonly claudeService: ClaudeService,
        private readonly markdownService: MarkdownService
    ) { }

    async summarizeNewsletterToMarkdown(
        content: string
    ): Promise<string> {
        const markdownResponse = await this.claudeService.getRawResponse({
            prompt: Prompts.GET_MARKDOWN_SUMMARIZE,
            userInput: content
        });

        console.log(markdownResponse);

        if (!this.markdownService.hasValidMarkdown(markdownResponse)) 
            throw new Error('Invalid markdown response from Claude');

        return this.markdownService.extractMarkdown(markdownResponse);
    }

}