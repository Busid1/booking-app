import { BusinessHoursInterface, TimeBlock } from './business-hours.interface';

/** Datos públicos de un profesional. */
export interface StaffInterface {
  id: string;
  name: string;
  slug: string;
  bio?: string | null;
  photo?: string | null;
  color: string;
  serviceIds: string[];
  schedule: BusinessHoursInterface[];
  rating?: number | null;
  reviewCount?: number;
}

export interface StaffHours {
  dayOfWeek: number;
  isClosed: boolean;
  timeBlocks: TimeBlock[];
}

/** Datos completos para el panel de administración. */
export interface StaffAdmin {
  id: string;
  name: string;
  slug: string;
  bio?: string | null;
  photo?: string | null;
  color: string;
  active: boolean;
  order: number;
  useBusinessHours: boolean;
  calendarId?: string | null;
  serviceIds: string[];
  accessEmail: string;
  hours: StaffHours[];
}

export type StaffPayload = Omit<StaffAdmin, 'id' | 'slug' | 'photo' | 'order'> & { order?: number };
