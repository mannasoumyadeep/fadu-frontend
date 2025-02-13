import React from 'react';
import clsx from 'clsx';

const Card = ({ children, className, ...props }) => {
  return (
    <div className={clsx("rounded-lg border bg-white shadow p-4", className)} {...props}>
      {children}
    </div>
  );
};

const CardHeader = ({ children, className, ...props }) => {
  return (
    <div className={clsx("border-b pb-2 mb-2", className)} {...props}>
      {children}
    </div>
  );
};

const CardContent = ({ children, className, ...props }) => {
  return (
    <div className={clsx("pt-2", className)} {...props}>
      {children}
    </div>
  );
};

export { Card, CardHeader, CardContent };
