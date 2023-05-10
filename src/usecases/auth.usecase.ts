import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserAuthenticated, UserModel } from 'src/domain/models';
import { IAuthUseCase } from 'src/domain/ports';
import { IUserRepository } from 'src/domain/repositories';
import config from 'src/infrastructure/config/config';

@Injectable()
export class AuthUseCase extends IAuthUseCase {
  constructor(
    private readonly userRepositor: IUserRepository,
    private readonly jwtService: JwtService,
    @Inject(config.KEY)
    private readonly configService: ConfigType<typeof config>,
  ) {
    super();
  }

  async signIn(payload: UserModel): Promise<UserAuthenticated> {
    const { id, fullname, email } = payload;
    const token = await this.jwtService.signAsync(
      { id },
      { secret: this.configService.jwt.secret },
    );

    return {
      fullname,
      email,
      token,
    };
  }
}
