export interface NuiPoliceMethodMap {
    SetRadarOpen: boolean;
    UpdateRadar: string;
    OpenBreathAnalyzer: number;
    OpenScreeningTest: boolean;
    OpenDetectiveBoard: NuiPoliceDetectiveBoardParams;
    OpenScientistCamera: void;
    OpenScientistPhoto: string;
    TakePhotoScientistCamera: void;
    CloseScientistCamera: void;
}

export interface NuiPoliceDetectiveBoardParams {
    inventorySlot: number;
    dataBoard: any;
    editable: boolean;
    photoUrls: string[];
}
