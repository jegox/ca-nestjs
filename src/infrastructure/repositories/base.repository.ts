import { Repository, ObjectLiteral, DataSource } from 'typeorm';
import { IBaseRepository } from '@domain/repositories';
import { IPagination, IPaginationOptions } from '@domain/interfaces';

export abstract class BaseRepository<
  T extends ObjectLiteral,
> implements IBaseRepository<T> {
  protected readonly repository: Repository<T>;

  constructor(repository: Repository<T>) {
    this.repository = repository;
  }

  async save(doc: Partial<T>): Promise<T> {
    return this.repository.save(doc as T);
  }

  async delete(doc: T): Promise<T> {
    return this.repository.remove(doc);
  }

  create(): T {
    return this.repository.create();
  }

  async findOne(options: Record<string, unknown>): Promise<T | null> {
    return this.repository.findOne(options);
  }

  async find(options: Record<string, unknown>): Promise<T[]> {
    return this.repository.find(options);
  }

  async paginate(
    options: IPaginationOptions,
    query: Record<string, unknown>,
  ): Promise<IPagination<T>> {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [items, totalItems] = await this.repository.findAndCount({
      ...query,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalItems / limit);

    return {
      items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  async rawQuery(
    expression: string,
    parameters?: unknown[],
  ): Promise<unknown[]> {
    const dataSource: DataSource = this.repository.manager.connection;
    return dataSource.query(expression, parameters);
  }
}
