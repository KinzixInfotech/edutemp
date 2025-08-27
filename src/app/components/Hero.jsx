'use client'
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
const Hero = () => {
    const [code, setCode] = useState("");
    return (
        <section className="w-full min-h-screen bg-[#e9f2ff] flex items-center justify-center px-6 py-16">
            <div className="container mx-auto flex flex-col items-center justify-center text-center gap-8">

                {/* Heading */}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-black leading-tight capitalize">
                    All-in-One Cloud Platform <br className="hidden md:block" /> for Schools
                </h1>

                {/* Subheading */}
                <p className="text-gray-700 text-base md:text-lg lg:text-xl max-w-2xl">
                    Manage admissions, attendance, exams, communication, and more — all in one
                    smart, seamless platform designed for modern schools.
                </p>

                {/* Input + Button */}
                <div className="mt-6 flex flex-col sm:flex-row w-full max-w-lg gap-3">
                    <input
                        type="text"
                        placeholder="Enter Your School Code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="flex-1 bg-white p-3 border rounded-lg text-sm outline-none shadow-sm"
                    />
                    <Link href={code ? `/login?schoolCode=${code}` : "#"} passHref>
                        <Button
                            className="h-11 w-full sm:w-auto cursor-pointer font-semibold rounded-lg px-6 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!code}
                        >
                            Submit
                        </Button>
                    </Link>
                </div>

                {/* Optional Extra Button */}
                {/* <div className="mt-4 w-full max-w-lg flex flex-col items-center gap-2">
          <span className="font-semibold text-gray-600">OR</span>
          <InteractiveHoverButton className="rounded-lg w-full sm:w-auto flex items-center justify-center">
            Request A Demo
          </InteractiveHoverButton>
        </div> */}
            </div>
        </section>
    );
};

export default Hero;
