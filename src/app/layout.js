// app/layout.js
import ClientProduct from "./ClientProduct";
import "./product.css";
// import ClientLayout from "./ClientLayout";
import { Toaster } from "@/components/ui/sonner"

export const metadata = {
  title: "EduBreezy",
  description: "Edubreezy Developed By Kinzix",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">
        <ClientProduct>{children}</ClientProduct>
        <Toaster />
      </body>
    </html>
  );
}
