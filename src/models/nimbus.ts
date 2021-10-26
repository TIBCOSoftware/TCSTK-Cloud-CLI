export interface Owner {
    id: number;
    name: string;
}

export interface Draft {
    mapId: string;
    name: string;
    owner: Owner;
}

export interface Owner2 {
    id: number;
    name: string;
}

export interface Master {
    mapId: string;
    name: string;
    owner: Owner2;
}

export interface Item {
    processId: string;
    mapFolderId: number;
    name: string;
    draft: Draft;
    master: Master;
    isMaster?: boolean;
}

export interface Breadcrumb {
    id: number;
    name: string;
}

export interface NimbusMapsResponse {
    items: Item[];
    breadcrumbs: Breadcrumb[];
}

