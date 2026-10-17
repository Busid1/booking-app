export interface TimeBlock {
    openTime: string;
    closeTime: string;
}

export interface BusinessHoursInterface {
    /** 0 = lunes ... 6 = domingo */
    dayOfWeek: number;
    timeBlocks: TimeBlock[];
    isClosed: boolean;
}
