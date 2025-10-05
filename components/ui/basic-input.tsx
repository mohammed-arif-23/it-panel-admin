import * as React from "react"

export interface BasicInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const BasicInput = React.forwardRef<HTMLInputElement, BasicInputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={"w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200"}
        ref={ref}
        {...props}
      />
    )
  }
)
BasicInput.displayName = "BasicInput"

export { BasicInput }