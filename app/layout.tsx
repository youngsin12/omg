import type { Metadata } from "next";
import { Noto_Sans_KR, Outfit } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-noto-sans-kr",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "ProShot — 셀카 한 장으로 증명사진부터 컨셉 화보까지",
  description:
    "스튜디오 예약 없이 5분 만에. 취업용 증명사진, 여권사진, 비즈니스 헤드샷, 아이돌 프로필, 커스텀 컨셉 화보까지 셀카 한 장으로 완성하고 인화용 시트로 바로 출력하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${notoSansKr.variable} ${outfit.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
