export interface SFCopyRequest {
    itemsToCopy: string[],
    destinationFolderId: string,
    conflictResolution: 'KeepBoth'
}

export interface SFCreateFolderRequest {
    description: string;
    keywords: string;
    parentId: string;
    title: string;
}

export type SFType =
    'spotfire.folder'
    | 'spotfire.dxp'
    | 'spotfire.mod'
    | 'spotfire.query'
    | 'spotfire.sbdf'
    | 'spotfire.dataconnection'
    | 'NONE'
    | 'ALL';

export interface SFLibObject {
    Id: string;
    Title: string;
    Description: string;
    CreatedDate: string;
    CreatedTimestamp: number;
    CreatedByName: string;
    ModifiedDate: string;
    ModifiedTimestamp: number;
    ModifiedByName: string;
    IsFolder: boolean;
    ItemType: string;
    Size: number;
    Path: string;
    ParentId: string;
    Permissions: string;
    ParentPermissions?: string;
    HasPreview: boolean;
    DisplayPath: string;
    DisplayName: string;
}


export interface SFFolderInfo {
    CurrentFolder: SFLibObject;
    Children: SFLibObject[];
    Ancestors: SFLibObject[];
}


