import { ServiceInterface } from "./service.interface";

export interface AppointmentInterface {
  id?: string;
  userId: string;
  date: string;
  service: ServiceInterface;
  status: 'pending' | 'confirmed' | 'cancelled';
}