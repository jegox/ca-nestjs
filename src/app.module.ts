import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import appConfig from './config/config';
import { validationSchema } from './config/validation-schema';
import { databaseFactory } from './infrastructure/config/database.factory';
import { SharedModule } from './shared/shared.module';
import { HealthModule } from './health/health.module';
import { AIModule } from './infrastructure/modules/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validationSchema,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseFactory,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('config.throttle.ttl') ?? 60000,
          limit: configService.get<number>('config.throttle.limit') ?? 100,
        },
      ],
    }),
    SharedModule,
    HealthModule,
    AIModule,
  ],
})
export class AppModule {}
