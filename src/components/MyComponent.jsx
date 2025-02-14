import React from 'react';
import clsx from 'clsx';

// Example component that uses clsx for conditional class names
const MyComponent = ({ isActive }) => {
  // "base-class" is always applied; "active-class" is applied if isActive is true.
  const myClasses = clsx("base-class", isActive && "active-class");

  return (
    <div className={myClasses}>
      Content goes here. {isActive ? "Active" : "Inactive"}
    </div>
  );
};

export default MyComponent;
