import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const iconBoxVariants = cva('flex shrink-0 items-center justify-center rounded-lg', {
  variants: {
    variant: {
      tint: 'bg-primary/10 text-primary',
      solid: 'bg-primary text-primary-foreground',
      muted: 'bg-muted text-muted-foreground',
    },
    size: {
      sm: 'h-7 w-7',
      md: 'h-9 w-9',
      lg: 'h-11 w-11',
    },
  },
  defaultVariants: {
    variant: 'tint',
    size: 'md',
  },
});

export function IconBox({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof iconBoxVariants>) {
  return (
    <div
      data-slot="icon-box"
      className={cn(iconBoxVariants({ variant, size }), className)}
      {...props}
    />
  );
}
