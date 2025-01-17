import { Module } from '@nestjs/common';
import { AnalyseService } from './analyse.service';
import { ClaudeService } from './claude/claude.service';
import { AnalyseController } from './analyse.controller';
import { JsonService } from 'src/common/utils/json.service';

@Module({
  providers: [
    AnalyseService,
    ClaudeService,
    JsonService,
  ],
  controllers: [AnalyseController],
  exports: [AnalyseService]
})
export class AnalyseModule { }
