import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-label font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0",
  {
    variants: {
      variant: {
        default:
          "bg-glass-2 text-foreground backdrop-blur-[20px] border border-border/50 shadow-sm hover:shadow-[0_0_20px_rgba(137,108,108,0.25)]",
        glass:
          "backdrop-blur-[20px] bg-white/30 border border-border/60 text-foreground shadow-sm hover:shadow-[0_0_16px_rgba(137,108,108,0.2)]",
        secondary:
          "bg-surface text-surface-foreground border border-border/50 hover:bg-muted hover:shadow-[0_0_12px_rgba(229,190,181,0.3)]",
        outline:
          "border border-border bg-white/20 backdrop-blur-[20px] hover:bg-white/30 hover:shadow-[0_0_12px_rgba(229,190,181,0.2)]",
        ghost:
          "hover:bg-white/20 hover:backdrop-blur-[20px] hover:text-foreground",
        link: "text-accent underline-offset-4 hover:underline hover:scale-100",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-full px-4",
        lg: "h-11 rounded-full px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
