'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Project, ProjectStatus } from '@/types';

export type ProjectFormData = {
  name: string;
  client: string;
  contractor: string;
  location: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
};

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProjectFormData) => void;
  initialData?: Project;
}

const STATUS_OPTIONS: ProjectStatus[] = ['진행중', '완료', '대기'];

export default function AddProjectModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: AddProjectModalProps) {
  const isEditMode = !!initialData;

  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [contractor, setContractor] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('진행중');

  useEffect(() => {
    if (!isOpen) return;
    setName(initialData?.name ?? '');
    setClient(initialData?.client ?? '');
    setContractor(initialData?.contractor ?? '');
    setLocation(initialData?.location ?? '');
    setStartDate(initialData?.startDate ?? '');
    setEndDate(initialData?.endDate ?? '');
    setStatus(initialData?.status ?? '진행중');
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  function handleSubmit() {
    if (!name.trim() || !client.trim() || !contractor.trim()) return;
    onSave({ name, client, contractor, location, startDate, endDate, status });
    onClose();
  }

  const inputClass =
    'w-full border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm text-[#111827] placeholder-[#9ca3af] focus:outline-none focus:border-[#1e3a5f] transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full md:max-w-lg bg-white rounded-t-2xl md:rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e7eb]">
          <h2 className="text-base font-medium text-[#111827]">
            {isEditMode ? '공사 수정' : '공사 등록'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#f3f4f6] transition-colors"
          >
            <X size={18} className="text-[#6b7280]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 공사명 */}
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">공사명</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="공사명을 입력하세요"
              className={inputClass}
            />
          </div>

          {/* 시행청 */}
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">시행청</label>
            <input
              type="text"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="예) 중부사업소"
              className={inputClass}
            />
          </div>

          {/* 시행사 */}
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">시행사</label>
            <input
              type="text"
              value={contractor}
              onChange={(e) => setContractor(e.target.value)}
              placeholder="예) 칠성건설(주)"
              className={inputClass}
            />
          </div>

          {/* 위치 */}
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">위치</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="예) 대전시 중구 문화동 311~20"
              className={inputClass}
            />
          </div>

          {/* 공사 기간 */}
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">공사 기간</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`${inputClass} flex-1`}
              />
              <span className="text-[#9ca3af] text-sm flex-shrink-0">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`${inputClass} flex-1`}
              />
            </div>
          </div>

          {/* 상태 */}
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">상태</label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    status === s
                      ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                      : 'bg-white text-[#6b7280] border-[#e5e7eb] hover:border-[#1e3a5f]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-3 px-5 py-4 border-t border-[#e5e7eb]">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" className="flex-1" onClick={handleSubmit}>
            {isEditMode ? '수정' : '등록'}
          </Button>
        </div>
      </div>
    </div>
  );
}
