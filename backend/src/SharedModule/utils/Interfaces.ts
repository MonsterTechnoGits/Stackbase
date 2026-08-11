export interface IApiResponse<T = unknown> {
  status: 'success' | 'error';
  message: string;
  data?: T;
}

export interface IPaginatedResponse<T = unknown> {
  status: 'success';
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface IPaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}
