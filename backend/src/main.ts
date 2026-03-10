import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';


async function bootstrap() {
 const config = new ConfigService();
  const app = await NestFactory.create(AppModule);
  // set trust proxy to true
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  app.use(cookieParser());
  
 // await app.listen(process.env.PORT ?? 3000);
 await app.listen(config.get<number>('app.port') || 3000);
}
bootstrap();
