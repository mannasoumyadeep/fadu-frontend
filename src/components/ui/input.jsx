<<<<<<< HEAD
import * as React from "react"
import { cn } from "../../lib/utils"

const Input = React.forwardRef(({ className, type = "text", ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
        "ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
=======
import React from 'react';
import clsx from 'clsx';

const Input = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={clsx("px-3 py-2 border rounded focus:outline-none", className)}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
>>>>>>> 126311a226d8285876475ba0d14da72eb156fb72
