// Removido: import React from 'react';

interface StandardCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  description?: string;
}

export default function StandardCheckbox({
  label,
  checked,
  onChange,
  disabled = false,
  className = '',
  description
}: StandardCheckboxProps) {
  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg w-full">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
          {description && (
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {description}
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={`ml-3 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
            disabled 
              ? 'opacity-50 cursor-not-allowed bg-gray-300 dark:bg-gray-600'
              : checked
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              checked ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}