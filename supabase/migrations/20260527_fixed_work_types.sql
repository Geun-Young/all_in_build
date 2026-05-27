-- ============================================================
-- fixed_labor / fixed_material / fixed_expense 타입 공종 추가
-- quantity 값이 그대로 노무비/재료비/경비로 사용되는 고정단가 방식
-- ============================================================

-- 터파기 (토공)
INSERT INTO work_types (code, category, name, spec, unit, expense_rate, expense_base)
VALUES ('T-1-1', '토공', '터파기', '일반토사', 'm³', 0, 'labor');

INSERT INTO work_components (work_type_id, component_type, component_name, quantity, unit, sort_order)
SELECT id, 'fixed_labor', '터파기', 28505, '원', 0
FROM work_types WHERE name = '터파기' AND spec = '일반토사';
