import { Injectable } from '@nestjs/common';
import { IRequestInformationService } from 'src/domain/services/request-information.service';
import { SystemService } from './system.service';

@Injectable()
export class RequestInformationService extends IRequestInformationService {
  constructor(private readonly systemService: SystemService) {
    super();
  }

  getUser(): Record<string, any> {
    return this.systemService.getUser();
  }
}
