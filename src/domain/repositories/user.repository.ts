import { UserModel } from '../models';
import { IBaseRepository } from './base.repository';

export abstract class IUserRepository extends IBaseRepository<UserModel> {}
