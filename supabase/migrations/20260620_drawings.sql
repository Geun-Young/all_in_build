-- ============================================================
-- drawings          : AI로 생성한 계통도(모식도) 영구 저장
-- drawing_templates : 표준 도면 템플릿 (재사용)
-- drawing_data 는 DrawingData(JSON) 통째로 저장 → 스키마 유연
-- ============================================================

CREATE TABLE IF NOT EXISTS drawings (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id    UUID,                      -- 공사 연결(선택). 독립 도면은 NULL
  user_id       UUID,                      -- 작성자(선택, 로그인 연동 시)
  name          VARCHAR(300) NOT NULL DEFAULT '제목 없는 도면',
  drawing_data  JSONB        NOT NULL,     -- DrawingData
  sketch_data   JSONB,                     -- SketchData (원본 스케치)
  thumbnail     TEXT,                      -- 미리보기 PNG dataURL(선택)
  created_at    TIMESTAMP    DEFAULT NOW(),
  updated_at    TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drawings_project ON drawings(project_id);
CREATE INDEX IF NOT EXISTS idx_drawings_created ON drawings(created_at DESC);

CREATE TABLE IF NOT EXISTS drawing_templates (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  category      VARCHAR(20)  DEFAULT '상수도',  -- 상수도 | 하수도
  description   TEXT,
  drawing_data  JSONB        NOT NULL,
  is_system     BOOLEAN      DEFAULT TRUE,      -- 기본 제공 템플릿 여부
  created_at    TIMESTAMP    DEFAULT NOW()
);

-- ── 기본 제공 템플릿 시드 ───────────────────────────────────
INSERT INTO drawing_templates (name, category, description, drawing_data, is_system) VALUES
(
  '노후관 교체 기본형',
  '상수도',
  'D200 노후관 교체 1구간 + 제수밸브·공기밸브 기본 배치',
  '{
    "projectName": "노후관 교체 (기본형)",
    "sections": [{
      "id": "No.1", "existingPipe": "D200", "newPipe": "D200", "length": 250,
      "components": [
        { "type": "kp", "spec": "D200mm", "qty": 6 },
        { "type": "valve", "spec": "D200mm", "qty": 2 },
        { "type": "airvalve", "spec": "D200mm", "qty": 1 }
      ]
    }],
    "warnings": [],
    "totalMaterials": []
  }'::jsonb,
  TRUE
),
(
  '분기 신설형',
  '상수도',
  '본관 + 분기관 2구간 + 이형관·제수밸브',
  '{
    "projectName": "분기 신설 (기본형)",
    "sections": [
      {
        "id": "No.1", "existingPipe": "D300", "newPipe": "D300", "length": 300,
        "components": [
          { "type": "kp", "spec": "D300mm", "qty": 8 },
          { "type": "valve", "spec": "D300mm", "qty": 1 },
          { "type": "bend", "spec": "D300mm", "qty": 2 }
        ]
      },
      {
        "id": "No.2", "existingPipe": "D150", "newPipe": "D150", "length": 80,
        "components": [
          { "type": "kp", "spec": "D150mm", "qty": 2 },
          { "type": "valve", "spec": "D150mm", "qty": 1 }
        ]
      }
    ],
    "warnings": [],
    "totalMaterials": []
  }'::jsonb,
  TRUE
),
(
  '하수관 신설형',
  '하수도',
  'D250 하수관 신설 + 맨홀 정기 배치',
  '{
    "projectName": "하수관 신설 (기본형)",
    "sections": [{
      "id": "No.1", "existingPipe": "D250", "newPipe": "D250", "length": 300,
      "components": [
        { "type": "manhole", "spec": "D250mm", "qty": 4 },
        { "type": "kp", "spec": "D250mm", "qty": 8 }
      ]
    }],
    "warnings": [],
    "totalMaterials": []
  }'::jsonb,
  TRUE
);
