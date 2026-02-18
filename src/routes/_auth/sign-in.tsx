// import { usePostHog } from '@posthog/react';
import { IconCheck, IconSparkles } from '@tabler/icons-react';
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { useAppForm } from '~/components/form';
import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Field,
  FieldGroup,
  FieldLabel,
} from '~/components/ui';
import { authClient } from '~/lib/auth-client';
import { auth } from '~/server/auth';
import { useState } from 'react';

const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const { getRequestHeaders } = await import('@tanstack/react-start/server');

  return auth.api.getSession({
    headers: getRequestHeaders(),
  });
});

export const Route = createFileRoute('/_auth/sign-in')({
  beforeLoad: async () => {
    const session = await getSession();

    if (session) {
      throw redirect({
        to: '/',
      });
    }
  },
  component: SignInPage,
});

function SignInPage() {
  const nav = useNavigate();
  const router = useRouter();

  const form = useAppForm({
    defaultValues: {
      email: '',
      password: '',
      staySignedIn: false,
    },
    onSubmit: async ({ value }) => {
      const { email, password, staySignedIn } = value;

      await authClient.signIn.email(
        {
          email,
          password,
          rememberMe: staySignedIn,
        },
        {
          onRequest: () => {
            setOtpLoading(true);
          },
          onSuccess: async () => {
            setOtpLoading(false);
            await router.invalidate();
            await nav({ to: '/' });
          },
          onError: (ctx) => {
            setOtpLoading(false);
            console.log(ctx.error);
            alert(ctx.error.message);
          },
        },
      );
    },
  });

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
        },
        onError: (ctx) => {
          setOtpLoading(false);
          console.log(ctx.error);
          alert(ctx.error.message);
        },
      },
    );
  };

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Sign In</CardTitle>
        <CardAction>
          <Link to="/register">
            <Button size="sm">
              <IconSparkles />
              Register
            </Button>
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {/* <div className="mb-2 flex items-center gap-2">
          <div className="h-px flex-1 bg-border"></div>
          <CardDescription>Enter your email and password</CardDescription>
          <div className="h-px flex-1 bg-border"></div>
        </div> */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="grid gap-4"
        >
          <form.AppField name="email">
            {(emailField) => (
              <emailField.InputField label="Email" type="email" />
            )}
          </form.AppField>
          <form.AppField name="password">
            {(passwordField) => (
              <passwordField.InputField label="Password" type="password" />
            )}
          </form.AppField>
          <FieldGroup className="justify-between" orientation="horizontal">
            <form.AppField name="staySignedIn">
              {(staySignedInField) => (
                <Field orientation="horizontal">
                  <Checkbox
                    id={staySignedInField.name}
                    name={staySignedInField.name}
                  />
                  <FieldLabel
                    className="font-light"
                    htmlFor={staySignedInField.name}
                  >
                    Stay signed in
                  </FieldLabel>
                </Field>
              )}
            </form.AppField>
            <Button size="xs" variant="ghost">
              Forgot password
            </Button>
          </FieldGroup>
          <Button
            className="mt-4"
            disabled={otpLoading}
            size="lg"
            variant="solid"
          >
            <IconCheck />
            Sign in
          </Button>
        </form>
        <div className="mt-8 mb-4 flex items-center gap-2">
          <div className="h-px flex-1 bg-border"></div>
          <CardDescription>Or continue with</CardDescription>
          <div className="h-px flex-1 bg-border"></div>
        </div>
        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={otpLoading}
            type="button"
            variant="outline"
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
        </div>
      </CardContent>
    </Card>
  );
}
