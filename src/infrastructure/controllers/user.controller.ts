import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateUserDTO } from 'src/domain/dtos/user/create.dto';
import { ICreateUserUsecase } from 'src/domain/ports/user.port';

@ApiBearerAuth()
@ApiTags('USER')
@UseGuards(AuthGuard('jwt'))
@Controller('user')
export class UserController {
  constructor(private readonly createUserUseCase: ICreateUserUsecase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateUserDTO): Promise<any> {
    return await this.createUserUseCase.handle(body);
  }
}
