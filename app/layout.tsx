import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const title = 'You can buy a what?';
const description = 'Lighthouses, museum jets and snowmobiles. Discover unusual government property for sale, with prices, official links and the fine print.';
const url = 'https://www.kush.pw/you-can-buy-a-what';
const image = {url: `${url}/cover-v2.png`, width:1200, height:630, type:'image/png', alt:'You can buy a what? Lighthouses. Museum jets. Snowmobiles. Made with puffle.ai.'};
export const metadata: Metadata = {
  metadataBase: new URL('https://www.kush.pw'),
  title, description,
  alternates: {canonical:url},
  openGraph: {type:'website',url,title,description,siteName:title,images:[image]},
  twitter: {card:'summary_large_image',title,description,images:[image.url]},
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
