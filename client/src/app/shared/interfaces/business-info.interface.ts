export interface SocialLinks {
    instagram?: string | null;
    tiktok?: string | null;
    facebook?: string | null;
    whatsapp?: string | null;
    x?: string | null;
    youtube?: string | null;
    website?: string | null;
}

export interface BusinessInfoInterface extends SocialLinks {
    name: string;
    description: string;
    address: string;
    phone: string;
    email: string;
    images?: string[];
    logo?: string | null;
    primaryColor?: string | null;
    /** Horas mínimas de antelación para cancelar (0 = sin límite) */
    cancellationHours?: number;
}

export interface PublicConfig {
    turnstileSiteKey: string | null;
    payments: boolean;
    email: boolean;
    googleCalendar: boolean;
    timeZone: string;
}
