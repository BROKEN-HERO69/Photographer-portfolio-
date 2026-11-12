interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
}

export default function SectionHeading({ eyebrow, title, description, align = 'left' }: SectionHeadingProps) {
  const alignment = align === 'center' ? 'mx-auto text-center' : '';
  return (
    <div className={`max-w-2xl space-y-4 ${alignment}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="text-4xl sm:text-5xl">{title}</h2>
      {description && <p className="text-base leading-relaxed text-charcoal-600">{description}</p>}
    </div>
  );
}
