import api from '@/services/api';
import type { TargetingRuleGroup } from '@/lib/guides/types';

interface ApiEnvelope<T> {
  data: T;
}

interface RawSegment {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  rules: TargetingRuleGroup;
  createdAt?: string;
  updatedAt?: string;
}

export interface TargetingSegment {
  id: string;
  name: string;
  description: string;
  rules: TargetingRuleGroup;
  createdAt?: string;
  updatedAt?: string;
}

export interface TargetingSegmentPayload {
  name: string;
  description?: string;
  rules: TargetingRuleGroup;
}

export interface SampleVisitorContext {
  url?: string;
  referrer?: string;
  role?: string;
  plan?: string;
  userId?: string;
}

export interface RuleEvaluationResult {
  eligible: boolean;
  reasons: string[];
  matchedConditions: string[];
  failedConditions: string[];
}

const toSegment = (raw: RawSegment): TargetingSegment => ({
  id: raw.id ?? raw._id ?? '',
  name: raw.name,
  description: raw.description ?? '',
  rules: raw.rules,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt
});

export const listSegments = async (): Promise<TargetingSegment[]> => {
  const response = await api.get<ApiEnvelope<{ segments: RawSegment[] }>>('/targeting/segments');
  return response.data.data.segments.map(toSegment);
};

export const createSegment = async (payload: TargetingSegmentPayload): Promise<TargetingSegment> => {
  const response = await api.post<ApiEnvelope<{ segment: RawSegment }>>('/targeting/segments', payload);
  return toSegment(response.data.data.segment);
};

export const updateSegment = async (
  segmentId: string,
  payload: Partial<TargetingSegmentPayload>
): Promise<TargetingSegment> => {
  const response = await api.patch<ApiEnvelope<{ segment: RawSegment }>>(`/targeting/segments/${segmentId}`, payload);
  return toSegment(response.data.data.segment);
};

export const deleteSegment = async (segmentId: string): Promise<void> => {
  await api.delete(`/targeting/segments/${segmentId}`);
};

export const evaluateRules = async (
  rules: TargetingRuleGroup,
  context: SampleVisitorContext
): Promise<RuleEvaluationResult> => {
  const response = await api.post<ApiEnvelope<RuleEvaluationResult>>('/targeting/evaluate', { ...context, rules });
  return response.data.data;
};
