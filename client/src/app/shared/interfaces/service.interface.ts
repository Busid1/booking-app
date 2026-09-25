export interface ServiceInterface {
    id?: string;
    title: string;
    price: number;
    duration: number;
    description?: string | null;
    image?: File | string | null;
}
