import { Inter } from "next/font/google";
import { auth } from "~/auth";
import { SessionProvider } from "~/app/_components/SessionProvider";
import "~/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "Caffeine Tracker",
  description: "Track your caffeine intake",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en">
      <body className={`font-sans ${inter.variable} min-h-screen bg-gray-900`}>
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
