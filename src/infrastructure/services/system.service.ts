import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { UserModel } from 'src/domain/models/user.model';

@Injectable()
export class SystemService {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  getUser(): UserModel {
    return this.request.user as UserModel;
  }
}
