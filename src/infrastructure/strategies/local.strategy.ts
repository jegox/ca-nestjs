import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

export interface ILocalUser {
  id: string;
  email: string;
  role: string;
}

/**
 * Local authentication strategy (username + password).
 * Override validate() to integrate with your user service.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({ usernameField: 'email' });
  }

  /* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unused-vars */
  async validate(
    _email: string,
    _password: string,
  ): Promise<ILocalUser | null> {
    // TODO: inject and call your AuthUseCase here once user domain is added
    // Example: return this.authUseCase.validateUser(email, password);
    return null;
  }
  /* eslint-enable @typescript-eslint/require-await, @typescript-eslint/no-unused-vars */
}
