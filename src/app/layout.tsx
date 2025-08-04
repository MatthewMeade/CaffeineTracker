import { Inter } from "next/font/google";
import { auth } from "~/auth";
import { SessionProvider } from "~/app/_components/SessionProvider";
import "~/styles/globals.css";
import { QueryWrapper } from "./_components/QueryWrapper";


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "lesspresso",
  description: "Track your caffeine intake",
  icons: [{ rel: "icon", url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>" }],
};


export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const session = await auth();

  return (
    <html lang="en">
      <body className={`font-sans ${inter.variable} min-h-screen`}>
        <SessionProvider session={session}>
          <QueryWrapper>
            {children}
          </QueryWrapper>
        </SessionProvider>
      </body>
    </html>
  );
}
