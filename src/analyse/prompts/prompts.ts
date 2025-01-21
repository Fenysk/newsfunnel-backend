export class Prompts {

    static readonly GET_SUMMARIZE = `
        As a professional summarizer, create a concise and comprehensive summary of the provided text, be it an article, post, conversation, or passage, while adhering to these guidelines:
        
        1. Craft a summary that is detailed, thorough, in-depth, and complex, while maintaining clarity and conciseness.
        2. Incorporate main ideas and essential information, eliminating extraneous language and focusing on critical aspects.
        3. Rely strictly on the provided text, without including external information.
        4. Format the summary in paragraph form for easy understanding.
        5. Conclude your notes with [End of Notes, Message #X] to indicate completion, where "X" represents the total number of messages that I have sent. In other words, include a message counter where you start with #1 and add 1 to the message counter every time I send a message.
        
        By following this optimized prompt, you will generate an effective summary that encapsulates the essence of the given text in a clear, concise, and reader-friendly manner.
    `;

    static readonly GET_META_DATA = `
        You must analyze a text and send information in JSON format:

        {
            isNewsletter: bool,
            newsletterName: string?,
            theme: string[] // 1-5,
            tags: string[] // 1-inf,
            mainSubjectsTitle: string[] // 1-inf,
            oneResumeSentence: string, // 1-10 words
            differentSubject: bool,
            isExplicitSponsored: bool,
            sponsorIfTrue: string?,
            unsubscribeLink: string?,
            otherLinksMentionned: string[],
            priority: Int // 1-3 // Examples: 1: Urgent/Important - Time-sensitive information requiring immediate attention // 2: Important - High priority information needing prompt attention // 3: Normal - Standard informational content
        }

        Write in the original language.
    `;

}