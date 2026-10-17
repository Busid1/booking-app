import { ServiceInterface } from './service.interface';

export interface AppointmentInterface {
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceId: string;
  staffId?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  status?: 'confirmed' | 'pending_payment';
  googleEventId?: string | null;
  userId?: string | null;
  manageToken?: string | null;
  depositPaid?: number | null;
  service?: ServiceInterface;
  user?: { id: string; email: string; name: string | null; phone?: string | null } | null;
  staff?: { id: string; name: string; photo?: string | null; color?: string; slug?: string } | null;
  review?: { id: string; rating: number } | null;
  /** Solo al crear una reserva con señal: URL de pago de Stripe */
  checkoutUrl?: string;
}

/** Vista pública de una cita gestionada con su código (invitados y enlaces de email). */
export interface ManagedAppointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'pending_payment';
  clientName: string;
  service: { id: string; title: string; price: number; duration: number; image?: string | null };
  staff: { id: string; name: string; photo?: string | null; color?: string } | null;
  depositPaid?: number | null;
  cancellationHours: number;
  canCancel: boolean;
  canReview: boolean;
  review?: { id: string; rating: number } | null;
  ended: boolean;
  manageToken: string;
}

export interface BusySlot {
  startTime: string;
  endTime: string;
}
