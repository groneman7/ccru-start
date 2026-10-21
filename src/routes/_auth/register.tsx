import { IconLogin2, IconSparkles } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';
import { useAppForm } from '~/components/form';
import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FieldGroup,
} from '~/components/ui';
import { authSessionQueryKey } from '~/features/auth/queries';
import { registrationModeQuery } from '~/features/registration/queries';
import { authClient } from '~/lib/auth-client';
import { useState } from 'react';

export const Route = createFileRoute('/_auth/register')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(registrationModeQuery()),
  component: RegisterPage,
});

function RegisterPage() {
  const mode = Route.useLoaderData();
  const [error, setError] = useState('');
  const nav = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useAppForm({
    defaultValues: {
      nameFirst: '',
      nameLast: '',
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      const { nameFirst, nameLast, email, password } = value;
      const normalizedFirst = nameFirst.trim();
      const normalizedLast = nameLast.trim();

      await authClient.signUp.email(
        {
          name: `${normalizedFirst} ${normalizedLast}`.trim(),
          nameFirst: normalizedFirst,
          nameLast: normalizedLast,
          email,
          password,
          callbackURL: '/onboarding',
        },
        {
          onRequest: () => {
            setOtpLoading(true);
          },
          onSuccess: async () => {
            setOtpLoading(false);
            queryClient.removeQueries({ queryKey: authSessionQueryKey });
            await router.invalidate();
            await nav({ to: '/' });
          },
          onError: (ctx) => {
            setOtpLoading(false);
            setError(ctx.error.message);
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
        callbackURL: '/onboarding',
        errorCallbackURL: '/sign-in',
      },
      {
        onRequest: () => {
          setOtpLoading(true);
        },
        onSuccess: async () => {
          setOtpLoading(false);
          queryClient.removeQueries({ queryKey: authSessionQueryKey });
          await router.invalidate();
          await nav({ to: '/' });
        },
        onError: (ctx) => {
          setOtpLoading(false);
          setError(ctx.error.message);
        },
      },
    );
  };

  if (mode !== 'open')
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registration is invitation-only</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Contact the organization to request an invitation.</p>
          <Link to="/sign-in">Sign in to an existing account</Link>
        </CardContent>
      </Card>
    );

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Register</CardTitle>
        <CardAction>
          <Link to="/sign-in">
            <Button size="sm">
              <IconLogin2 />
              Sign in
            </Button>
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {error && <p role="alert">{error}</p>}
        {/* <div className="mb-2 flex items-center gap-2">
              <div className="h-px flex-1 bg-border"></div>
              <CardDescription>Enter your email and password</CardDescription>
              <div className="h-px flex-1 bg-border"></div>
            </div> */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="grid gap-4"
        >
          <FieldGroup orientation="horizontal">
            <form.AppField name="nameFirst">
              {(nameFirstField) => (
                <nameFirstField.InputField label="First name" required />
              )}
            </form.AppField>
            <form.AppField name="nameLast">
              {(nameLastField) => (
                <nameLastField.InputField label="Last name" required />
              )}
            </form.AppField>
          </FieldGroup>
          <form.AppField name="email">
            {(emailField) => (
              <emailField.InputField label="Email" type="email" required />
            )}
          </form.AppField>
          <form.AppField name="password">
            {(passwordField) => (
              <passwordField.InputField
                label="Password"
                type="password"
                required
              />
            )}
          </form.AppField>
          <Button
            className="mt-4"
            disabled={otpLoading}
            size="lg"
            type="submit"
            variant="solid"
          >
            <IconSparkles />
            Continue
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
            Sign up with Google
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
