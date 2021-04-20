export interface LApp {
    actions: Process[];
    applicationId: string;
    applicationInternalName: string;
    applicationName: any;
    applicationVersion: number;
    attributes: CaseAttribute[];
    creators: Process[];
    id: string;
    isCase: boolean
    label: any;
    name: string;
    states: CaseTypeState[];
    jsonSchema: JsonSchema;
}

export interface CaseAttribute {
    isIdentifier: boolean;
    isMandatory: boolean;
    isStructuredType: true;
    label: string;
    name: string;
    type: string;
    maximum: number;
    minimum: number;
}

export interface CaseTypeState {
    id: string;
    label: string;
    value: string;
    isTerminal: boolean;
}

export interface Process {
    jsonSchema: JsonSchema;
    name: string;
    id: string;
    formTag: string;
    processType: string;
    unsupportedForm: boolean;
}

export interface JsonSchema {
    $schema: string;
    definitions: any[];
    properties: any[];
    type: string;
    required: string[];
}

export interface LAGroup {
    id: string;
    name: string;
    description?: string;
    type?: 'AllUsers' | 'Administrator' | 'ApplicationDeveloper' | 'UIDeveloper' | 'SubscriptionDefined';
}
