'use client';
export const dynamic = 'force-dynamic';


import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import Lottie from 'lottie-react'
import Link from 'next/link'
import animation from "../../public/er.json";

const NotFoundContent = () => {
    return (
        <div className="w-full gap-2 h-full flex flex-col items-center justify-center">
            <Lottie animationData={animation} className="w-96" loop={true} />
            <span className="text-5xl text-center font-bold capitalize">Page doesn't exist</span>
            <span className="text-muted-foreground text-center text-lg capitalize">
                Please Make Sure The Url Is correct
            </span>
            <Link href="/">
                <Button className='mb-3.5 rounded-sm hover:border-black border-2 border-primary transition-all font-bold cursor-pointer hover:bg-muted hover:text-black'>
                    Homepage
                </Button>
            </Link>
        </div>
    )
}

export default function NotFoundPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <NotFoundContent />
        </Suspense>
    )
}
