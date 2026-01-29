export type SessionStatus =
  | 'requested'
  | 'booked'
  | 'paid'
  | 'canceled'
  | 'completed'
  | 'no_show';

export interface Session {
  id: string;
  mentorId: string;
  menteeId: string;
  serviceId: string;
  slotId: string;
  status: SessionStatus;
  startAt: Date;
  endAt: Date;
  createdAt: Date;
  canceledAt?: Date;
  cancelReason?: string;
}

export interface Review {
  id: string;
  sessionId: string;
  menteeId: string;
  mentorId: string;
  rating: number;
  text: string;
  createdAt: Date;
}
