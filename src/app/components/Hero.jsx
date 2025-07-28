import React from 'react'
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { InteractiveHoverButton } from "@/components/magicui/interactive-hover-button";
const Hero = () => {
    return (
        <section className="w-full rounded-lg min-h-screen bg-[#e9f2ff] flex items-center justify-center px-6 py-16">
            <div className="container mx-auto flex flex-col-reverse md:flex-row items-center justify-between gap-12">
                {/* Left Text Content */}
                <div className="w-full md:w-1/2 text-center md:text-left">
                    {/* <Badge text="Launch on ProductHunt 🚀" /> */}
                    <h1 className="text-4xl md:text-5xl font-bold text-black leading-tight capitalize">
                        All In one Cloud platform for schools
                    </h1>
                    {/* <p className="mt-6 text-red-500 text-sm">
                        Please enter a valid schoold code.
                    </p> */}
                    <div className="mt-4 md:w-[72%]  flex flex-col   gap-2">
                        <input
                            type="email"
                            placeholder="Enter Your School Code"
                            className="w-full  bg-white sm:w-auto p-3  border rounded-lg text-sm outline-none"
                        />
                        <Button className="w-full flex items-center justify-center sm:w-auto h-11  cursor-pointer font-semibold text-center rounded-lg p-3 bg-blue-600 text-white hover:bg-blue-700">
                            Submit
                        </Button>
                    </div>
                    <div className='flex items-center md:w-[72%]  justify-center flex-col gap-2 mt-2'>
                        <span className='font-bold'>OR</span>
                        <div className='flex flex-row  w-full  items-center  '>
                            <InteractiveHoverButton className="rounded-lg w-full flex items-center text-center justify-center">Request A Demo</InteractiveHoverButton>
                        </div>
                    </div>

                </div>

                {/* Right Image/Video Placeholder */}
                <div className="w-full md:w-1/2">
                    <div className="w-full h-64 md:h-[400px] bg-gray-300 rounded-lg flex items-center justify-center text-gray-600">
                        Image/Video Placeholder
                    </div>
                </div>
            </div>
        </section>
    )
}




export default Hero
