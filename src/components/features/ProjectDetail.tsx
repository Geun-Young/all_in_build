'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import AddWorkModal from './AddWorkModal';
import { Project, WorkRecord } from '@/types';

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

const DUMMY_WORK_RECORDS: WorkRecord[] = [
  { id: '1', projectId: '1', date: '2025-05-21', diameter: '', content: '지하누수', hasPhoto: true, createdAt: '2025-05-21T09:00:00' },
  { id: '2', projectId: '1', date: '2025-05-21', diameter: 'D25', content: '지하누수', hasPhoto: true, createdAt: '2025-05-21T10:30:00' },
  { id: '3', projectId: '1', date: '2025-05-21', diameter: 'D25', content: '지하누수', hasPhoto: true, createdAt: '2025-05-21T14:00:00' },
  { id: '4', projectId: '1', date: '2025-05-20', diameter: 'D25', content: '아1×2.5', hasPhoto: true, createdAt: '2025-05-20T09:00:00' },
  { id: '5', projectId: '1', date: '2025-05-20', diameter: 'D25', content: '지하누수', hasPhoto: true, createdAt: '2025-05-20T11:00:00' },
];

type Tab = '기본정보' | '작업기록' | '위치';

function formatDate(d: string) {
  return d.replace(/-/g, '.').slice(0, 10);
}

function formatDateKo(d: string) {
  const [year, month, day] = d.split('-');
  return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
}

function formatTime(iso: string) {
  return iso.split('T')[1]?.slice(0, 5) ?? '';
}

export default function ProjectDetail({ id }: { id: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('기본정보');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const project = DUMMY_PROJECTS.find((p) => p.id === id);
  const workRecords = DUMMY_WORK_RECORDS.filter((r) => r.projectId === id);

  if (!project) {
    return (
      <div className="p-10 text-center text-sm text-[#6b7280]">
        프로젝트를 찾을 수 없습니다.
      </div>
    );
  }

  const groupedByDate = workRecords.reduce<Record<string, WorkRecord[]>>((acc, r) => {
    (acc[r.date] ??= []).push(r);
    return acc;
  }, {});
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const TABS: Tab[] = ['기본정보', '작업기록', '위치'];

  const INFO_ROWS = [
    { label: '공사명', value: project.name },
    { label: '시행청', value: project.client },
    { label: '시행사', value: project.contractor },
    { label: '공사 기간', value: `${formatDate(project.startDate)} ~ ${formatDate(project.endDate)}` },
    { label: '위치', value: project.location },
    { label: '공사 유형', value: project.type },
  ];

  return (
    <div>
      {/* 커스텀 헤더 */}
      <div className="h-14 bg-white border-b border-[#e5e7eb] flex items-center px-4 gap-3">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg hover:bg-[#f3f4f6] transition-colors flex-shrink-0"
        >
          <ChevronLeft size={20} className="text-[#374151]" />
        </button>
        <span className="flex-1 text-[#111827] font-medium text-base truncate">
          {project.name}
        </span>
        <Badge variant={project.status}>{project.status}</Badge>
      </div>

      {/* 탭 바 */}
      <div className="bg-white border-b border-[#e5e7eb] flex">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-[#1e3a5f] text-[#1e3a5f] font-medium'
                : 'border-transparent text-[#6b7280] hover:text-[#374151]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="p-5">

        {/* ── 기본정보 ── */}
        {activeTab === '기본정보' && (
          <Card>
            <div className="divide-y divide-[#f3f4f6]">
              {INFO_ROWS.map(({ label, value }) => (
                <div key={label} className="flex px-5 py-3.5">
                  <span className="w-20 text-sm text-[#6b7280] flex-shrink-0">{label}</span>
                  <span className="text-sm text-[#111827] flex-1">{value}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── 작업기록 ── */}
        {activeTab === '작업기록' && (
          <div className="space-y-5">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setIsModalOpen(true)}>
                <Plus size={15} className="mr-1.5" />
                작업 추가
              </Button>
            </div>

            {sortedDates.length === 0 && (
              <p className="text-center text-sm text-[#9ca3af] py-16">
                등록된 작업이 없습니다.
              </p>
            )}

            {sortedDates.map((date) => (
              <div key={date}>
                {/* 날짜 헤더 */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-medium text-[#374151] whitespace-nowrap">
                    {formatDateKo(date)}
                  </span>
                  <div className="flex-1 h-px bg-[#e5e7eb]" />
                </div>

                {/* 작업 카드들 */}
                <div className="space-y-3">
                  {groupedByDate[date].map((record) => (
                    <div
                      key={record.id}
                      className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden shadow-sm"
                    >
                      <div className="flex">
                        {/* 썸네일 */}
                        <div className="w-24 h-24 flex-shrink-0 bg-[#f0f4f9] flex items-center justify-center">
                          {record.hasPhoto ? (
                            <span className="text-xs text-[#6b7280]">사진</span>
                          ) : (
                            <span className="text-xs text-[#9ca3af]">없음</span>
                          )}
                        </div>

                        {/* 메타정보 */}
                        <div className="flex-1 px-4 py-3 space-y-1.5">
                          {record.diameter && (
                            <div className="flex gap-2">
                              <span className="text-xs text-[#9ca3af] w-10 flex-shrink-0">구경</span>
                              <span className="text-xs text-[#111827]">{record.diameter}</span>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <span className="text-xs text-[#9ca3af] w-10 flex-shrink-0">내용</span>
                            <span className="text-xs text-[#111827]">{record.content}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-xs text-[#9ca3af] w-10 flex-shrink-0">시행사</span>
                            <span className="text-xs text-[#111827]">{project.contractor}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-xs text-[#9ca3af] w-10 flex-shrink-0">시행청</span>
                            <span className="text-xs text-[#111827]">{project.client}</span>
                          </div>
                          <p className="text-[10px] text-[#9ca3af] pt-0.5">
                            {formatTime(record.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 위치 ── */}
        {activeTab === '위치' && (
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden border border-[#e5e7eb] shadow-sm">
              <iframe
                title="공사 위치"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(project.location)}&output=embed`}
                width="100%"
                height="400"
                loading="lazy"
              />
            </div>
            <Card>
              <div className="px-5 py-3.5">
                <span className="text-xs text-[#9ca3af]">주소</span>
                <p className="text-sm text-[#111827] mt-0.5">{project.location}</p>
              </div>
            </Card>
          </div>
        )}
      </div>

      <AddWorkModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projectId={id}
      />
    </div>
  );
}
