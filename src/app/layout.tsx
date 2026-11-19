import type { Metadata, Viewport } from "next";
import { Geist_Mono, Raleway } from "next/font/google";
import { AppToaster } from "@/components/panels/AppToaster";
import { ClockSkewDialog } from "@/components/panels/ClockSkewDialog";
import { THEME_COLORS, THEME_INIT_SCRIPT } from "@/components/panels/themeScript";
import "./globals.css";

const raleway = Raleway({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Ruta Segura",
    template: "%s · Ruta Segura",
  },
  description: "Mira las rutas de Morelia en vivo y reporta en un toque cómo va tu unidad y tu parada.",
  applicationName: "Ruta Segura",
  formatDetection: { telephone: false },
  icons: {
    icon: "/icon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Ruta Segura",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Sigue al dispositivo; si el usuario elige un tema, el script del <head> ajusta el color.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: el script del <head> pone la clase `dark` antes de hidratar.
    <html
      lang="es"
      className={`${raleway.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Aplica el tema guardado o el del dispositivo antes del primer pintado (sin parpadeo). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <AppToaster />
        <ClockSkewDialog />
      </body>
    </html>
  );
}
