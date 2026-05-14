import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT') ?? '3000');
  const corsOriginValue =
    configService.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000';
  const allowedOrigins = corsOriginValue
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.use(helmet());
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  app.use(compression());
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  app.use(cookieParser());

  await app.listen(port);
}
void bootstrap();
