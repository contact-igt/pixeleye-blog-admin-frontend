import React from 'react';
import { Search, X } from 'lucide-react';
import { Input, type InputProps } from './input';
import { IconButton } from './icon-button';

export interface SearchInputProps extends Omit<InputProps, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
}

export function SearchInput({ value, onChange, onClear, placeholder = 'Search...', className = '', ...props }: SearchInputProps) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      leftIcon={<Search size={16} />}
      rightIcon={
        value ? (
          <IconButton
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange('');
              onClear?.();
            }}
            aria-label="Clear search"
            className="h-6 w-6 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </IconButton>
        ) : undefined
      }
      className={className}
      {...props}
    />
  );
}
