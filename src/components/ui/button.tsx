import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-base font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/92 hover:shadow-lg hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:-translate-y-[1px] active:translate-y-0",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/92 hover:shadow-md hover:-translate-y-[1px] active:translate-y-0",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Semkat custom variants
        hero: "bg-gradient-hero text-primary-foreground font-semibold shadow-lg hover:shadow-glow hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99]",
        sky: "bg-semkat-sky text-secondary-foreground hover:bg-semkat-sky-dark hover:shadow-md hover:-translate-y-[1px] active:translate-y-0",
        "outline-primary": "border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-primary-foreground",
        "outline-sky": "border-2 border-semkat-sky text-semkat-sky bg-transparent hover:bg-semkat-sky hover:text-secondary-foreground",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-10 rounded-md px-4",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
