
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

