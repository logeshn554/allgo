import { DirectionProvider, ThemeProvider, Toaster, TooltipProvider } from '@allgo/ui';
import { Geist_Mono, Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const fontMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = {
  title: 'AllGo Merchant Web',
  description: 'Manage store catalog, live order queue, operating hours, and settlements.',
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
      className={['antialiased', fontMono.variable, 'font-sans', inter.variable].join(' ')}
    >
      <body>
        <DirectionProvider direction="ltr">
          <ThemeProvider>
            <TooltipProvider>
              <Toaster />
              {children}
            </TooltipProvider>
          </ThemeProvider>
        </DirectionProvider>
      </body>
    </html>
  );
}
