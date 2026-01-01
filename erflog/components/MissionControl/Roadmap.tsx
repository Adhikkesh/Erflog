'use client';

import { CheckCircle2 } from 'lucide-react';

interface RoadmapItem {
  day: number;
  title: string;
  completed?: boolean;
}

interface RoadmapProps {
  items: RoadmapItem[];
}

export default function Roadmap({ items }: RoadmapProps) {
  return (
    <div className="mt-8 border-t border-gray-700 pt-6">
      <h3 className="font-serif-bold text-white mb-4 text-lg">Learning Roadmap</h3>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-3">
            <div
              className="mt-1.5 h-5 w-5 rounded-full border-2 border-gray-500 flex items-center justify-center flex-shrink-0"
              style={{
                borderColor: item.completed ? '#4CAF50' : '#666666',
                backgroundColor: item.completed ? '#4CAF50' : 'transparent',
              }}
            >
              {item.completed && (
                <CheckCircle2 size={16} className="text-white" />
              )}
            </div>
            <div>
              <p className="text-white font-medium">
                Day {item.day}: {item.title}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
