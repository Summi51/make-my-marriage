import { ok } from "@/server/http/responses";

export function GET() {
  return ok({ status: "healthy" });
}
