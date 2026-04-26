'use client'
import { usePathname } from "next/navigation";
import Script from "next/script";

export default function TawkToScript() {
    const pathname = usePathname();
    const hideTawk = pathname.startsWith("/dashboard");

    if (hideTawk) return null;

    return (
        <Script
            id="1jmv56ekm"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
            __html: `
            var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
            (function(){
                var s1=document.createElement("script"),
                s0=document.getElementsByTagName("script")[0];
                s1.async=true;
                s1.src='https://embed.tawk.to/69eb1759f851631c32b88cec/1jmv56ekm';
                s1.charset='UTF-8';
                s1.setAttribute('crossorigin','*');
                s0.parentNode.insertBefore(s1,s0);
            })();
            `,
            }}
        />
    );
}
