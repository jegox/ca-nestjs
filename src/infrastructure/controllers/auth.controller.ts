import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { LoginDTO } from 'src/domain/dtos/auth';
import { UserModel } from 'src/domain/models';
import { IAuthUseCase } from 'src/domain/ports';

@ApiTags('AUTH')
@Controller('auth')
export class AuthController {
  constructor(private readonly authUseCase: IAuthUseCase) {}

  @UseGuards(AuthGuard('local'))
  @Post('login')
  @ApiResponse({})
  async login(@Body() body: LoginDTO, @Req() req: Request) {
    const user = req.user as UserModel;
    return await this.authUseCase.signIn(user);
  }
}
