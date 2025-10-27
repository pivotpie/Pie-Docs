import React from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label: React.FC<LabelProps> = ({ className = '', children, ...props }) => {
  const classes = `block text-sm font-medium text-gray-700 ${className}`;

  return (
    <label className={classes} {...props}>
      {children}
    </label>
  );
};