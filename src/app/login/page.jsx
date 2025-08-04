// app/login/page.js
import { Suspense } from "react";
import LoginPhoto from "./LoginPh";

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginPhoto />
        </Suspense>
    );
}
