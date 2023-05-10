import { IPagination } from '../interfaces';

export abstract class IBaseRepository<T> {
  abstract save(doc: T): Promise<T>;
  abstract delete(doc: T): Promise<T>;
  abstract create(): Promise<T>;
  abstract findOne(options: Record<string, any>): Promise<T>;
  abstract find(options: Record<string, any>): Promise<T[]>;
  abstract paginate(
    options: Record<string, any>,
    query: Record<string, any>,
  ): Promise<IPagination<T>>;
  abstract rawQuery(expression: string, parameters?: any[]): Promise<any[]>;
}
