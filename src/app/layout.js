import './globals.css';
import Providers from './providers';

export const metadata = {
  title: '학생 관리 시스템',
  description: '학생 성적 및 상담 관리 시스템',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
