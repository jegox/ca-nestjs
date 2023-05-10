import { CreateUserDTO } from '../dtos/user/create.dto';

export abstract class ICreateUserUsecase {
  abstract handle(payload: CreateUserDTO): Promise<any>;
}
