'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Project, ProjectStatus } from '@/types';
import { MapPin, Calendar, Camera, Plus } from 'lucide-react';

const DUMMY_PROJECTS: Project[] = [
  {
    id: '1',
    name: '중부관내4구역',
    client: '중부사업소',
    contractor: '칠성건설(주)',
    location: '대전시 중구 문화동 311~20',
    type: '상수도',
    status: '진행중',
    startDate: '2025-03-01',
    endDate: '2025-06-30',
    photoCount: 7,
    createdAt: '2025-03-01',
  },
  {
    id: '2',
    name: '유성구 관평동 상수도 관로 교체',
    client: '유성사업소',
    contractor: '칠성건설(주)',
    location: '대전시 유성구 관평동',
    type: '상수도',
    status: '완료',
    startDate: '2025-01-15',
    endDate: '2025-04-30',
    photoCount: 23,
    createdAt: '2025-01-15',
  },
  {
    id: '3',
    name: '서구 둔산동 급수관 신설',
    client: '서부사업소',
    contractor: '칠성건설(주)',
    location: '대전시 서구 둔산동',
    type: '상수도',
    status: '대기',
    startDate: '2025-06-01',
    endDate: '2025-09-30',
    photoCount: 0,
    createdAt: '2025-06-01',
  },
];

const STATUS_FILTERS: { label: string; value: ProjectStatus | '전체' }[] = [
  { label: '전체', value: '전체' },
  { label: '진행중', value: '진행중' },
  { label: '완료', value: '완료' },
  { label: '대기', value: '대기' },
];

function formatDate(d: string) {
  return d.replace(/-/g, '.').slice(0, 10);
}

export default function ProjectsPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<ProjectStatus | '전체'>('전체');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filtered = DUMMY_PROJECTS.filter((p) => {
    if (activeFilter !== '전체' && p.status !== activeFilter) return false;
    if (startDate && p.startDate < startDate) return false;
    if (endDate && p.endDate > endDate) return false;
    return true;
  });

  return (
    <div>
      <Header title="공사 현장" />

      <div className="p-5 space-y-4">
        {/* 공사 등록 버튼 */}
        <div className="flex justify-end">
          <Button size="sm">
            <Plus size={15} className="mr-1.5" />
            공사 등록
          </Button>
        </div>

        {/* 상태 필터 탭 */}
        <div className="flex border-b border-[#e5e7eb]">
          {STATUS_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setActiveFilter(value)}
              className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
                activeFilter === value
                  ? 'border-[#1e3a5f] text-[#1e3a5f] font-medium'
                  : 'border-transparent text-[#6b7280] hover:text-[#374151]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 날짜 범위 필터 */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-sm border border-[#e5e7eb] rounded-lg px-3 py-1.5 text-[#374151] focus:outline-none focus:border-[#1e3a5f]"
          />
          <span className="text-[#9ca3af] text-sm">~</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-sm border border-[#e5e7eb] rounded-lg px-3 py-1.5 text-[#374151] focus:outline-none focus:border-[#1e3a5f]"
          />
        </div>

        {/* 카드 그리드 */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((project) => (
              <div
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="bg-white border border-[#e5e7eb] rounded-xl p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-medium text-[#111827] leading-snug pr-2">
                    {project.name}
                  </h3>
                  <Badge variant={project.status}>{project.status}</Badge>
                </div>

                <p className="text-xs text-[#6b7280] mb-3">{project.client}</p>

                <div className="flex items-center gap-1.5 mb-2">
                  <MapPin size={13} className="text-[#9ca3af] flex-shrink-0" />
                  <span className="text-xs text-[#6b7280] truncate">{project.location}</span>
                </div>

                <div className="flex items-center gap-1.5 mb-3">
                  <Calendar size={13} className="text-[#9ca3af] flex-shrink-0" />
                  <span className="text-xs text-[#6b7280]">
                    {formatDate(project.startDate)} ~ {formatDate(project.endDate)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 pt-3 border-t border-[#f3f4f6]">
                  <Camera size={13} className="text-[#9ca3af]" />
                  <span className="text-xs text-[#9ca3af]">{project.photoCount}장</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-[#9ca3af] py-16">
            조건에 맞는 공사가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
