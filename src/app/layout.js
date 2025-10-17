// app/layout.js
import { useAuth } from "@/context/AuthContext";
import ClientProduct from "./ClientProduct";
import "./product.css";
// import ClientLayout from "./ClientLayout";
import { Toaster } from "@/components/ui/sonner"
import LoaderPage from "@/components/loader-page";
import Provider from "./Provider";


export const metadata = {
  title: "EduBreezy",
  description: "Edubreezy Developed By Kinzix",
};

export default function RootLayout({ children }) {

  return (
    <Provider>
      <html lang="en" suppressHydrationWarning={true}>

        <body className="min-h-screen flex flex-col">

          <ClientProduct>{children}</ClientProduct>
          <Toaster
            theme="system"
            toastOptions={{
              classNames: {
                description: "text-sm mt-1 !text-black dark:!text-white",
              },
            }}
          />
        </body>
      </html>
    </Provider>
  );
}
