export type ProjectType = '상수도' | '하수도';
export type ProjectStatus = '진행중' | '완료' | '대기';

export interface Project {
  id: string;
  name: string;
  client: string;      // 시행청
  contractor: string;  // 시행사
  location: string;
  type: ProjectType;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  photoCount: number;
  createdAt: string;
}

export interface WorkRecord {
  id: string;
  projectId: string;
  date: string;
  diameter: string;
  content: string;
  hasPhoto: boolean;
  memo?: string;
  createdAt: string;
}

export interface EstimateItem {
  id: string;
  category: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Estimate {
  id: string;
  projectId: string;
  items: EstimateItem[];
  totalAmount: number;
  createdAt: string;
}

export interface SiteLog {
  id: string;
  projectId: string;
  date: string;
  content: string;
  photos: string[];
  author: string;
  createdAt: string;
}
