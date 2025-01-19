export interface EmailMessage {
    headers: {
        from?: string[];
        to?: string[];
        subject?: string[];
    };
    content: string;
}