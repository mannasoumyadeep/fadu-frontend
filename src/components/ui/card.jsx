<<<<<<< HEAD
import * as React from "react"
import { cn } from "../../lib/utils"

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

export { Card, CardHeader, CardContent }
=======
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
>>>>>>> 126311a226d8285876475ba0d14da72eb156fb72
