import { AxiosResponse } from "axios";

export interface ApiResponse<T = undefined> extends Partial<AxiosResponse<T>> {
  success: boolean;
  message?: string;
}