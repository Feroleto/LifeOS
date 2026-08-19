import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { ApiError } from "@/api/api-error";
import { Field } from "@/components/field";
import { errorMessages } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useIdentity } from "./identity-context";
import { createUser, getMe } from "./user.api";
import {
  createUserSchema,
  detectUserDefaults,
  existingUserSchema,
  toCreateUserBody,
} from "./user.schemas";
import type { CreateUserValues, ExistingUserValues } from "./user.schemas";
import { clearStoredUserId, setStoredUserId } from "./user-id-storage";

export function SetupPage() {
  const navigate = useNavigate();
  const { signIn } = useIdentity();

  const goToApp = (userId: string) => {
    signIn(userId);
    navigate("/goals", { replace: true });
  };

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Life OS</h1>
        <p className="text-muted-foreground text-sm">
          The API has no authentication yet — it identifies you by a user id sent on every
          request.
        </p>
      </header>

      <ExistingUserCard onSignedIn={goToApp} />
      <NewUserCard onSignedIn={goToApp} />
    </main>
  );
}

function ExistingUserCard({ onSignedIn }: { onSignedIn: (userId: string) => void }) {
  const form = useForm<ExistingUserValues>({
    resolver: zodResolver(existingUserSchema),
    defaultValues: { userId: "" },
  });

  const signIn = useMutation({
    mutationFn: async (values: ExistingUserValues) => {
      // getMe reads the header from storage, so the claim is written first and
      // rolled back when the API rejects it.
      setStoredUserId(values.userId);

      try {
        return await getMe();
      } catch (error) {
        clearStoredUserId();
        throw error;
      }
    },
    onSuccess: (user) => onSignedIn(user.id),
  });

  const notFound = signIn.error instanceof ApiError && signIn.error.status === 401;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Use an existing id</CardTitle>
        <CardDescription>
          <code>npm run db:seed</code> prints one as <code>X-User-Id</code>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => signIn.mutate(values))}
        >
          <Field
            label="User id"
            htmlFor="userId"
            error={
              form.formState.errors.userId?.message ??
              (signIn.isError
                ? notFound
                  ? "No user matches this id"
                  : errorMessages(signIn.error).join(" ")
                : undefined)
            }
          >
            <Input
              id="userId"
              autoComplete="off"
              placeholder="00000000-0000-0000-0000-000000000000"
              {...form.register("userId")}
            />
          </Field>

          <Button type="submit" disabled={signIn.isPending}>
            {signIn.isPending ? "Checking…" : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function NewUserCard({ onSignedIn }: { onSignedIn: (userId: string) => void }) {
  const defaults = detectUserDefaults();

  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", email: "", ...defaults },
  });

  const create = useMutation({
    mutationFn: (values: CreateUserValues) => createUser(toCreateUserBody(values)),
    onSuccess: (user) => onSignedIn(user.id),
    onError: (error) => {
      // The unique index is on email, so a 409 can only be that.
      if (error instanceof ApiError && error.status === 409) {
        form.setError("email", { message: "This email is already registered" });
      }
    },
  });

  const handled = create.error instanceof ApiError && create.error.status === 409;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a new user</CardTitle>
        <CardDescription>Time zone and locale are how your dates get formatted.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => create.mutate(values))}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="name" error={form.formState.errors.name?.message}>
              <Input id="name" {...form.register("name")} />
            </Field>

            <Field label="Email" htmlFor="email" error={form.formState.errors.email?.message}>
              <Input id="email" type="email" {...form.register("email")} />
            </Field>

            <Field
              label="Time zone"
              htmlFor="timezone"
              hint="IANA name, e.g. America/Sao_Paulo"
              error={form.formState.errors.timezone?.message}
            >
              <Input id="timezone" {...form.register("timezone")} />
            </Field>

            <Field
              label="Locale"
              htmlFor="locale"
              hint="BCP 47 tag, e.g. pt-BR"
              error={form.formState.errors.locale?.message}
            >
              <Input id="locale" {...form.register("locale")} />
            </Field>
          </div>

          {create.isError && !handled ? (
            <p className="text-destructive text-xs">{errorMessages(create.error).join(" ")}</p>
          ) : null}

          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create and continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
