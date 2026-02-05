import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { generateTicket } from '../services/ticket.service';

const ticketRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post('/generate', {
    schema: {
      tags: ['Tickets'],
      summary: 'Generate a new signed ticket',
      description: 'Creates a cryptographically signed ticket with a QR code for offline verification.',
      body: z.object({
        amount: z.number().describe('Amount for the ticket').default(50),
        currency: z.string().default('GMD').describe('Three-letter currency code'),
      }),
      response: {
        200: z.object({
          data: z.object({
            ticket_id: z.string().uuid().describe('Unique identifier for the ticket'),
            amount: z.number().describe('Amount charged'),
            currency: z.string().describe('Currency used'),
            expires_at: z.number().describe('Unix timestamp of expiration'),
          }),
          sig: z.string().describe('Ed25519 signature of the data object'),
          qr_code: z.string().describe('Base64 Data URI of the generated QR code'),
        }).describe('The generated ticket payload and scanable QR code'),
      },
    },
  }, async (request, reply) => {
    const { amount, currency } = request.body;
    const ticket = await generateTicket({ amount, currency });
    return ticket;
  });
};

export default ticketRoutes;
