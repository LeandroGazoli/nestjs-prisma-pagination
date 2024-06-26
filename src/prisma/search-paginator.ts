import { PaginatorTypes } from "../../index";

export const searchPaginator = (defaultOptions: PaginatorTypes.SearchPaginateOptions): PaginatorTypes.SearchPaginateFunction => {
  return async <T>(prisma: any, modelName: string, options: any) => {
    let data: T & { row_count: number }[];

    if (options?.searchValue) {
      const { searchValue, searchColumns } = options; // Desestruturar parâmetros
      const whereClause = searchColumns.map((column) => `coalesce(:${column}, '')`).join(' || ');
      const countQuery = `
        SELECT COUNT(*) FROM "${modelName}"
        WHERE to_tsvector('english', ${whereClause}) @@ to_tsquery('english', :searchValue)
      `;
      
      const data = await prisma.$executeRawUnsafe<T & { row_count: number }[]>(`
        SELECT *,
          (${countQuery}) AS row_count
        FROM "${modelName}"
        WHERE to_tsvector('english', ${whereClause}) @@ to_tsquery('english', :searchValue)
        LIMIT :perPage
        OFFSET :skip
      `, {
        searchValue,
        searchColumns,
        perPage: options?.perPage || defaultOptions.perPage,
        skip: options?.skip || 0,
      });
    } else {
      data = await prisma.$queryRawUnsafe(`
         SELECT *,
        (SELECT COUNT(*) FROM "${modelName}") as row_count
        FROM "${modelName}"
        limit ${options.perPage}
        offset ${options.skip};
        `);
    }

    const total = Number(data[0]?.row_count || 0);
    const lastPage = Math.ceil((total) / (options?.perPage || defaultOptions.perPage));

    return {
      data: data as unknown as T[],
      meta: {
        total,
        lastPage,
        currentPage: options?.page || 1,
        perPage: options?.perPage || 10,
        prev: options?.page > 1 ? (options?.page || defaultOptions.page) - 1 : null,
        next: options?.page < lastPage ? (options?.page || defaultOptions.page) + 1 : null,
      },
    };
  };
};
