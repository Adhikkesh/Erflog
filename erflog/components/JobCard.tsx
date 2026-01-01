'use client';

import { useRouter } from 'next/navigation';
import Badge from '@/components/Badge';
import Button from '@/components/Button';

interface JobCardProps {
  id: string;
  companyLogo?: string;
  companyName: string;
  jobTitle: string;
  matchScore: number;
  onAnalyzeGap?: (id: string) => void;
  onDeploy?: (id: string) => void;
}

export default function JobCard({
  id,
  companyLogo,
  companyName,
  jobTitle,
  matchScore,
  onAnalyzeGap,
  onDeploy,
}: JobCardProps) {
  const router = useRouter();

  const handleAnalyzeGap = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAnalyzeGap?.(id);
    router.push(`/jobs/${id}`);
  };

  const handleDeploy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDeploy?.(id);
  };

  const handleCardClick = () => {
    router.push(`/jobs/${id}`);
  };

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-lg border border-surface bg-surface shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer"
      style={{ borderColor: '#E5E0D8' }}
      onClick={handleCardClick}
    >
      {/* Score Badge - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <Badge variant="score" score={matchScore} />
      </div>

      {/* Card Header with Logo and Title */}
      <div className="border-b border-surface p-6" style={{ borderColor: '#E5E0D8' }}>
        <div className="flex items-start gap-4">
          {/* Logo Placeholder */}
          <div
            className="h-12 w-12 rounded-full flex-shrink-0 flex items-center justify-center font-serif-bold text-lg text-white"
            style={{ backgroundColor: '#D95D39' }}
          >
            {companyName.charAt(0)}
          </div>

          {/* Job Title */}
          <div className="flex-1 pr-12">
            <h3 className="font-serif-bold text-lg text-ink line-clamp-2">{jobTitle}</h3>
          </div>
        </div>
      </div>

      {/* Company Name - Middle */}
      <div className="px-6 py-3 border-b border-surface" style={{ borderColor: '#E5E0D8' }}>
        <p className="text-sm text-secondary">{companyName}</p>
      </div>

      {/* Action Buttons - Bottom */}
      <div className="flex gap-2 p-6">
        <Button
          variant="outline"
          size="md"
          onClick={handleAnalyzeGap}
          className="flex-1 text-sm"
        >
          Analyze Gap
        </Button>
        <Button
          variant="black"
          size="md"
          onClick={handleDeploy}
          className="flex-1 text-sm"
        >
          Deploy
        </Button>
      </div>
    </div>
  );
}
