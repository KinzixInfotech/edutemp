"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, RefreshCcw, Plus } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import Link from 'next/link';
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerClose,
    DrawerFooter
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function Page() {
    const isMobile = useIsMobile()
    const [schools, setSchools] = useState([])
    const [loading, setLoading] = useState(true)
    const [editDrawerOpen, setEditDrawerOpen] = useState(false)
    const [editSchool, setEditSchool] = useState(null)
    const [editLoading, setEditLoading] = useState(false)

    const fetchSchools = async () => {
        try {
            setLoading(true)
            const res = await fetch("/api/schools/all")
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to fetch schools")
            console.log(data, 'from all school page')
            setSchools(data)
            toast.success("Schools loaded successfully")
        } catch (err) {
            toast.error(err.message || "Something went wrong while fetching")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        try {
            const res = await fetch(`/api/schools/delete?id=${id}`, { method: "DELETE" })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || "Failed to delete school")
            toast.success("Deleted successfully")
            setSchools((prev) => prev.filter((school) => school.id !== id))
            setEditDrawerOpen(false)
        } catch (err) {
            toast.error(err.message || "Delete failed")
        }
    }

    const handleEditSave = async () => {
        try {
            setEditLoading(true)
            const res = await fetch(`/api/schools/edit?id=${editSchool.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editSchool),
            });
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || "Update failed")
            toast.success("School updated successfully")
            fetchSchools()
            setEditDrawerOpen(false)
        } catch (err) {
            toast.error(err.message || "Edit failed")
        } finally {
            setEditLoading(false)
        }
    }


    useEffect(() => {
        fetchSchools()
    }, [])

    return (
        <div className="w-full p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">All Schools</h2>
                <div className="gap-4 flex-row flex">
                    <Button variant={'outline'} onClick={fetchSchools} disabled={loading}>
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="animate-spin h-4 w-4" />
                                Refreshing...
                            </span>
                        ) : (
                            <RefreshCcw />
                        )}
                    </Button>
                    <Link href={'create-school'}>
                        <Button className='dark:text-white' >
                            Create School<Plus />
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="overflow-x-auto overflow-hidden rounded-lg border">
                <Table className="">
                    <TableHeader className="bg-muted sticky top-0 z-10">
                        <TableRow>
                            <TableHead>School Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Address</TableHead>
                            {/* <TableHead>Admin</TableHead> */}
                            <TableHead>Phone</TableHead>
                            <TableHead>Logo</TableHead>
                            <TableHead>Domain</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="**:data-[slot=table-cell]:first:w-8">
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 h-24">
                                    <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                        <Loader2 className="animate-spin h-5 " />
                                        Loading schools...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : schools.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-6">
                                    No schools found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            schools.map((school) => (
                                <TableRow key={school.id}>
                                    <TableCell>{school.schoolCode}</TableCell>
                                    <TableCell>{school.name}</TableCell>
                                    <TableCell>{school.location}</TableCell>
                                    {/* <TableCell>{school.adminem}</TableCell> */}
                                    <TableCell>{school.contactNumber}</TableCell>
                                    <TableCell>
                                        <img src={school.profilePicture} className="w-7 h-7 rounded-full" />
                                    </TableCell>
                                    <TableCell>{school.domain}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Link href={`/dashboard/schools/${school.id}/manage`}>
                                            <Button size="sm" variant="outline">View</Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Drawer open={editDrawerOpen} onOpenChange={setEditDrawerOpen} direction={isMobile ? "bottom" : "right"}>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Edit School</DrawerTitle>
                        <DrawerDescription>Make changes and save.</DrawerDescription>
                    </DrawerHeader>
                    {editSchool && (
                        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
                            <form className="flex flex-col gap-4">
                                <div className="flex flex-col gap-3">
                                    <Label htmlFor="name">School Name</Label>
                                    <Input
                                        value={editSchool.name}
                                        id="name"
                                        onChange={(e) =>
                                            setEditSchool({ ...editSchool, name: e.target.value })
                                        } />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                    <div className="flex flex-col gap-3">
                                        <Label htmlFor="location">Location</Label>
                                        <Input
                                            value={editSchool.location}
                                            id="location"
                                            onChange={(e) =>
                                                setEditSchool({ ...editSchool, location: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <Label htmlFor="domain">Domain</Label>
                                        <Input
                                            value={editSchool.currentDomain}
                                            id="domain"
                                            onChange={(e) =>
                                                setEditSchool({ ...editSchool, currentDomain: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>

                            </form>
                        </div>
                    )}
                    <DrawerFooter className="mt-2">
                        <Button onClick={handleEditSave} className='text-white' disabled={editLoading}>
                            {editLoading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="animate-spin h-4 w-4" />
                                    Saving...
                                </span>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                        <Button variant="destructive" className='text-white' onClick={() => handleDelete(editSchool.id)}>
                            Delete School
                        </Button>
                        <DrawerClose asChild>
                            <Button variant="ghost">Cancel</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </div>
    )
}
