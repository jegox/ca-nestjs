import { UserAuthenticated, UserModel } from '../models';

export abstract class IAuthUseCase {
  abstract signIn(payload: UserModel): Promise<UserAuthenticated>;
}
