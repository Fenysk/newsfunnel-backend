import { Module } from '@nestjs/common';
import { AnalyseService } from './analyse.service';
import { ClaudeService } from './claude/claude.service';
import { AnalyseController } from './analyse.controller';
import { JsonService } from 'src/common/utils/json.service';
import { MarkdownService } from 'src/common/utils/markdown.service';

@Module({
  providers: [
    AnalyseService,
    ClaudeService,
    JsonService,
    MarkdownService,
  ],
  controllers: [AnalyseController],
  exports: [AnalyseService]
})
export class AnalyseModule { }
