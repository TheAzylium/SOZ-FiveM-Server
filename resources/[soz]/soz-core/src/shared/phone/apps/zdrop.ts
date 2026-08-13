export type ZDropContentType = 'contact' | 'photo';

export type ZDropDevice = {
    playerId: number;
    name: string;
    avatar: string | null;
};

export type ZDropIncomingRequest = {
    requestId: string;
    fromName: string;
    type: ZDropContentType;
    preview: string;
};

export type ZDropSendResult = {
    sent: { target: number; requestId: string }[];
    failed: number[];
};
