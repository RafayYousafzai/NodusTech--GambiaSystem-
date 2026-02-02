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
      body: z.object({
        amount: z.number().describe('Amount for the ticket'),
        currency: z.string().default('GMD').describe('Currency code'),
      }),
      response: {
        200: z.object({
          data: z.object({
            ticket_id: z.string().uuid(),
            amount: z.number(),
            currency: z.string(),
            expires_at: z.number(),
          }),
          sig: z.string().describe('Ed25519 signature of the data object'),
        }),
      },
    },
  }, async (request, reply) => {
    const { amount, currency } = request.body;
    const ticket = await generateTicket({ amount, currency });
    return ticket;
  });
};

export default ticketRoutes;
