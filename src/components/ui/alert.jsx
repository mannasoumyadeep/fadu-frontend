import React from 'react';
import clsx from 'clsx';

const Alert = ({ children, variant = "default", className, ...props }) => {
  let variantClasses = "bg-blue-100 text-blue-800";
  if (variant === "destructive") {
    variantClasses = "bg-red-100 text-red-800";
  }
  return (
    <div className={clsx("rounded p-4", variantClasses, className)} {...props}>
      {children}
    </div>
  );
};

const AlertDescription = ({ children, className, ...props }) => {
  return (
    <p className={clsx("text-sm", className)} {...props}>
      {children}
    </p>
  );
};

export { Alert, AlertDescription };
