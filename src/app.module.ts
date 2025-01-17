import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailsModule } from './mails/mails.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AnalyseModule } from './analyse/analyse.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AnalyseModule,
    AuthModule,
    PrismaModule,
    UsersModule,
    MailsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule { }