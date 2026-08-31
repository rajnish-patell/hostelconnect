import { Public_Sans } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/constants/brand";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-public-sans",
  display: "swap",
});

export const metadata = {
  title: {
    default: `${BRAND.name} — Safe Video Calling for Hostel Students & Parents`,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  keywords: [
    "hostel video call",
    "boarding school parent call",
    "supervised student video",
    "hostel calling tablet",
    "kiosk calling system",
    "child safe video calling",
  ],
  authors: [{ name: "HostelConnect Inc." }],
  creator: "HostelConnect",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    title: `${BRAND.name} — Supervised Hostel Video Calling`,
    description: BRAND.description,
    siteName: BRAND.name,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — Supervised Hostel Video Calling`,
    description: BRAND.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  themeColor: "#00A76F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={publicSans.variable} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem('hc_theme');
                if (saved === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                  document.documentElement.style.colorScheme = 'dark';
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                  document.documentElement.style.colorScheme = 'light';
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#FFFFFF] dark:bg-[#141A21] text-[#1C252E] dark:text-[#FFFFFF] antialiased selection:bg-[#00A76F]/20 selection:text-[#00A76F] transition-colors duration-200">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
