export interface IPaginationOptions {
  page: number;
  limit: number;
}

export interface IPaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface IPagination<T> {
  items: T[];
  meta: IPaginationMeta;
}
