import { Geist_Mono, Inter } from 'next/font/google';
import './globals.css';
import { OfflineBanner } from '@/components/OfflineBanner';
import { TopLoader } from '@/components/TopLoader';
import { AuthProvider } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { DirectionProvider, ThemeProvider, Toaster, TooltipProvider } from '@allgo/ui';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata = {
  title: 'AllGo Super App Admin Control Console',
  description: 'Operations, user identity, and service zone governance',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={cn('antialiased', fontMono.variable, 'font-sans', inter.variable)}
    >
      <body>
        <DirectionProvider direction="ltr">
          <ThemeProvider>
            <TooltipProvider>
              <TopLoader />
              <OfflineBanner />
              <Toaster />
              <AuthProvider>{children}</AuthProvider>
            </TooltipProvider>
          </ThemeProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}
