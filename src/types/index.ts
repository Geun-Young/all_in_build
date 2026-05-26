export type ProjectType = '상수도' | '하수도';
export type ProjectStatus = '진행중' | '완료' | '대기';

export interface Project {
  id: string;
  name: string;
  client: string;
  contractor: string;
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
  timeOfDay: 'day' | 'night';
  hasPhoto: boolean;
  memo?: string;
  createdAt: string;
}

export interface StandardPrice {
  id: string;
  code: string;
  category: string;
  work_name: string;
  spec: string;
  unit: string;
  unit_price: number;
  labor_ratio: number;
  is_night: boolean;
  standard_year: string;
}

export interface WorkType {
  id: string;
  code: string;
  category: string;
  name: string;
  spec: string;
  unit: string;
  expense_rate: number;
  expense_base: string;
  night_surcharge: number;
}

export interface WorkComponent {
  id: string;
  work_type_id: string;
  component_type: 'labor' | 'equipment' | 'material';
  component_name: string;
  quantity: number;
  unit: string;
  sort_order: number;
}

export interface WorkTypeResult extends WorkType {
  unit_price: number;
  labor_price: number;
  material_price: number;
  expense_price: number;
  is_night: boolean;
}

export interface Estimate {
  id: string;
  project_id?: string;
  estimate_name: string;
  status: 'draft' | 'confirmed';
  total_labor: number;
  total_material: number;
  total_expense: number;
  total_amount: number;
  created_at: string;
}

export interface EstimateItem {
  id: string;
  estimate_id: string;
  category: string;
  work_name: string;
  spec: string;
  unit: string;
  quantity: number;
  unit_price: number;
  labor_amount: number;
  material_amount: number;
  expense_amount: number;
  total_amount: number;
  is_night: boolean;
  sort_order: number;
  notes?: string;
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
