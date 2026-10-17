export interface ServiceInterface {
    id?: string;
    title: string;
    price: number;
    duration: number;
    description?: string | null;
    image?: File | string | null;
    category?: string | null;
    /** Señal a pagar online al reservar */
    deposit?: number | null;
    order?: number;
    /** Profesionales que lo realizan (vacío = todos) */
    staffIds?: string[];
}
