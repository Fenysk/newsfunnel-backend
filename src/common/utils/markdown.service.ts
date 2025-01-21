import { Injectable } from '@nestjs/common';

@Injectable()
export class MarkdownService {
    /**
     * Extracts markdown content from a code block
     * @param content The content containing markdown code blocks
     * @returns The extracted markdown content
     * @throws Error if no markdown code block is found
     */
    public extractMarkdown(content: string): string {
        try {
            const markdownBlockStart = content.indexOf('```md');
            if (markdownBlockStart === -1) {
                throw new Error('No markdown code block found in content');
            }

            const contentAfterStart = content.substring(markdownBlockStart + 5);
            const markdownBlockEnd = contentAfterStart.indexOf('```');
            
            if (markdownBlockEnd === -1) {
                throw new Error('Malformed markdown: no closing code block found');
            }

            const markdownContent = contentAfterStart.substring(0, markdownBlockEnd).trim();

            if (!markdownContent) {
                throw new Error('Empty markdown content');
            }

            return markdownContent;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Error extracting markdown: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Checks if content contains a valid markdown code block
     * @param content The content to check
     * @returns boolean
     */
    public hasValidMarkdown(content: string): boolean {
        try {
            this.extractMarkdown(content);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Extracts multiple markdown code blocks from content
     * @param content The content to parse
     * @returns Array of markdown content strings
     */
    public extractMultipleMarkdown(content: string): string[] {
        const results: string[] = [];
        let currentContent = content;

        while (currentContent.includes('```md')) {
            try {
                const markdownContent = this.extractMarkdown(currentContent);
                results.push(markdownContent);

                const endIndex = currentContent.indexOf('```', currentContent.indexOf('```md') + 5) + 3;
                currentContent = currentContent.substring(endIndex);
            } catch {
                break;
            }
        }

        return results;
    }
}