import { IPagination, IPaginationOptions } from '@domain/interfaces';

export abstract class IBaseRepository<T> {
  abstract save(doc: Partial<T>): Promise<T>;
  abstract delete(doc: T): Promise<T>;
  abstract create(): T;
  abstract findOne(options: Record<string, unknown>): Promise<T | null>;
  abstract find(options: Record<string, unknown>): Promise<T[]>;
  abstract paginate(
    options: IPaginationOptions,
    query: Record<string, unknown>,
  ): Promise<IPagination<T>>;
  abstract rawQuery(
    expression: string,
    parameters?: unknown[],
  ): Promise<unknown[]>;
}
