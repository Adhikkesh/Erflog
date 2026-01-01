'use client';

import Button from '@/components/Button';
import GapAnalysis from './GapAnalysis';
import Roadmap from './Roadmap';

interface JobDetailProps {
  jobId: string;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  matchScore: number;
  gaps?: Array<{
    skill: string;
    importance: 'high' | 'medium' | 'low';
    estimatedTime: string;
  }>;
  roadmapItems?: Array<{
    day: number;
    title: string;
    completed?: boolean;
  }>;
}

export default function JobDetail({
  jobTitle,
  companyName,
  jobDescription,
  matchScore,
  gaps = [],
  roadmapItems = [],
}: JobDetailProps) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Left Panel: Job Content (60%) */}
      <div className="lg:col-span-2">
        <div className="bg-surface rounded-lg border border-surface p-8" style={{ borderColor: '#E5E0D8' }}>
          <h2 className="font-serif-bold text-3xl text-ink mb-2">{jobTitle}</h2>
          <p className="text-secondary text-lg mb-6">{companyName}</p>
          <div className="prose prose-sm max-w-none">
            <p className="text-ink leading-relaxed whitespace-pre-wrap font-serif">
              {jobDescription}
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel: Dark Terminal Panel (40%) */}
      <div
        className="lg:col-span-1 rounded-lg p-8 text-white"
        style={{ backgroundColor: '#1A1A1A' }}
      >
        {/* Match Protocol Status */}
        <div className="mb-6">
          <h3 className="font-mono text-2xl font-bold text-accent mb-2">
            Match Protocol: {matchScore}%
          </h3>
          <p className="text-gray-400 text-sm">Ready</p>
        </div>

        {/* Action Button */}
        <Button
          variant="solid"
          size="full"
          className="font-mono font-semibold tracking-wider"
          style={{ letterSpacing: '0.05em' }}
        >
          GENERATE DEPLOYMENT KIT
        </Button>

        {/* Gap Analysis */}
        <GapAnalysis gaps={gaps} />

        {/* Roadmap */}
        <Roadmap items={roadmapItems} />
      </div>
    </div>
  );
}
