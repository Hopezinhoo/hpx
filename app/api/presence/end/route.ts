import { presenceRequest } from "@/lib/presence-http";
export const POST = (request: Request) => presenceRequest(request, "end");
