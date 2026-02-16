export interface SlotDto {
  startUtc: string;
  endUtc: string;
  startViewer: string;
  endViewer: string;
}

export interface AuthenticatedRequestUser {
  sub: string;
  tenantId: string;
  role: string;
}
