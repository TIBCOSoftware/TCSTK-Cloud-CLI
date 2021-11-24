export interface TCIAppInfo {
    appId: string;
    appName: string;
    appType: string;
    category: string;
    createdTime: number;
    deploymentStage: string;
    deploymentType: string;
    desiredInstanceCount: number;
    endpointVisibility: string;
    lastStartedTime: number;
    modifiedTime: any;
}

export interface TCIAppDetails {
    appId: string;
    appName: string;
    appType: string;
    category: string;
    createdByName: string;
    createdTime: number;
    deploymentStage: string;
    deploymentType: string;
    description: string;
    desiredInstanceCount: number;
    endpointVisibility: string;
    lastStartedTime: number;
    modifiedTime: number;
    ownerName: string;
    tunnelKey: string;
}

export interface Info {
    description: string;
    title: string;
    version: string;
}

export interface ApiSpec {
    basePath: string;
    definitions: any;
    host: string;
    info: Info;
    paths: any;
    schemes: string[];
    swagger: string;
}

export interface TCIEndpoint {
    endpointId: string;
    endpointVisibility: string;
    url: string;
    apiSpec: ApiSpec;
}
