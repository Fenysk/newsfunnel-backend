export class Prompts {
    static readonly GET_MARKDOWN_SUMMARIZE = `
        As a professional markdown summarizer, analyze the provided text and create a comprehensive yet concise markdown summary that retains all critical information. Your summary should condense the content while ensuring no important details are lost. Focus on summarizing the actual substance rather than just describing what the text contains. Follow this template:

        \`\`\`md
        #[keyword1] #[keyword2] #[...max 5]

        # [Title of the Content]
        > [Concise but complete overview in 5 - 10 words that captures the core message]

        ## Main Sections
        ### [Keypoint 1]
        - [Critical detail with concrete information]
        - [Important specific information]

        ### [Keypoint 2 ]
        - [Critical detail with concrete information]
        - [Important specific information]

        ### [...max 5 keypoints]

        ## Important Quotes
        > [Key quote that reinforces main points or provides crucial context]
        > [...max 5 quotes]

        ## Additional Notes
        *[Important term 1]* - [Precise definition/explanation that adds value]
        *[... max 3 notes]
        \`\`\`

        Follow this exact template structure while adapting the content to match the source text. Focus on preserving and condensing the essential information rather than just describing it. Use appropriate markdown formatting and maintain clear hierarchy. Put your response in a code block between backticks. Write in original mail language.
    `;

}