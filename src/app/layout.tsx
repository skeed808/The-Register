import type { Metadata } from 'next';
import '@fontsource/schibsted-grotesk/400.css';
import '@fontsource/schibsted-grotesk/600.css';
import '@fontsource/schibsted-grotesk/700.css';
import '@fontsource/schibsted-grotesk/800.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource/newsreader/400.css';
import './globals.css';
import { Frame } from '@/components/Frame';

export const metadata: Metadata = {
  title: 'The Register',
  description: 'Company records, with the working shown. A Mote Studios concept prototype.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" data-density="ledger">
      <body>
        <Frame>{children}</Frame>
      </body>
    </html>
  );
}
