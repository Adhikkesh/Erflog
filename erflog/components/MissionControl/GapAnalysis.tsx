'use client';

import { AlertCircle } from 'lucide-react';

interface SkillGap {
  skill: string;
  importance: 'high' | 'medium' | 'low';
  estimatedTime: string;
}

interface GapAnalysisProps {
  gaps: SkillGap[];
}

export default function GapAnalysis({ gaps }: GapAnalysisProps) {
  if (gaps.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 border-t border-gray-700 pt-6">
      <h3 className="font-serif-bold text-white mb-4 text-lg">Missing Skills</h3>
      <div className="space-y-3">
        {gaps.map((gap, index) => (
          <div key={index} className="flex items-start gap-3">
            <AlertCircle
              size={20}
              className="mt-0.5 flex-shrink-0 text-yellow-400"
              style={{ color: '#FBC02D' }}
            />
            <div>
              <p className="text-white font-medium">{gap.skill}</p>
              <p className="text-gray-300 text-sm">
                Est. {gap.estimatedTime} • {gap.importance === 'high' ? 'High Priority' : gap.importance === 'medium' ? 'Medium Priority' : 'Nice to Have'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
