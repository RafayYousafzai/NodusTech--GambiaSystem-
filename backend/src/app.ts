import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { jsonSchemaTransform, serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import ticketRoutes from './routes/tickets';
import healthRoutes from './routes/health';

export const buildApp = (): FastifyInstance => {
  const app = Fastify({
    logger: true
  }).withTypeProvider<ZodTypeProvider>();

  // Add schema validator and serializer
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register plugins
  app.register(cors, {
    origin: '*', // Allow all for development MVP
  });

  app.register(swagger, {
    openapi: {
      info: {
        title: 'Gambia Transport Validator API',
        description: 'Offline-First Anti-Corruption Ticketing System',
        version: '1.0.0',
      },
      servers: [
        { url: 'http://localhost:3000' }
      ]
    },
    transform: jsonSchemaTransform,
  });

  app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  // Register routes
  app.register(healthRoutes, { prefix: '/health' });
  app.register(ticketRoutes, { prefix: '/tickets' });

  return app;
};

export default buildApp;
