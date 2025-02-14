<<<<<<< HEAD
import * as React from "react"
import { cn } from "../../lib/utils"

const Button = React.forwardRef(({ 
  className, 
  variant = "default",
  size = "default",
  ...props 
}, ref) => {
  const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
  
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "underline-offset-4 hover:underline text-primary"
  }

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 px-3",
    lg: "h-11 px-8",
    icon: "h-10 w-10"
  }

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }
=======
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
>>>>>>> 126311a226d8285876475ba0d14da72eb156fb72
