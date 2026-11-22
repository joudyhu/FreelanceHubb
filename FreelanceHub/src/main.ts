import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as express from 'express';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const prefix = process.env.API_PREFIX || 'api/v1';

  const uploadDir = process.env.UPLOAD_DIR || 'uploads';
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
  app.use(`/${uploadDir}`, express.static(uploadDir));
  app.use(helmet());
  app.enableCors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3001').split(',').map((x) => x.trim()),
    credentials: true,
  });
  app.setGlobalPrefix(prefix);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('FreelanceHub API')
    .setDescription('REST API for clients, freelancers, projects, offers, escrow wallets and deliveries.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${prefix}/docs`, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
  console.log(`FreelanceHub API running on http://localhost:${port}/${prefix}`);
}
bootstrap();
