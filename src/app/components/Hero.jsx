'use client'
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
const Hero = () => {
    const [code, setCode] = useState("");
    return (
        <section
            className="relative w-full min-h-screen flex items-center justify-center px-6 py-16 bg-primary overflow-hidden"
        >
            {/* Clouds background */}
            <div
                className="absolute inset-0 bg-[url('/cloud.png')]  object-cover bg-top"
                style={{
                    backgroundSize: "65em",
                    top: '1em',
                    backgroundRepeat: 'no-repeat'
                }} // control cloud size
            ></div>

            {/* Overlay tint (blue over clouds) */}
            {/* <div className="absolute inset-0 bg-primary/80"></div> */}

            {/* Content */}
            <div className="relative container z-20 mt-32 mx-auto flex flex-col items-center justify-center text-center gap-8">
                {/* Heading */}
                <div className="relative bottom-16">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-black leading-tight capitalize">
                        All-in-One Cloud Platform <br className="hidden md:block" /> for Schools
                    </h1>

                    {/* Subheading */}
                    <p className="text-black text-base md:text-lg lg:text-xl max-w-2xl">
                        Manage admissions, attendance, exams, communication, and more — all in one
                        smart, seamless platform designed for modern schools.
                    </p>
                </div>

                {/* Input + Button */}
                <div className="mt-14 flex flex-col sm:flex-row w-full max-w-lg gap-3">
                    <input
                        type="number"
                        placeholder="Enter Your School Code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="flex-1 bg-white  p-3 border-muted rounded-lg text-sm font-bold outline-none border-2"
                    />
                    <Link href={code ? `/login?schoolCode=EB-${code}` : "#"} passHref>
                        <Button
                            className="h-11 w-full sm:w-auto cursor-pointer font-bold text-lg rounded-lg px-6  bg-black text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!code}
                            // size={'lg'}
                        >
                            Submit
                        </Button>
                    </Link>
                </div>
            </div>
        </section>

    );
};

export default Hero;
