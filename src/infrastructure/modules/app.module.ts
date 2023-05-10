import { join } from 'path';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './core/auth.module';
import { CommonModule } from './common.module';
import { CoreModule } from './core.module';
import { AppController } from '../controllers/app.controller';
import config from '../config/config';
import { validationSchema } from '../config/validation-schema';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [config],
      isGlobal: true,
      validationSchema,
    }),
    JwtModule.registerAsync({
      useFactory: async () => {
        return {
          secret: process.env.JWT_SECRET,
          signOptions: { expiresIn: process.env.JWT_EXPIRES_IN },
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async () => ({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: +process.env.DB_PORT,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        entities: [join(__dirname, '../infrastructure/entities/*.entity.ts')],
        synchronize: true, //todo: don't use in production environment
        autoLoadEntities: true,
      }),
    }),
    CommonModule,
    CoreModule,
    AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
