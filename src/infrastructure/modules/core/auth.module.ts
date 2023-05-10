import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { LocalStrategy } from '../../strategies/local.strategy';
import { JwtStrategy } from '../../strategies/jwt.strategy';
import { IAuthUseCase } from 'src/domain/ports';
import { AuthUseCase } from 'src/usecases';
import { AuthController } from '../../controllers/auth.controller';
import { UserModule } from './user.module';

@Module({
  imports: [PassportModule, UserModule],
  controllers: [AuthController],
  providers: [
    LocalStrategy,
    JwtStrategy,
    JwtService,
    {
      provide: IAuthUseCase,
      useClass: AuthUseCase,
    },
  ],
})
export class AuthModule {}
