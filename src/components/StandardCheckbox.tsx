import React from 'react';

interface StandardCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  // Removido: description?: string;
}

export default function StandardCheckbox({
  label,
  checked,
  onChange,
  disabled = false,
  className = '',
  // Removido: description
}: StandardCheckboxProps) {
  return (
    <div className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg w-full ${className}`}>
      <label 
        className={`text-sm font-medium ${disabled ? 'text-gray-500 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'} cursor-pointer`}
        onClick={() => !disabled && onChange(!checked)}
      >
        {label}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
          disabled 
            ? 'opacity-50 cursor-not-allowed bg-gray-300 dark:bg-gray-600'
            : checked
              ? 'bg-blue-600 hover:bg-blue-700'
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
  );
}