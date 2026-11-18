import api from "./api";
import type { TableResponseDto } from "../dtos/response/table-response.dto";

export const TableService = {
  findAll: async (): Promise<TableResponseDto[]> => {
    const response = await api.get<TableResponseDto[]>("/tables/public/find-all");
    return response.data;
  },

  findOneNumber: async (number: string): Promise<TableResponseDto> => {
    const response = await api.get<TableResponseDto>(`/tables/public/find-one-number/${number}`);
    return response.data;
  },
};
