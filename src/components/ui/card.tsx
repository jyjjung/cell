import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ImageIcon, Star } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage, AvatarBlock } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';

const cardVariants = cva('text-card-foreground', {
  variants: {
    variant: {
      default: 'ui-card',
      flat: 'ui-card-flat',
      muted: 'ui-surface',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type CardProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>;

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant }), className)} {...props} />
  ),
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-1.5', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-section-title', className)} {...props} />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('pt-4', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center pt-4', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';

type CardSlotProps = React.HTMLAttributes<HTMLDivElement>;

const CardSlot = React.forwardRef<HTMLDivElement, CardSlotProps>(({ className, children, ...props }, ref) => (
  <Card ref={ref} className={cn('min-w-[240px] gap-6 p-6', className)} {...props}>
    <div className="flex h-[120px] w-full items-center justify-center rounded-md bg-muted">{children}</div>
  </Card>
));
CardSlot.displayName = 'CardSlot';

type ProductInfoCardProps = React.HTMLAttributes<HTMLDivElement> & {
  image?: React.ReactNode;
  title?: React.ReactNode;
  value?: React.ReactNode;
  description?: React.ReactNode;
};

const ProductInfoCard = React.forwardRef<HTMLDivElement, ProductInfoCardProps>(
  ({ className, image, title = 'Title', value = '$0', description = 'Body text.', ...props }, ref) => (
    <Card ref={ref} className={cn('min-w-[240px] gap-4 p-4', className)} {...props}>
      <div className="flex h-[247px] w-full items-center justify-center rounded-md bg-muted">
        {image ?? <ImageIcon aria-hidden="true" className="h-16 w-16 text-muted-foreground/20" />}
      </div>
      <div className="flex w-full flex-col gap-2">
        <Text>{title}</Text>
        <Text variant="strong">{value}</Text>
        {description ? <Text variant="small">{description}</Text> : null}
      </div>
    </Card>
  ),
);
ProductInfoCard.displayName = 'ProductInfoCard';

type StatsCardProps = React.HTMLAttributes<HTMLDivElement> & {
  icon?: React.ReactNode;
  value?: React.ReactNode;
  label?: React.ReactNode;
};

const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  ({ className, icon, value = '100', label = 'Body text', ...props }, ref) => (
    <Card ref={ref} className={cn('min-w-[240px] items-center gap-6 p-6 text-center', className)} {...props}>
      {icon ?? <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted" />}
      <div className="flex w-full flex-col items-center gap-1">
        <Text as="p" variant="strong" className="text-2xl leading-tight tracking-tight">{value}</Text>
        <Text>{label}</Text>
      </div>
    </Card>
  ),
);
StatsCard.displayName = 'StatsCard';

type ReviewCardProps = React.HTMLAttributes<HTMLDivElement> & {
  rating?: number;
  title?: React.ReactNode;
  body?: React.ReactNode;
  reviewer?: { name: string; date?: string; image?: string };
};

const ReviewCard = React.forwardRef<HTMLDivElement, ReviewCardProps>(
  (
    {
      className,
      rating = 5,
      title = 'Review title',
      body = 'Review body',
      reviewer = { name: 'Reviewer name', date: 'Date' },
      ...props
    },
    ref,
  ) => (
    <Card ref={ref} className={cn('min-w-[240px] gap-6 p-6', className)} {...props}>
      <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            aria-hidden="true"
            className={cn('h-5 w-5', index < rating ? 'fill-current text-primary' : 'text-muted-foreground/40')}
          />
        ))}
      </div>
      <div className="flex w-full flex-col items-start gap-1">
        <Text as="h3" variant="strong" className="text-2xl leading-tight tracking-tight">{title}</Text>
        <Text className="w-full">{body}</Text>
      </div>
      <AvatarBlock
        className="w-full"
        avatar={
          <Avatar size="lg">
            {reviewer.image ? <AvatarImage src={reviewer.image} alt="" /> : null}
            <AvatarFallback>{reviewer.name.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
        }
        title={reviewer.name}
        description={reviewer.date}
      />
    </Card>
  ),
);
ReviewCard.displayName = 'ReviewCard';

type TestimonialCardProps = React.HTMLAttributes<HTMLDivElement> & {
  quote?: React.ReactNode;
  name?: string;
  role?: string;
  image?: string;
};

const TestimonialCard = React.forwardRef<HTMLDivElement, TestimonialCardProps>(
  ({ className, quote = 'A thoughtful space for the community.', name = 'Member name', role = 'Member', image, ...props }, ref) => (
    <Card ref={ref} className={cn('min-w-[240px] gap-6 p-6', className)} {...props}>
      <Text>{quote}</Text>
      <AvatarBlock
        avatar={
          <Avatar size="lg">
            {image ? <AvatarImage src={image} alt="" /> : null}
            <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
        }
        title={name}
        description={role}
      />
    </Card>
  ),
);
TestimonialCard.displayName = 'TestimonialCard';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardSlot,
  ProductInfoCard,
  StatsCard,
  ReviewCard,
  TestimonialCard,
};
