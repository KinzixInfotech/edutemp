'use client'
import { Button } from '@/components/ui/button'
import Lottie from 'lottie-react'
import Link from 'next/link'
import React from 'react'
import animation from "../../public/er.json";

const page = () => {
    return (
        <div>
            <div className="w-full gap-2 h-full flex  flex-col items-center justify-center" >
                <Lottie
                    animationData={animation}
                    className="flex justify-center items-center w-96"
                    loop={true}
                />
                {/* <span className="text-muted-foreground text-center mb-2.5 font-semibold lg:text-lg txt-sm capitalize ">
                    The page you looking for doesn't exist, Please Make Sure The Url Is correct
                </span> */}
                <span className="text-5xl text-center font-bold capitalize">Page doesn't exist</span>
                <span className="text-muted-foreground text-center text-lg capitalize ">
                  Please Make Sure The Url Is correct
                </span>
                <Link href="/">
                    <Button className='mb-3.5 rounded-sm hover:border-black border-2 border-primary transition-all font-bold cursor-pointer hover:bg-muted hover:text-black'>Homepage</Button>
                </Link>
            </div>
        </div>
    )
}

export default page