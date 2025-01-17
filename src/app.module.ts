import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailsModule } from './mails/mails.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    PrismaModule,
    UsersModule,
    MailsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }