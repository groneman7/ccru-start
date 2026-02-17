import { usePostHog } from '@posthog/react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui';
import { authClient } from '~/lib/auth-client';
import { cn } from '~/lib/utils';
import { auth } from '~/server/auth';
import dayjs from 'dayjs';
import { useState } from 'react';

const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const { getRequestHeaders } = await import('@tanstack/react-start/server');

  return auth.api.getSession({
    headers: getRequestHeaders(),
  });
});

export const Route = createFileRoute('/sign-in')({
  beforeLoad: async () => {
    const session = await getSession();

    if (session) {
      throw redirect({
        to: '/',
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const posthog = usePostHog();
  const time = dayjs().hour();
  const isNight = time >= 19 || time <= 7;

  const [otpLoading, setOtpLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    await authClient.signIn.social(
      {
        provider: 'google',
        callbackURL: '/',
      },
      {
        onRequest: () => {
          setOtpLoading(true);
        },
        onSuccess: () => {
          setOtpLoading(false);
          posthog.capture('user_signed_in', {
            provider: 'google',
          });
        },
        onError: (ctx) => {
          setOtpLoading(false);
          console.log(ctx.error);
          posthog.capture('sign_in_failed', {
            provider: 'google',
            error_message: ctx.error.message,
          });
          posthog.captureException(ctx.error);
          alert(ctx.error.message);
        },
      },
    );
  };

  return (
    <div
      className={cn(
        'flex h-screen flex-1 items-center justify-center bg-cover bg-center bg-no-repeat bg-origin-border',
        isNight
          ? 'bg-[url("/camping_vector_night.svg")]'
          : 'bg-[url("/camping_vector.svg")]',
      )}
    >
      <Card className="h-full w-lg flex-col justify-center rounded-none p-0">
        <div className="flex flex-1 flex-col justify-center">
          <CardHeader>
            <CardTitle className="text-center text-lg md:text-xl">
              Sign In
            </CardTitle>
            <CardDescription className="text-center text-xs md:text-sm">
              Enter your email below to login to your account
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center px-8 pt-4 pb-16">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={otpLoading}
              onClick={handleGoogleSignIn}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="0.98em"
                height="1em"
                viewBox="0 0 256 262"
              >
                <path
                  fill="#4285F4"
                  d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                />
                <path
                  fill="#34A853"
                  d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                />
                <path
                  fill="#FBBC05"
                  d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"
                />
                <path
                  fill="#EB4335"
                  d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                />
              </svg>
              Sign in with Google
            </Button>
            {/* <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSignIn();
          }}
          className="grid gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              value={email}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Button
                variant="link"
                size="sm"
                type="button"
                onClick={handleResetPassword}
                className="cursor-pointer"
                disabled={forgotLoading || !email}
              >
                {forgotLoading ? (
                  <Loader2 size={14} className="mr-1 animate-spin" />
                ) : null}
                Forgot your password?
              </Button>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="password"
              autoComplete="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={otpLoading}>
              Sign in
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-neutral-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-neutral-500">
                or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            disabled={otpLoading}
            onClick={handleGoogleSignIn}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="0.98em"
              height="1em"
              viewBox="0 0 256 262"
            >
              <path
                fill="#4285F4"
                d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
              />
              <path
                fill="#34A853"
                d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
              />
              <path
                fill="#FBBC05"
                d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"
              />
              <path
                fill="#EB4335"
                d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
              />
            </svg>
            Sign in with Google
          </Button>
        </form> */}
          </CardContent>
        </div>
        <div className="flex w-full justify-center py-2">
          <p className="text-center text-xs text-gray-500">
            Powered by{' '}
            <a
              href="https://better-auth.com"
              className="underline"
              target="_blank"
            >
              better-auth
            </a>
            .
          </p>
        </div>
      </Card>
    </div>
  );
}
