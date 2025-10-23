// app/login/page.js
import { Suspense } from "react";
import LoginPhoto from "./LoginPh";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center w-full h-full flex-col gap-4">
            <Loader2 size={30} color="black"/>
            Loading...</div>}>
            <LoginPhoto />
        </Suspense>
    );
}
