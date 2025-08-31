import React from 'react'
import {
    LoaderCircle
} from 'lucide-react';
const LoaderPage = ({showmsg}) => {
    return (
        <div className='flex flex-col text-center w-full h-screen  items-center justify-center'>
            <LoaderCircle size={34} className='animate-spin' />
            {showmsg && (
                <span className='text-md text-muted-foreground mt-3.5'>Initializing EduBreezy Workspace....</span>
            )}
        </div>
    )
}

export default LoaderPage