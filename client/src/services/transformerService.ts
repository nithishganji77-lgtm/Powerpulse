import { api } from './apiClient';
import type {
  AlertDto,
  FaultIncidentDto,
  Instant,
  MaintenanceDto,
  PageResponse,
  ReadingDto,
  TransformerDetailDto,
  TransformerDto,
  TransformerListParams,
  TransformerUpsertRequest,
} from '@/types/api';

export const transformerService = {
  list: (p: TransformerListParams = {}) => api.get<PageResponse<TransformerDto>>('/transformers', p),
  all: () => api.get<TransformerDto[]>('/transformers/all'),
  locations: () => api.get<string[]>('/transformers/locations'),
  get: (id: string) => api.get<TransformerDetailDto>(`/transformers/${id}`),
  create: (body: TransformerUpsertRequest) => api.post<TransformerDto>('/transformers', body),
  update: (id: string, body: TransformerUpsertRequest) => api.patch<TransformerDto>(`/transformers/${id}`, body),
  readings: (id: string, p: { from?: Instant; to?: Instant; maxPoints?: number } = {}) =>
    api.get<ReadingDto[]>(`/transformers/${id}/readings`, p),
  alerts: (id: string, p: { active?: boolean } = {}) => api.get<AlertDto[]>(`/transformers/${id}/alerts`, p),
  maintenance: (id: string) => api.get<MaintenanceDto[]>(`/transformers/${id}/maintenance`),
  incidents: (id: string) => api.get<FaultIncidentDto[]>(`/transformers/${id}/incidents`),
};
