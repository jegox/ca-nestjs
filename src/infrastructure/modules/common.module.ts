import { Global, Module, Scope } from '@nestjs/common';
import { IRequestInformationService } from 'src/domain/services';
import { SystemService } from 'src/infrastructure/services/system.service';
import { RequestInformationService } from '../services';

@Global()
@Module({
  providers: [
    {
      provide: SystemService,
      useClass: SystemService,
      scope: Scope.REQUEST,
    },
    {
      provide: IRequestInformationService,
      useClass: RequestInformationService,
      scope: Scope.REQUEST,
    },
  ],
  exports: [SystemService, IRequestInformationService],
})
export class CommonModule {}
