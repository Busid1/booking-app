import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

export interface CheckoutSession {
  id: string;
  url: string;
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  status: 'open' | 'complete' | 'expired';
  amount_total: number | null;
  metadata?: Record<string, string>;
}

/**
 * Cobro de señales con Stripe Checkout usando su API REST (sin SDK).
 * Solo se activa si STRIPE_SECRET_KEY está configurada.
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);

  get enabled(): boolean {
    return !!process.env.STRIPE_SECRET_KEY;
  }

  private async request<T>(method: 'GET' | 'POST', path: string, params?: Record<string, string>): Promise<T> {
    const res = await fetch(`https://api.stripe.com/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      body: params ? new URLSearchParams(params) : undefined,
    });
    const data: any = await res.json();
    if (!res.ok) {
      this.logger.error(`Stripe ${res.status}: ${data?.error?.message}`);
      throw new ServiceUnavailableException(`No se ha podido iniciar el pago: ${data?.error?.message ?? 'error de Stripe'}`);
    }
    return data as T;
  }

  createCheckout(opts: {
    appointmentId: string;
    amount: number;
    description: string;
    customerEmail?: string | null;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSession> {
    const params: Record<string, string> = {
      mode: 'payment',
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'eur',
      'line_items[0][price_data][unit_amount]': String(Math.round(opts.amount * 100)),
      'line_items[0][price_data][product_data][name]': opts.description.slice(0, 250),
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
      client_reference_id: opts.appointmentId,
      'metadata[appointmentId]': opts.appointmentId,
      // Stripe exige al menos 30 minutos de vigencia.
      expires_at: String(Math.floor(Date.now() / 1000) + 31 * 60),
      locale: 'es',
    };
    if (opts.customerEmail) params.customer_email = opts.customerEmail;
    return this.request<CheckoutSession>('POST', '/checkout/sessions', params);
  }

  getSession(id: string): Promise<CheckoutSession> {
    return this.request<CheckoutSession>('GET', `/checkout/sessions/${encodeURIComponent(id)}`);
  }

  /** Verifica la firma de un webhook de Stripe y devuelve el evento. */
  verifyWebhook(rawBody: Buffer | undefined, signatureHeader: string | undefined): any {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new BadRequestException('Webhook de Stripe no configurado');
    if (!rawBody || !signatureHeader) throw new BadRequestException('Firma de Stripe ausente');

    const parts = Object.fromEntries(
      signatureHeader.split(',').map(p => p.split('=') as [string, string]).filter(p => p.length === 2),
    );
    const timestamp = parts['t'];
    const signatures = signatureHeader.split(',').filter(p => p.startsWith('v1=')).map(p => p.slice(3));
    if (!timestamp || !signatures.length) throw new BadRequestException('Firma de Stripe inválida');
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new BadRequestException('Firma de Stripe caducada');

    const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody.toString('utf8')}`).digest('hex');
    const valid = signatures.some(sig => {
      const a = Buffer.from(sig, 'hex');
      const b = Buffer.from(expected, 'hex');
      return a.length === b.length && timingSafeEqual(a, b);
    });
    if (!valid) throw new BadRequestException('Firma de Stripe inválida');
    return JSON.parse(rawBody.toString('utf8'));
  }
}
