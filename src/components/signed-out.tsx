import { Link } from '@tanstack/react-router';
import { Button } from '~/components/ui';

export function SignedOut() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <span>You are currently signed out.</span>
        <Link to="/sign-in">
          <Button variant="link">Click here to sign in.</Button>
        </Link>
      </div>
      <div className="flex-1"></div>
    </div>
  );
}
