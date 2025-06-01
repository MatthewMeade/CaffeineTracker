import { cache } from "react";
import { auth } from "~/auth";

export const getServerAuthSession = cache(() => auth());
