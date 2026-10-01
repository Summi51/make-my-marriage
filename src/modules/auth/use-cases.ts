import "server-only";
import { hash, verify, argon2id, type HashOptions } from "argon2";
import { z } from "zod";
import { User } from "./models";
import { signupSchema, loginSchema } from "./schemas";
import { AuthError } from "./errors";
import { connectToDatabase } from "@/server/db";
import { createSession } from "@/server/auth/sessions";

const passwordOptions: HashOptions & { raw?: false } = {
  type: argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
};
let dummyHash: Promise<string> | undefined;

export async function signup(input: z.infer<typeof signupSchema>) {
  await connectToDatabase();
  await User.init();
  const emailNormalized = input.email;
  if (await User.exists({ emailNormalized }))
    throw new AuthError(
      "EMAIL_ALREADY_EXISTS",
      "An account with this email already exists. Please sign in.",
      409,
    );
  const passwordHash = await hash(input.password, passwordOptions);
  let user;
  try {
    user = await User.create({
      name: input.name,
      email: input.email,
      emailNormalized,
      passwordHash,
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000)
      throw new AuthError(
        "EMAIL_ALREADY_EXISTS",
        "An account with this email already exists. Please sign in.",
        409,
      );
    throw error;
  }
  try {
    const session = await createSession(user._id.toString());
    return {
      user: { id: user._id.toString(), name: user.name, email: user.email },
      session,
      hasWedding: false,
    };
  } catch (error) {
    await User.deleteOne({ _id: user._id });
    throw error;
  }
}

export async function login(input: z.infer<typeof loginSchema>) {
  await connectToDatabase();
  const user = await User.findOne({
    emailNormalized: input.email,
  }).select("+passwordHash");
  dummyHash ??= hash("dummy password for timing equalisation", passwordOptions);
  const valid = await verify(
    user?.passwordHash ?? (await dummyHash),
    input.password,
  );
  if (!user || !valid)
    throw new AuthError("UNAUTHENTICATED", "Invalid email or password.", 401);
  const session = await createSession(user._id.toString());
  return {
    user: { id: user._id.toString(), name: user.name, email: user.email },
    session,
    hasWedding: false,
  };
}
