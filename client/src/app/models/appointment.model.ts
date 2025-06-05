export interface Appointment {
  id?: string;
  userId: string;
  date: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}