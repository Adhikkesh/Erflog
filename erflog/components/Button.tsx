import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'outline' | 'black';
  size?: 'sm' | 'md' | 'lg' | 'full';
  children: React.ReactNode;
  disabled?: boolean;
  isLoading?: boolean;
}

export default function Button({
  variant = 'solid',
  size = 'md',
  children,
  disabled = false,
  isLoading = false,
  className = '',
  ...props
}: ButtonProps) {
  // Base styles
  const baseStyles =
    'font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-2';

  // Size variants
  const sizeStyles = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-5 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
    full: 'w-full px-6 py-4 text-base',
  };

  // Color variants
  const variantStyles = {
    solid:
      'bg-accent text-white hover:opacity-90 active:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl',
    outline:
      'border-2 border-ink text-ink hover:bg-ink hover:text-white active:bg-ink disabled:opacity-50 disabled:cursor-not-allowed',
    black:
      'bg-ink text-white hover:opacity-90 active:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed',
  };

  // Map variant to CSS custom properties
  const getVariantClass = () => {
    switch (variant) {
      case 'solid':
        return 'hover:shadow-xl active:shadow-md';
      case 'outline':
        return '';
      case 'black':
        return '';
      default:
        return '';
    }
  };

  const variantClass = variantStyles[variant];
  const sizeClass = sizeStyles[size];

  return (
    <button
      className={`${baseStyles} ${sizeClass} ${variantClass} ${getVariantClass()} ${className}`}
      disabled={disabled || isLoading}
      style={
        variant === 'solid'
          ? { backgroundColor: '#D95D39', color: '#FFFFFF' }
          : variant === 'outline'
            ? { borderColor: '#1A1A1A', color: '#1A1A1A' }
            : { backgroundColor: '#1A1A1A', color: '#FFFFFF' }
      }
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Processing...
        </>
      ) : (
        children
      )}
    </button>
  );
}
