import type { ComponentProps } from "react";

export function Label({ children, htmlFor }: ComponentProps<"label">) {
  return (
    <span>
      <label className="text-sm font-semibold" htmlFor={htmlFor}>
        {children}
      </label>
    </span>
  );
}
