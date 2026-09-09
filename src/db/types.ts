export interface IDatabase {
  runAsync(sql: string, params?: any[]): Promise<any>;
  getAllAsync<T>(sql: string, params?: any[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: any[]): Promise<T | null>;
  execAsync(sql: string): Promise<void>;
}
