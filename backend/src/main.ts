import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { validateEnvironment } from './common/config/environment';
import helmet from 'helmet';

async function bootstrap() {
  const appConfig = validateEnvironment();
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'", 'https:'],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  const allowedOrigins = appConfig.corsOrigin;

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*') || origin.endsWith('.vercel.app')) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
      disableErrorMessages: appConfig.nodeEnv === 'production',
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const documentationConfig = new DocumentBuilder()
    .setTitle('HostelConnect API Docs')
    .setDescription('Multi-tenant Boarding School Parent-Student Video Calling Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, documentationConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = appConfig.port;
  await app.listen(port);
  Logger.log(`🚀 HostelConnect Backend running on port http://localhost:${port}/api/v1`, 'Bootstrap');
  Logger.log(`📚 OpenAPI Documentation available at http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap().catch((error) => {
  Logger.error('Failed to start HostelConnect backend', error instanceof Error ? error.stack : String(error), 'Bootstrap');
  process.exit(1);
});
