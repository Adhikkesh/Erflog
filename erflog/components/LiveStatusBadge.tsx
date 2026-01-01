'use client';

export default function LiveStatusBadge() {
  return (
    <div className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium" 
      style={{ backgroundColor: '#E8F5E9', color: '#2E7D32' }}>
      <div className="h-2 w-2 rounded-full animate-pulse" 
        style={{ backgroundColor: '#2E7D32' }} />
      <span>Agent 3: Active</span>
    </div>
  );
}
