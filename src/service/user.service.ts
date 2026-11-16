import type { LoginRequestDto } from "../dtos/request/login-request.dto";
import type { UserRequestDto } from "../dtos/request/user-request.dto";
import type { LoginResponseDto } from "../dtos/response/login-response.dto";
import type { UserResponseDto } from "../dtos/response/user-response.dto";
import type { UpdateUserRequestDto } from "../dtos/request/update-user-request.dto";
import api from "./api";

export const UserService = {
  me: async (): Promise<{ id: string }> => {
    const response = await api.get<{ id: string }>("/users/me");
    return response.data;
  },

  login: async (dto: LoginRequestDto): Promise<LoginResponseDto> => {
    const response = await api.post<LoginResponseDto>("/users/login", dto);
    return response.data;
  },

  register: async (dto: UserRequestDto): Promise<UserResponseDto> => {
    const response = await api.post<UserResponseDto>("/users", dto);
    return response.data;
  },

  findOne: async (id: string): Promise<UserResponseDto> => {
    const response = await api.get<UserResponseDto>(`/users/${id}`);
    return response.data;
  },

  update: async (id: string, dto: UpdateUserRequestDto): Promise<UserResponseDto> => {
    const response = await api.put<UserResponseDto>(`/users/${id}`, dto);
    return response.data;
  },
};
