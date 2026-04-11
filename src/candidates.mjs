import path from 'node:path';

const KEYWORDS = [
  { id: 'design_request', name: '디자인 의뢰서 작성', keys: ['design', '디자인', 'request', '의뢰', 'brief'] },
  { id: 'product_proposal', name: '상품화/기획 발의서 작성', keys: ['proposal', '발의', '기획', '사업', 'prd'] },
  { id: 'vendor_review', name: '업체 평가/모니터링', keys: ['vendor', 'outsour', '아웃소', '업체', '평가', 'monitor'] },
  { id: 'shipment_plan', name: '주간 선적 계획/물량 계획', keys: ['shipment', '선적', 'plan', '물량', 'scm', 'logistics'] },
  { id: 'sales_strategy', name: '영업/품질 대응 전략 메모', keys: ['sales', '영업', 'quality', '품질', 'issue'] },
];

export function proposeCandidates(files, { topK = 7 } = {}) {
  const scored = new Map();

  for (const f of files) {
    const base = path.basename(f.path).toLowerCase();
    for (const kw of KEYWORDS) {
      let s = 0;
      for (const k of kw.keys) {
        if (base.includes(k.toLowerCase())) s += 1;
      }
      // weak boost for likely office docs
      if (['.pptx', '.xlsx', '.pdf', '.docx', '.md', '.txt'].includes(f.ext)) s += 0.25;
      if (s > 0) {
        const prev = scored.get(kw.id) || { id: kw.id, name: kw.name, score: 0, evidence: [] };
        prev.score += s;
        if (prev.evidence.length < 3) prev.evidence.push({ file: f.path, ext: f.ext });
        scored.set(kw.id, prev);
      }
    }
  }

  const list = Array.from(scored.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((c, idx) => ({
      rank: idx + 1,
      id: c.id,
      name: c.name,
      confidence: Math.min(1, c.score / 8),
      evidence: c.evidence,
      next: 'coauthor_wizard',
    }));

  // Fallback candidate if nothing matched
  if (list.length === 0) {
    list.push({
      rank: 1,
      id: 'general_doc_skill',
      name: '문서 작성 스킬(범용)',
      confidence: 0.2,
      evidence: files.slice(0, 3).map((f) => ({ file: f.path, ext: f.ext })),
      next: 'coauthor_wizard',
    });
  }

  return list;
}
