import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ nextauth: string[] }>;
};

function requiredEnvironmentVariable(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set.`);
  }

  return value;
}

function createHandler() {
  return NextAuth({
    secret: requiredEnvironmentVariable("NEXTAUTH_SECRET"),
    providers: [
      GoogleProvider({
        clientId: requiredEnvironmentVariable("GOOGLE_CLIENT_ID"),
        clientSecret: requiredEnvironmentVariable("GOOGLE_CLIENT_SECRET"),
      }),
    ],
  });
}

export function GET(request: NextRequest, context: RouteContext) {
  return createHandler()(request, context);
}

export function POST(request: NextRequest, context: RouteContext) {
  return createHandler()(request, context);
}
