import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/config";

export const getServerAuthSession = () => getServerSession(authOptions); 