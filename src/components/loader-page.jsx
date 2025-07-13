import React from 'react'
import {
    LoaderCircle
  } from 'lucide-react';
const LoaderPage = () => {
    return (
        <div className='flex flex-col text-center w-full h-[100%]  items-center justify-center'>
            <LoaderCircle size={34} className='animate-spin' />
        </div>
    )
}

export default LoaderPage