
import { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";

export default async function RecommendationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("internhub_session")?.value;

  const loginPath = "/login?next=%2Frecommendations";

  if (!token) {
    redirect(loginPath);
  }

  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    console.error("AUTH_SECRET is not configured.");
    redirect("/login");
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );

    if (
      !payload.userId ||
      payload.role !== "STUDENT"
    ) {
      redirect(loginPath);
    }
  } catch {
    redirect(loginPath);
  }

  return <>{children}</>;
}
