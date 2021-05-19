
export type Category =
    "tcli"
    | "cloud-starters"
    | "live-apps"
    | "shared-state"
    | "cloud-files"
    | "tci"
    | "messaging"
    | "spotfire"
    | "oauth";
export type OperatingSystem = "all" | "win32" | "darwin";

export interface TCLITask {
    task: string;
    description: string;
    enabled: boolean;
    internal: boolean;
    multipleInteraction: boolean;
    taskAlternativeNames: string[];
    availableOnOs: OperatingSystem[];
    category: Category;
    taskFullName?: string;
}

export interface Template {
    name: string;
    displayName: string;
    enabled: boolean;
    templateFolder: string;
    useGit: boolean;
    git: string;
    gitTag: string;
    removeGitFolder: boolean;
    gitPostCommands: any[];
    gitPostCommandsWin: any[];
    PostCommands: string[];
    PostCommandsWin: any[];
    replacements: Replacement[];
}

export interface Replacement {
    from: string;
    to: string;
}

export interface Entry {
    header: string;
    field: string;
    format: string;
}

export interface Mapping {
    entries: Entry[];
}

export interface MappingGroup {
    [key:string]: Mapping;
}

export interface CallConfig {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    postRequest?: any;
    contentType?: string;
    tenant?: string;
    customLoginURL?: string;
    returnResponse?: boolean;
    forceOAUTH?: boolean;
    forceCLIENTID?: boolean;
    handleErrorOutside?: boolean;
    customHeaders?: any;
    manualOAUTH?: string;
}

export interface OAUTHConfig {
    Token_Name?: string;
    Region?: string;
    User?: string;
    Org?: string;
    Scope?: string;
    Expiry_Date?: number;
    Expiry_Date_Display?: string;
    /* added this since the object is parsed */
    [key: string]:any;
}


export interface PEXConfig {
    export: boolean;
    tables: string;
    folder: string;
    filePreFix?: string;
}

export interface ORGFile {
    REGION: string;
    PROPERTY_FILE_NAME: string;
    PROP: string;
    ACCOUNT_ID: string;
}

export interface ORGInfo {
    name?: string
    accountDisplayName?: string;
    accountId?: string;
    ownersInfo?: any;
    regions?: any;
    childAccountsInfo?: any;
    [x: string]: any;
}

export interface LCookie {
    domain: string
    tsc: string;
}

export type LoginCookie = LCookie | 'ERROR' | null;
