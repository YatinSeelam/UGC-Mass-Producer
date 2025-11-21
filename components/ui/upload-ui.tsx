'use client';

import * as React from 'react';
import { X, ArrowDownCircle, CheckCircle, XCircle } from 'lucide-react';
import clsx from 'clsx';

interface UploadCardProps {
  status: 'uploading' | 'success' | 'error';
  progress?: number; // Only relevant for 'uploading' status
  title: string;
  description: string;
  primaryButtonText: string;
  onPrimaryButtonClick?: () => void;
  secondaryButtonText?: string;
  onSecondaryButtonClick?: () => void;
}

export const UploadCard: React.FC<UploadCardProps> = ({
  status,
  progress,
  title,
  description,
  primaryButtonText,
  onPrimaryButtonClick,
  secondaryButtonText,
  onSecondaryButtonClick,
}) => {
  const renderIcon = () => {
    const iconClass = 'w-12 h-12 mb-4';
    
    switch (status) {
      case 'uploading':
        return <ArrowDownCircle className={clsx(iconClass, 'text-blue-500')} />;
      case 'success':
        return <CheckCircle className={clsx(iconClass, 'text-green-500')} />;
      case 'error':
        return <XCircle className={clsx(iconClass, 'text-red-500')} />;
      default:
        return null;
    }
  };

  const cardStyles = clsx(
    'relative rounded-lg shadow-lg p-6 max-w-md mx-auto',
    {
      'bg-blue-50 border-2 border-blue-200': status === 'uploading',
      'bg-green-50 border-2 border-green-200': status === 'success',
      'bg-red-50 border-2 border-red-200': status === 'error',
    }
  );

  return (
    <div className={cardStyles}>
      {/* Close button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={onPrimaryButtonClick}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Card body */}
      <div className="flex flex-col items-center text-center">
        {renderIcon()}
        
        <div className="w-full">
          <h3 className="text-xl font-semibold mb-2 text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mb-4">{description}</p>

          {status === 'uploading' && progress !== undefined && (
            <div className="space-y-4">
              <div className="relative">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <button
                onClick={onPrimaryButtonClick}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium"
              >
                {primaryButtonText}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons for success/error */}
      {(status === 'success' || status === 'error') && (
        <div className="mt-6 flex gap-3">
          <button
            onClick={onPrimaryButtonClick}
            className={clsx(
              'flex-1 px-4 py-2 rounded-md font-medium transition-colors',
              {
                'bg-green-500 text-white hover:bg-green-600': status === 'success',
                'bg-red-500 text-white hover:bg-red-600': status === 'error',
              }
            )}
          >
            {primaryButtonText}
          </button>
          {secondaryButtonText && (
            <button
              onClick={onSecondaryButtonClick}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
            >
              {secondaryButtonText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};




