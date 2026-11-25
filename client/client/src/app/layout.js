import Auth from "./auth";
import Providers from "./providers";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { brand } from "@/config/brand";

export const metadata = {
  metadataBase: new URL(brand.url),
  title: "تکنوسرا | فروشگاه کنسول و بازی",
  description:
    "فروشگاه تکنوسرا؛ خرید کنسول، بازی و تجهیزات گیمینگ. محصولات را مقایسه کنید و بازی بعدی خود را پیدا کنید.",
  openGraph: {
    title: "تکنوسرا | فروشگاه کنسول و بازی",
    description:
      "فروشگاه تکنوسرا؛ خرید کنسول، بازی و تجهیزات گیمینگ. محصولات را مقایسه کنید و بازی بعدی خود را پیدا کنید.",
    url: brand.url,
    siteName: "فروشگاه تکنوسرا",
    images: [{ url: brand.image, alt: brand.name }],
    locale: "fa_IR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: `@${brand.handle}`,
    creator: `@${brand.handle}`,
    title: "تکنوسرا | فروشگاه کنسول و بازی",
    description:
      "فروشگاه تکنوسرا؛ خرید کنسول، بازی و تجهیزات گیمینگ. محصولات را مقایسه کنید و بازی بعدی خود را پیدا کنید.",
    images: [brand.image],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <Providers>
          <Auth>{children}</Auth>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
