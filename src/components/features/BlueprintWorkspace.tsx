'use client';

import { useState } from 'react';
import { Sparkles, Pencil } from 'lucide-react';
import type { EstimateItem } from '@/types';
import BlueprintAI from './BlueprintAI';
import BlueprintEditor from './BlueprintEditor';

/**
 * 도면 작업 공간 — AI 자동 생성(기본)과 직접 수정(수동 에디터)을 토글.
 * 비기술 사용자는 AI 모드만 써도 되고, 세밀 조정이 필요하면 직접 수정으로 전환.
 */
export default function BlueprintWorkspace({
  projectId,
  onAddItems,
}: {
  projectId: string;
  onAddItems?: (items: EstimateItem[]) => void;
}) {
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');

  const tab = 'flex items-center gap-1.5 px-4 h-10 rounded-lg text-[14px] font-medium transition-colors';

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <div className="flex items-center gap-2 px-4 pt-4 no-print">
        <button
          type="button"
          onClick={() => setMode('ai')}
          className={`${tab} ${mode === 'ai' ? 'bg-[#1e3a5f] text-white' : 'border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]'}`}
        >
          <Sparkles size={16} /> AI 자동 생성
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`${tab} ${mode === 'manual' ? 'bg-[#1e3a5f] text-white' : 'border border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]'}`}
        >
          <Pencil size={16} /> 직접 수정
        </button>
      </div>

      {mode === 'ai' ? (
        <BlueprintAI
          projectId={projectId}
          onAddItems={onAddItems}
          onManualEdit={() => setMode('manual')}
        />
      ) : (
        <BlueprintEditor
          projectId={projectId}
          onAddItems={onAddItems ?? (() => {})}
        />
      )}
    </div>
  );
}
