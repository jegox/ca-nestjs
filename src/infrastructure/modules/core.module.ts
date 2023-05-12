import { Module } from '@nestjs/common';
import { UserModel } from 'src/domain/models';
import { AuthModule } from './core/auth.module';

@Module({
  imports: [UserModel, AuthModule],
})
export class CoreModule {}
