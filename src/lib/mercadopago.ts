import { MercadoPagoConfig, PreApproval, Payment } from 'mercadopago';

// Initialize with Access Token from env
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';

if (!accessToken) {
  console.warn('MERCADOPAGO_ACCESS_TOKEN is missing. Subscriptions will not work properly.');
}

const client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });

export const preApproval = new PreApproval(client);
export const payment = new Payment(client);
export const mpClient = client;
