import { FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
};

export default healthRoutes;
