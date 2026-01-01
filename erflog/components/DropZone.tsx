'use client';

import React, { useState, useRef } from 'react';
import { CloudUpload } from 'lucide-react';

interface DropZoneProps {
  onFileSelect?: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

export default function DropZone({ onFileSelect, disabled = false, className = '' }: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragActive(e.type === 'dragenter' || e.type === 'dragover');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      // Validate PDF
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setSelectedFile(file);
        onFileSelect?.(file);
      } else {
        alert('Please drop a PDF file');
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      onFileSelect?.(file);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  return (
    <div
      className={`relative cursor-pointer ${className}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleClick}
      style={{
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-all duration-200 ${
          isDragActive ? 'border-accent bg-accent/5' : 'border-accent bg-white'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:border-accent/80'}`}
        style={{
          borderColor: isDragActive ? '#D95D39' : '#D95D39',
          backgroundColor: isDragActive ? 'rgba(217, 93, 57, 0.05)' : '#FFFFFF',
        }}
      >
        {/* Upload Icon */}
        <CloudUpload
          className="mb-4 text-accent"
          size={56}
          strokeWidth={1.5}
          style={{ color: '#D95D39' }}
        />

        {/* Text Content */}
        <div className="text-center">
          <p className="font-serif-bold text-lg text-ink mb-2">Drag & Drop PDF Resume</p>
          <p className="text-sm text-secondary">or click to select a file</p>
        </div>

        {/* Selected File Info */}
        {selectedFile && (
          <div className="mt-4 text-sm text-green-600 flex items-center gap-2">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {selectedFile.name}
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
        aria-label="Upload resume PDF"
      />
    </div>
  );
}
