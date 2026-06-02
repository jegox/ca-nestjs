import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ResponseInterceptor } from '@infrastructure/interceptors/response.interceptor';
import { ErrorsInterceptor } from '@infrastructure/interceptors/errors.interceptor';
import { JwtGuard } from '@infrastructure/guards/jwt.guard';
import { RolesGuard } from '@infrastructure/guards/roles.guard';
import { JwtStrategy } from '@infrastructure/strategies/jwt.strategy';
import { LocalStrategy } from '@infrastructure/strategies/local.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('config.jwt.secret') ??
          'change_me_in_production',
        signOptions: {
          expiresIn: (configService.get<string>('config.jwt.expiration') ??
            '24h') as `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}`,
        },
      }),
    }),
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ErrorsInterceptor },
    { provide: APP_GUARD, useClass: JwtGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    JwtStrategy,
    LocalStrategy,
  ],
  exports: [JwtModule, PassportModule],
})
export class SharedModule {}
