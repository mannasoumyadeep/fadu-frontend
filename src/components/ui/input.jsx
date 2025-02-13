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
