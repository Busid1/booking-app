import { ServiceInterface } from './service.interface';

export interface AppointmentInterface {
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceId: string;
  clientName?: string | null;
  googleEventId?: string | null;
  userId?: string;
  service?: ServiceInterface;
  user?: { id: string; email: string; name: string | null };
}

export interface BusySlot {
  startTime: string;
  endTime: string;
}
