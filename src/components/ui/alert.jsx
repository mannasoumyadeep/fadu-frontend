<<<<<<< HEAD
import * as React from "react"
import { cn } from "../../lib/utils"

const Alert = React.forwardRef(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(
      "relative w-full rounded-lg border p-4",
      {
        "bg-background text-foreground": variant === "default",
        "bg-destructive text-destructive-foreground": variant === "destructive",
      },
      className
    )}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
=======
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
>>>>>>> 126311a226d8285876475ba0d14da72eb156fb72
