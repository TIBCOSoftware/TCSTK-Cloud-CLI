export interface SelectedAccount {
    displayName: string;
    accountId: string;
}

export interface AccountInfo {
    accountId: string;
    accountDisplayName: string;
    accountType: string;
    loggedInUserRole: string;
    ownersInfo: string[];
    subscriptionId: string;
    regions: string[];
    selected: boolean;
    index: string;
    childAccountsInfo: AccountInfo[];
}

export type Accounts = AccountInfo[];


export interface TenantRolesDetail {
    roleId: string;
    displayName: string;
    roleLinkDetails?: any;
    roleMetadata?: any;
}

export interface UserRolesDetailsForTenant {
    teamAdmin: boolean;
    tenantId: string;
    tenantRolesDetails: TenantRolesDetail[];
    region: string;
}

export interface RolesResponse {
    userEntityId: string;
    userRolesDetailsForTenants: UserRolesDetailsForTenant[];
}

export interface Sexp {
    BPM: number;
    SPOTFIRE: number;
    TCI: number;
}

export interface WhoAmI {
    email: string;
    firstName: string;
    lastName: string;
    admn: boolean;
    sexp: Sexp;
    aud: string[];
    ll: number;
    regn: string;
    auth: string;
    eula: boolean;
    accountsLength: number;
    accountsNumber: number;
    hasSubscription: boolean;
    hid: string;
    hacct: string;
}
