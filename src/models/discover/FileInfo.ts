export interface RedisFileInfo {
    ContentType: string;
    LastModified: Date;
    OriginalFilename: string;
    OriginalEncoding: string;
    FileSize: string;
    newline: string;
    EscapeChar: string;
    QuoteChar: string;
    Separator: string;
    Encoding: string;
    OriginalNewLine: string;
    FileLocation: string;
}

export interface DiscoverFileInfo {
    redisFileInfo: RedisFileInfo;
    beingUsed: boolean;
}
