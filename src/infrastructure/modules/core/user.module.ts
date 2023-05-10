import { Global, Module, Scope } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ICreateUserUsecase } from 'src/domain/ports/user.port';
import { IUserRepository } from 'src/domain/repositories';
import { UserController } from 'src/infrastructure/controllers';
import { User } from 'src/infrastructure/entities';
import { UserRepository } from 'src/infrastructure/repositories';
import { CreateUserUsecase } from 'src/usecases/user/create.usecase';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [
    {
      provide: ICreateUserUsecase,
      useClass: CreateUserUsecase,
      scope: Scope.REQUEST,
    },
    {
      provide: IUserRepository,
      useClass: UserRepository,
    },
  ],
  exports: [IUserRepository],
})
export class UserModule {}
