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

