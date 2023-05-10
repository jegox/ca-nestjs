import { Module } from '@nestjs/common';
import { UserModel } from 'src/domain/models';

@Module({
  imports: [UserModel],
})
export class CoreModule {}
