import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';
import { IBaseRepository } from 'src/domain/repositories';
import { IPagination } from 'src/domain/interfaces';

export abstract class BaseRepository<T> implements IBaseRepository<T> {
  private entity: Repository<T>;

  protected constructor(entity: Repository<T>) {
    this.entity = entity;
  }

  public async create(): Promise<T> {
    return this.entity.create();
  }

  public async save(doc: T): Promise<T> {
    return this.entity.save(doc);
  }

  public async findOne(options: FindOneOptions): Promise<T> {
    return this.entity.findOne(options);
  }

  public async find(options: FindManyOptions): Promise<T[]> {
    return this.entity.find(options);
  }

  public async delete(doc: any): Promise<T> {
    await this.entity.delete(doc);
    return doc;
  }

  public async paginate(
    options: IPaginationOptions,
    query: Record<string, any>,
  ): Promise<IPagination<T>> {
    return await paginate<T>(this.entity, options, query);
  }

  public async rawQuery(
    expression: string,
    parameters?: any[],
  ): Promise<any[]> {
    return await this.entity.query(expression, parameters);
  }
}
