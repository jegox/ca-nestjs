import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import * as bcrypt from 'bcryptjs';
import { IUserRepository } from 'src/domain/repositories';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private repository: IUserRepository) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string) {
    const user = await this.repository.findOne({
      where: { email },
    });

    if (!user)
      throw new UnauthorizedException('Email y/o contraseña incorrectos.');

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      throw new UnauthorizedException('Email y/o contraseña incorrectos.');

    return user;
  }
}
