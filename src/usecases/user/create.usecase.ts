import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ICreateUserUsecase } from 'src/domain/ports/user.port';
import { CreateUserDTO } from 'src/domain/dtos/user/create.dto';
import { IUserRepository } from 'src/domain/repositories';
import { IRequestInformationService } from 'src/domain/services';

@Injectable()
export class CreateUserUsecase extends ICreateUserUsecase {
  constructor(
    private readonly repository: IUserRepository,
    private readonly requestInfoService: IRequestInformationService,
  ) {
    super();
  }

  async handle(payload: CreateUserDTO): Promise<any> {
    console.log(this.requestInfoService.getUser());

    const exists = await this.repository.findOne({
      where: { email: payload.email },
    });
    if (exists)
      throw new BadRequestException('Usuario ya se encuentra registrado.');

    const user = await this.repository.create();
    Object.assign(user, payload);

    const salt = await bcrypt.genSalt(10);
    user.password = bcrypt.hashSync(payload.password, salt);

    const { password, ...rest } = await this.repository.save(user);
    return rest;
  }
}
