'use client';

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Camera, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { WorkRecord } from '@/types';

export type WorkFormData = {
  date: string;
  diameter: string;
  content: string;
  memo: string;
  timeOfDay: 'day' | 'night';
  hasPhoto: boolean;
};

interface AddWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  initialData?: WorkRecord;
  onSave: (data: WorkFormData) => void;
}

export default function AddWorkModal({
  isOpen,
  onClose,
  projectId: _projectId,
  initialData,
  onSave,
}: AddWorkModalProps) {
  const isEditMode = !!initialData;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [diameter, setDiameter] = useState('');
  const [content, setContent] = useState('');
  const [memo, setMemo] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'night'>('day');

  useEffect(() => {
    if (!isOpen) return;
    const today = new Date().toISOString().split('T')[0];
    setDate(initialData?.date ?? today);
    setDiameter(initialData?.diameter ?? '');
    setContent(initialData?.content ?? '');
    setMemo(initialData?.memo ?? '');
    setTimeOfDay(initialData?.timeOfDay ?? 'day');
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  function handleRemovePhoto() {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleSubmit() {
    onSave({
      date,
      diameter,
      content,
      memo,
      timeOfDay,
      hasPhoto: !!preview,
    });
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
            {isEditMode ? '작업 수정' : '작업 추가'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#f3f4f6] transition-colors"
          >
            <X size={18} className="text-[#6b7280]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 사진 업로드 */}
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-2">사진</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {preview ? (
              <div className="relative rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="미리보기" className="w-full h-52 object-cover" />
                <button
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 bg-black/50 rounded-full p-1.5"
                >
                  <X size={14} className="text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-44 border-2 border-dashed border-[#e5e7eb] rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[#1e3a5f] hover:bg-[#f0f4f9] transition-colors"
              >
                <Camera size={28} className="text-[#9ca3af]" />
                <span className="text-sm text-[#9ca3af]">사진을 올려주세요</span>
              </button>
            )}
          </div>

          {/* 작업 날짜 */}
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">작업 날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* 작업 시간대 */}
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">작업 시간대</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTimeOfDay('day')}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                  timeOfDay === 'day'
                    ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                    : 'bg-white text-[#6b7280] border-[#e5e7eb] hover:border-[#1e3a5f]'
                }`}
              >
                🌤 주간
              </button>
              <button
                onClick={() => setTimeOfDay('night')}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                  timeOfDay === 'night'
                    ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                    : 'bg-white text-[#6b7280] border-[#e5e7eb] hover:border-[#1e3a5f]'
                }`}
              >
                🌙 야간
              </button>
            </div>
          </div>

          {/* 구경 */}
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">구경</label>
            <input
              type="text"
              value={diameter}
              onChange={(e) => setDiameter(e.target.value)}
              placeholder="예) D25, D50"
              className={inputClass}
            />
          </div>

          {/* 내용 */}
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">내용</label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="예) 지하누수, 관 부설"
              className={inputClass}
            />
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">
              메모 <span className="text-[#9ca3af] font-normal">(선택)</span>
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              placeholder="추가 메모 사항"
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-3 px-5 py-4 border-t border-[#e5e7eb]">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" className="flex-1" onClick={handleSubmit}>
            {isEditMode ? '수정' : '저장'}
          </Button>
        </div>
      </div>
    </div>
  );
}
