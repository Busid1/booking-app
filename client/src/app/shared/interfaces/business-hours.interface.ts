interface TimeBlock {
    openTime: string,
    closeTime: string,
}

export interface BusinessHoursInterface {
    dayOfWeek: number;
    timeBlocks: TimeBlock[];
    isClosed: boolean;
}