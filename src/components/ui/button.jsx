import React from 'react';
import clsx from 'clsx';

const Button = ({ children, variant = "default", className, ...props }) => {
  let variantClasses = "bg-blue-500 hover:bg-blue-600 text-white";
  if (variant === "secondary") {
    variantClasses = "bg-gray-500 hover:bg-gray-600 text-white";
  }
  if (variant === "destructive") {
    variantClasses = "bg-red-500 hover:bg-red-600 text-white";
  }
  return (
    <button className={clsx("px-4 py-2 rounded transition-colors", variantClasses, className)} {...props}>
      {children}
    </button>
  );
};

export { Button };
