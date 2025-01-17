import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import * as net from 'net';
import { ValidationPipe } from '@nestjs/common';
import { MailsService } from './mails/mails.service';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RolesGuard } from './common/guards/roles.guard';
import { JwtAccessAuthGuard } from './auth/guards/jwt-access-auth.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { join } from 'path';

config();

interface ServerError extends Error {
  code: string;
  port: number;
}

async function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.listen(startPort, () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });

    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

async function handleServerError(error: ServerError, retryPort: number): Promise<number | void> {
  const isPortInUseError = error.code === 'EADDRINUSE';

  if (isPortInUseError) {
    console.log(`Port ${error.port} is already in use, trying port ${retryPort}`);
    return retryPort;
  }

  console.error('Error starting server:', error.message);
  process.exit(1);
}

async function startServer(app: any, port: number): Promise<void> {
  try {
    const availablePort = await findAvailablePort(port);
    console.log(`Server running on port ${availablePort}`);
    await app.listen(availablePort);
  } catch (error) {
    const newPort = await handleServerError(error as ServerError, port + 1);
    if (newPort) {
      console.log(`Retrying with port ${newPort}`);
      await app.listen(newPort);
    }
  }
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // CORS
  app.enableCors();

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Backend Skeleton')
    .setDescription('This is a backend skeleton for a any application')
    .setVersion('1.0')
    .addTag('backend-skeleton')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api', app, swaggerDocument, {
    jsonDocumentUrl: '/api-json'
  });

  // Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    exceptionFactory: (errors) => {
      const firstError = errors[0];
      const firstConstraint = Object.values(firstError.constraints)[0];

      return {
        statusCode: 400,
        message: firstConstraint,
      };
    }
  })
  );

  // Global Auth Guard
  app.useGlobalGuards(
    new JwtAccessAuthGuard(app.get(Reflector)),
    new RolesGuard(app.get(Reflector)),
  );

  // Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Static Assets
  app.useStaticAssets(join(__dirname, '..', 'uploaded-files'), {
    prefix: '/uploaded-files/',
  });

  const defaultPort = 3621;
  const port = parseInt(process.env.PORT || defaultPort.toString());

  await startServer(app, port);

  const mailsService = app.get(MailsService);
  await mailsService.subscribeToAllMails();
}

bootstrap();
