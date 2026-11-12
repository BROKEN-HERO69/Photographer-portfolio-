import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 px-5 py-32 text-center">
      <p className="eyebrow">404</p>
      <h1 className="text-5xl">This page is out of frame.</h1>
      <p className="text-charcoal-600">The page you are looking for does not exist or has moved.</p>
      <Link to="/" className="btn-primary">
        Back to home <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
