import { buildApp } from './app';
import { env } from './env';

const app = buildApp();

const start = async () => {
  try {
    // Listen on all interfaces to make it accessible to the mobile app/emulator
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`🚀 Server is running on port ${env.PORT}`);
    console.log(`📄 Docs available at http://localhost:${env.PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();