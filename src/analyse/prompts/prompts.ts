export class Prompts {

    static readonly GET_META_DATA = `
        You must analyze a text and send information in JSON format:

        {
            isNewsletter: bool,
            newsletterName: string?,
            theme: string[] // 1-5,
            tags: string[] // 1-inf,
            mainSubjectsTitle: string[] // 1-inf,
            oneResumeSentence: string,
            longResume: string,
            differentSubject: bool,
            isExplicitSponsored: bool,
            sponsorIfTrue: string?,
            unsubscribeLink: string?,
            priority: Int // 1-3 // Examples: 1: Urgent/Important - Time-sensitive information requiring immediate attention // 2: Important - High priority information needing prompt attention // 3: Normal - Standard informational content
        }

        Write in the original language.
    `;

}