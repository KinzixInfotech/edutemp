'use client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown } from "lucide-react"

import { Ellipsis, Loader2, Printer, Upload } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function OrdersTable() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")
  const frameworks = [
    {
      value: "next.js",
      label: "Next.js",
    },
    {
      value: "sveltekit",
      label: "SvelteKit",
    },
    {
      value: "nuxt.js",
      label: "Nuxt.js",
    },
    {
      value: "remix",
      label: "Remix",
    },
    {
      value: "astro",
      label: "Astro",
    },
  ]

  const orders = [
    { id: "#11092138", date: "15 Jul 2022, 20:40", customer: "Ronald Johnson", product: "Manga Naruto Vol. 156", supplier: "Zenpai Studio", status: "On Deliver", price: "$8.50" },
    { id: "#11092137", date: "15 Jul 2022, 18:43", customer: "Rod Stewart", product: "Mobile Suit Gundam, Vol. 02", supplier: "Wotaku Studio", status: "Arrived", price: "$16.50" },
    { id: "#11092136", date: "15 Jul 2022, 18:00", customer: "Michael Buble", product: "Gintama Eps 1-... Bluray Batch", supplier: "NEET Gallery", status: "On Payment", price: "$10.15" },
    { id: "#11092135", date: "15 Jul 2022, 16:32", customer: "Demian Aditya", product: "Manga Sasuke Shinden Full", supplier: "Zenpai Studio", status: "New Order", price: "$20.20" },
    { id: "#11092134", date: "14 Jul 2022, 14:00", customer: "Natalya Rodriguez", product: "Detective Conan Manga", supplier: "Animanga LC", status: "New Order", price: "$50.40" },
    { id: "#11092133", date: "14 Jul 2022, 10:43", customer: "Jonathan Christ", product: "Manga Naruto Vol. 156", supplier: "Animanga LC", status: "On Deliver", price: "$10.15" },
    { id: "#11092132", date: "15 Jul 2022, 15:24", customer: "Johan Liebert", product: "Full Version: Monster (Manga)", supplier: "Animanga LC", status: "Arrived", price: "$8.15" },
    { id: "#11092131", date: "10 Jul 2022, 10:05", customer: "Robert Dwayne", product: "Aimer Album - Best Noir", supplier: "Musipon Studio", status: "Arrived", price: "$20.50" },
    { id: "#11092130", date: "09 Jul 2022, 16:40", customer: "Antonio Babakar", product: "Anime Fruit Basket Full Episode", supplier: "Wotaku Studio", status: "On Payment", price: "$12.15" },
    { id: "#11092129", date: "09 Jul 2022, 15:41", customer: "Arsene Lupin", product: "One Peace Eps 1 - 500 Bluray", supplier: "Zenpai Studio", status: "New Order", price: "$40.50" },
  ];

  const statuses = ["All", "New Order", "On Payment", "On Deliver", "Arrived"];
  const StatusBadge = ({ status }) => {
    const statusStyles = {
      PENDING: "bg-yellow-100 text-yellow-800 border  border-yellow-300",
      PAID: "bg-green-100 text-green-800 border  border-green-300",
      UNPAID: "bg-red-100 text-red-800 border  border-red-300",
    };

    return (
      <span
        className={`px-2 py-1 rounded-sm text-sm font-medium  ${statusStyles[status]}`}
      >
        {status}
      </span>
    );
  };
  return (
    <div className="p-6">
      <div className="flex justify-between px-3.5 py-4  items-center mb-4  rounded-lg bg-muted" >
        <div className="flex lg:flex-row flex-col gap-2.5 ">
          <Input placeholder="Admission Number" className='dark:bg-[#171717] bg-white border rounded-lg' />
        </div>
        <div className="flex flex-row gap-1 space-x-2">
          <Input placeholder=" Name" className='dark:bg-[#171717] bg-white border rounded-lg' />

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-[200px] justify-between text-muted-foreground rounded-lg dark:bg-[#171717] bg-white"
              >
                {value
                  ? frameworks.find((framework) => framework.value === value)?.label
                  : "Filter By Class..."}
                <ChevronsUpDown className="opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandInput placeholder="Search Class..." className="h-9" />
                <CommandList>
                  <CommandEmpty>No framework found.</CommandEmpty>
                  <CommandGroup>
                    {frameworks.map((framework) => (
                      <CommandItem
                        key={framework.value}
                        value={framework.value}
                        onSelect={(currentValue) => {
                          setValue(currentValue === value ? "" : currentValue)
                          setOpen(false)
                        }}
                      >
                        {framework.label}
                        <Check
                          className={

                            cn(
                              "ml-auto",
                              value === framework.value ? "opacity-100" : "opacity-0"
                            )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button variant="outline" className='rounded-lg dark:bg-[#171717] cursor-pointer'>
            <Printer />
            Print</Button>
          <Button variant="outline" className='rounded-lg dark:bg-[#171717] cursor-pointer'>
            <Upload />
            Export</Button>
        </div>
      </div>

      {/* <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ORDER ID</TableHead> .
            
            <TableHead>CREATED</TableHead>
            <TableHead>CUSTOMER</TableHead>
            <TableHead>PRODUCTS</TableHead>
            <TableHead>SUPPLIER</TableHead>
            <TableHead>STATUS</TableHead>
            <TableHead>PRICE</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>{order.id}</TableCell>
              <TableCell>{order.date}</TableCell>
              <TableCell>{order.customer}</TableCell>
              <TableCell>{order.product}</TableCell>
              <TableCell>{order.supplier}</TableCell>
              <TableCell>
                <span
                  className={`px-2 py-1 rounded-lg text-sm ${order.status === "New Order" ? "bg-blue-100 text-blue-800" : order.status === "On Payment" ? "bg-yellow-100 text-yellow-800" : order.status === "On Deliver" ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"}`}
                >
                  {order.status}
                </span>
              </TableCell>
              <TableCell>{order.price}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table> */}
      <div className="overflow-x-auto  rounded-lg border">
        <Table className="min-w-[800px] !border-none">
          <TableHeader className="bg-muted sticky top-0 z-10">
            <TableRow>
              <TableHead>Admission No</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Amount Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className=""></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className='border-none'>
            <TableRow>
              <TableCell className='py-3.5'>
                66666666
              </TableCell>
              <TableCell className='py-3.5'>
                Mansha
              </TableCell>
              <TableCell className='py-3.5'>
                6'A
              </TableCell>
              <TableCell className='py-3.5'>
                $316.00
              </TableCell>
              <TableCell className='py-3.5'>
                <StatusBadge status="PAID" />
              </TableCell>
              <TableCell className='flex justify-end py-3.5' >
                {/* <Ellipsis className="text-right" /> */}
                <Button variant='outline'>View</Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}  