import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Head from 'next/head';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export default function Home() {
    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-primary text-white">
            <Head>
                <title>AI-Powered School Management</title>
                <meta name="description" content="AI-powered school management software for Indian schools" />
            </Head>

            <div className="w-full md:w-1/2 px-6 py-2.5 md:p-12 flex items-center justify-center">
                <div>
                    <h1 className="text-4xl md:text-6xl font-bold mb-4"><span>AI-Driven</span>,<br /> Cloud Application for School Management</h1>
                    <p className="text-sm md:text-lg mb-6">
                        Our AI-driven cloud-based school administration system is a comprehensive solution made to revolutionize how educational institutions function.  It unifies all of the necessary functions into a single, smooth platform, from expediting admissions and attendance to simplifying tests, communication, and everyday administration.  Its intelligent automation and intuitive design help schools save time, cut down on manual labor, and make the experience for administrators, teachers, students, and parents smarter, faster, and more connected.
                    </p>
                </div>
            </div>

            <div className="w-full md:w-1/2 px-6  md:p-12 bg-primary text-gray-800 flex items-center justify-center">
                <div className="w-full max-w-md bg-white rounded-lg px-3.5 py-3.5">
                    <h2 className="text-2xl font-bold mb-2 text-center">Book Your Free Demo</h2>
                    <p className="text-center mb-6">We are available to serve you always!</p>
                    <form className="space-y-4 ">
                        <Input type="text" placeholder="Your Full Name*" className="w-full p-2 border rounded-md" required />
                        <Input type="text" placeholder="School Name" className="w-full p-2 border rounded-md" />
                        <Input type="email" placeholder="Email Address" className="w-full p-2 border rounded-md" />
                        <Input type="tel" placeholder="Contact Number*" className="w-full p-2 border rounded-md" required />
                        <Select>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Your Designation" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="principal">Principal</SelectItem>
                                <SelectItem value="teacher">Teacher</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input type="text" placeholder="School Website" className="w-full p-2 border rounded-md" />
                        <Button type="submit" className="w-full  text-white p-2 rounded-lg ">BOOK</Button>
                    </form>
                </div>
                
            </div>
    
        </div>
    );
}