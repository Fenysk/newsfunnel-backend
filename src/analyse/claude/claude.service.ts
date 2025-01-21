import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '@nestjs/config';
import { JsonService } from 'src/common/utils/json.service';

@Injectable()
export class ClaudeService {
    private readonly anthropicClient: Anthropic;

    constructor(
        private readonly configService: ConfigService,
        private readonly jsonService: JsonService,
    ) {
        this.anthropicClient = new Anthropic({
            apiKey: configService.get('CLAUDE_API_KEY')
        })
    }

    async getRawResponse({
        prompt,
        userInput,
    }: {
        prompt: string,
        userInput: string
    }): Promise<string> {
        try {
            const response = await this.anthropicClient.messages.create({
                model: "claude-3-sonnet-20240229", 
                max_tokens: 1024,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    },
                    {
                        role: "user",
                        content: userInput
                    }
                ],
            });

            return response.content[response.content.length - 1]['text'];
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Failed to get Claude response: ${errorMessage}`);
        }
    }

    async analyzeText({
        prompt,
        userInput,
    }: {
        prompt: string,
        userInput: string
    }): Promise<string> {
        try {
            const response = await this.anthropicClient.messages.create({
                model: "claude-3-sonnet-20240229",
                max_tokens: 1024,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    },
                    {
                        role: "user",
                        content: userInput
                    }
                ],
            });

            const responseText = response.content[response.content.length - 1]['text'];

            const parsedResponse = this.jsonService.extract(responseText) as string;

            return parsedResponse;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new Error(`Failed to analyze text: ${errorMessage}`);
        }
    }
}
