import type { Metadata, Viewport } from "next";
import { Geist_Mono, Raleway } from "next/font/google";
import { Toaster } from "sonner";
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
  themeColor: "#ffffff",
};

/** El toast aparece debajo de la barra superior (48 px de chips + 24 px de padding) y respeta el notch. */
const TOAST_OFFSET = { top: "calc(var(--safe-top) + 76px)" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${raleway.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster
          position="top-center"
          offset={TOAST_OFFSET}
          mobileOffset={TOAST_OFFSET}
          containerAriaLabel="Notificaciones"
        />
      </body>
    </html>
  );
}
