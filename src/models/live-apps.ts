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

export interface JsonSchema {
    $schema: string;
    definitions: any[];
    properties: any[];
    type: string;
    required: string[];
}

export interface Process {
    jsonSchema: JsonSchema;
    name: string;
    id: string;
    formTag: string;
    processType: string;
    unsupportedForm: boolean;
}

export interface LAGroup {
    id: string;
    name: string;
    description?: string;
    type?: 'AllUsers' | 'Administrator' | 'ApplicationDeveloper' | 'UIDeveloper' | 'SubscriptionDefined';
}

export interface Content {
    json: any;
}

export interface Attribute {
    name: string;
    value: string;
    id: string;
    stateId: string;
}

export interface Role {
    entityId: string;
    role: string;
    id: string;
    stateId: string;
    entityName: string;
    entityType: string;
}

export interface LinkAttribute {
    name: string;
    value: string;
    id: string;
    linkedId: string;
    stateId: string;
}

export interface Link {
    linkedStateId: string;
    attributes: LinkAttribute[];
    id: string;
    stateId: string;
}

export interface SharedStateINFO {
    id: string;
    name: string;
    content: Content;
    type: 'PRIVATE' | 'SHARED' | 'PUBLIC' ;
    description: string;
    sandboxId: string;
    scope: string;
    attributes: Attribute[];
    roles: Role[];
    links: Link[];
    createdById?: string;
    createdByName?: string;
    createdDate?: Date;
    modifiedById?: string;
    modifiedByName?: string;
    modifiedDate?: Date;
    isOrphaned?: boolean;
    isAbandoned?: boolean;
}

export interface LastPublished {
    applicationVersion: number;
    dateChanged: any;
    changedBy: string;
    rascId: string;
}

export interface LADesignTimeApp {
    id: string;
    name: string;
    owner: string;
    creationDate: any;
    modificationDate: any;
    latestVersion: number;
    latestClientValidationState: string;
    latestServerValidationState: string;
    latestValidationState: string;
    latestGovernanceState: string;
    adminState: string;
    adminStateVersionId: string;
    latestVersionId: string;
    lastModifiedBy: string;
    lastFinalized?: any;
    lastPublished: LastPublished;
    lastWithdrawn?: any;
    inBin: boolean;
}

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
