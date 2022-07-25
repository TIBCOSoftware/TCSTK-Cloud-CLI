export interface SelectedAccount {
    displayName: string;
    accountId: string;
}

export interface AccountInfo {
    accountId: string;
    accountDisplayName: string;
    accountType: string;
    loggedInUserRole: string;
    ownersInfo: OwnersInfo[];
    childAccountsInfo: ChildAccountsInfo[];
    subscriptionId: string;
    regions: string[];
    accountSettings: AccountSettings;
    hs: string;
    selected: boolean;
    index: string;
    [x: string]: any;
}

export interface OwnersInfo {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
}

// export interface OwnersInfo2 {
//     firstName: string;
//     lastName: string;
//     email: string;
//     role: string;
// }

// export interface AccountSettings {
//     childLimit: number;
//     ownerLimit: number;
//     accountType: string;
//     syncUser: boolean;
//     syncSubscription: boolean;
//     siblingLimit: number;
//     inheritUsers: boolean;
//     inheritSubscriptions: boolean;
//     testOrg: boolean;
//     sandboxOrg: boolean;
//     serviceAccountLimit: number;
//     whitelistCidrLimit: number;
// }

export interface ChildAccountsInfo {
    accountId: string;
    accountDisplayName: string;
    accountType: string;
    loggedInUserRole: string;
    ownersInfo: OwnersInfo[];
    subscriptionId: string;
    accountSettings: AccountSettings;
    hs: string;
    selected: boolean;
    index: string;
}

export interface AccountSettings {
    childLimit: number;
    ownerLimit: number;
    accountType: string;
    syncUser: boolean;
    syncSubscription: boolean;
    siblingLimit: number;
    inheritUsers: boolean;
    inheritSubscriptions: boolean;
    testOrg: boolean;
    sandboxOrg: boolean;
    serviceAccountLimit: number;
    whitelistCidrLimit: number;
}

// export interface AccountInfo {
//     accountId: string;
//     accountDisplayName: string;
//     accountType: string;
//     loggedInUserRole: string;
//     ownersInfo: OwnersInfo[];
//     childAccountsInfo: ChildAccountsInfo[];
//     subscriptionId: string;
//     regions: string[];
//     accountSettings: AccountSettings;
//     hs: string;
//     selected: boolean;
//     index: string;
// }


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
