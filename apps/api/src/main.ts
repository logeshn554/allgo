import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { ConfigService } from './config/config.service.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Register Global Validation Pipe
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Trust upstream proxy (Cloudflare/Load Balancer/Nginx)
  try {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  } catch {
    // Adapter may not support trust proxy in non-express environments
  }

  const configService = app.get(ConfigService);

  // Enable Cross-Origin Resource Sharing for Local Flutter Apps & Next.js Admin
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-AllGo-Role', 'X-AllGo-Client', 'Accept-Language'],
    credentials: true,
  });

  // Configure OpenAPI / Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('AllGo Super-App Core REST API')
    .setDescription('Production NestJS backend for AllGo multi-vertical mobility and delivery platform')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication and phone OTP verification')
    .addTag('users', 'User identity and role authorization')
    .addTag('health', 'System and infrastructure health checks')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = configService.port;
  await app.listen(port, '0.0.0.0');
  logger.log(`AllGo Core API server running on port ${port} [Env: ${configService.nodeEnv}]`);
  logger.log(`OpenAPI documentation accessible at /docs (port ${port})`);
}

// Start if directly invoked
if (process.argv[1] && process.argv[1].includes('main')) {
  bootstrap().catch((err) => {
    console.error('Fatal API bootstrap error:', err);
    process.exit(1);
  });
}

export { bootstrap };

