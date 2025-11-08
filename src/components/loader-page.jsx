import React from 'react'
import {
    LoaderCircle
} from 'lucide-react';
const LoaderPage = ({ showmsg }) => {
    return (
        <div className='flex flex-col text-center w-full h-screen  items-center justify-center'>
            {/* <LoaderCircle size={34} className='animate-spin' /> */}
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
            {showmsg && (
                <span className='text-md text-muted-foreground mt-3.5'>Initializing EduBreezy Workspace....</span>
            )}
        </div>
    )
}

export default LoaderPage