import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const databaseFactory = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('config.database.host'),
  port: configService.get<number>('config.database.port'),
  database: configService.get<string>('config.database.name'),
  username: configService.get<string>('config.database.user'),
  password: configService.get<string>('config.database.password'),
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
});
