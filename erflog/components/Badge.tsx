import React from 'react';

interface BadgeProps {
  variant?: 'status' | 'score';
  status?: 'active' | 'inactive';
  score?: number;
  label?: string;
  children?: React.ReactNode;
  className?: string;
}

export default function Badge({
  variant = 'status',
  status = 'active',
  score,
  label,
  children,
  className = '',
}: BadgeProps) {
  if (variant === 'status') {
    return (
      <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${className}`}
        style={{ 
          backgroundColor: status === 'active' ? '#E8F5E9' : '#F5F5F5',
          color: status === 'active' ? '#2E7D32' : '#757575'
        }}
      >
        <div
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: status === 'active' ? '#2E7D32' : '#757575' }}
        />
        {label || children}
      </div>
    );
  }

  if (variant === 'score') {
    const isHighScore = score !== undefined && score >= 80;
    const scoreColor = isHighScore ? '#2E7D32' : '#D95D39'; // Green for ≥80%, Orange for <80%

    return (
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-lg font-serif-bold text-2xl ${className}`}
        style={{
          backgroundColor: '#F0F0F0',
          color: scoreColor,
        }}
      >
        {score}%
      </div>
    );
  }

  return null;
}
