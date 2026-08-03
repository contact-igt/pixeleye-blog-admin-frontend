export type SubscriberStatus = 'pending' | 'subscribed' | 'unsubscribed';

export interface Subscriber {
  id: string;
  email: string;
  status: SubscriberStatus;
  source: string | null;
  consent_text: string | null;
  consent_version: string | null;
  consent_at: string | null;
  verification_sent_at: string | null;
  verified_at: string | null;
  unsubscribed_at: string | null;
  resubscription_requested_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminCreateSubscriberPayload {
  email: string;
  source?: string;
  consent_note?: string;
}

export interface AdminCreateSubscriberResponse {
  id: string;
  email: string;
  status: 'pending';
  source: string;
  verification_sent_at: string;
  created_at: string;
  /** false when the subscriber row was saved but the verification email failed to send. */
  email_sent: boolean;
}

export interface AdminDeleteSubscriberPayload {
  reason?: string;
}

export interface AdminDeleteSubscriberResponse {
  success: true;
  deletion_mode: 'hard_delete' | 'anonymized';
}

export type SubscriberAction = 'view' | 'resend' | 'resubscribe' | 'delete';

export type SubscriberDeletionMode = 'hard_delete' | 'anonymized';
