import { Controller, Post, Body, Param } from '@nestjs/common';
import { ClaudeService } from './claude/claude.service';
import { AnalyseService } from './analyse.service';

@Controller('analyse')
export class AnalyseController {
    constructor(
        private readonly claudeService: ClaudeService,
        private readonly analyseService: AnalyseService,
    ) { }

    @Post()
    async summarizeNewsletterToMarkdown(
        @Body('text') text: string
    ): Promise<string> {
        const analysis = await this.analyseService.summarizeNewsletterToMarkdown(text);

        return analysis;
    }

}
