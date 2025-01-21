import { IsArray, IsBoolean, IsString, IsOptional, IsNumber } from 'class-validator';

export class NewsletterMetaDataResponse {
    @IsBoolean()
    isNewsletter: boolean;

    @IsString()
    @IsOptional() 
    newsletterName: string | null;

    @IsArray()
    @IsString({ each: true })
    theme: string[];

    @IsArray()
    @IsString({ each: true })
    tags: string[];

    @IsArray()
    @IsString({ each: true })
    mainSubjectsTitle: string[];

    @IsString()
    oneResumeSentence: string;

    @IsString()
    longResume: string;

    @IsBoolean()
    differentSubject: boolean;

    @IsBoolean()
    isExplicitSponsored: boolean;

    @IsString()
    @IsOptional()
    sponsorIfTrue: string | null;

    @IsString()
    @IsOptional()
    unsubscribeLink: string | null;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    otherLinksMentionned: string[] | null;

    @IsNumber()
    priority: number;

    static fromJSON(json: any): NewsletterMetaDataResponse {
        const response = new NewsletterMetaDataResponse();
        
        response.isNewsletter = json.isNewsletter;
        response.newsletterName = json.newsletterName;
        response.theme = json.theme;
        response.tags = json.tags;
        response.mainSubjectsTitle = json.mainSubjectsTitle;
        response.oneResumeSentence = json.oneResumeSentence;
        response.longResume = json.longResume;
        response.differentSubject = json.differentSubject;
        response.isExplicitSponsored = json.isExplicitSponsored;
        response.sponsorIfTrue = json.sponsorIfTrue;
        response.unsubscribeLink = json.unsubscribeLink;
        response.otherLinksMentionned = json.otherLinksMentionned;
        response.priority = json.priority;

        return response;
    }
}