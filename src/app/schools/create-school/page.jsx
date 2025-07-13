"use client"

import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from "@/components/ui/form"
import { toast } from "sonner"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select"

const schoolFormSchema = z.object({
  name: z.string().min(1),
  email: z.string().min(1),
  location: z.string().min(1),
  phone: z.string().min(1),
  logo: z.string().optional(),
  adminem:z.string().min(1),
  adminPassword:z.string().min(1),
  subscriptionType: z.enum(["A", "B", "C"]),
  language: z.string().min(1),

  domainMode: z.enum(["tenant", "custom"]),
  tenantName: z.string().optional(),
  customDomain: z.string().optional(),
}).refine((data) => {
  if (data.domainMode === "tenant") return !!data.tenantName
  if (data.domainMode === "custom") return !!data.customDomain
}, {
  message: "Domain input required.",
  path: ["tenantName"] // this is safer fallback for both
})

export default function CreateSchoolPage() {
  const [loading, setLoading] = useState(false)
  const form = useForm({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      location: "",
      subscriptionType: "A",
      language: "en",
      adminem: "",
      adminPassword: "",
      domainMode: "tenant",
      tenantName: "",
      customDomain: "",
      logo: "",
    }
  })

  const domainMode = useWatch({ control: form.control, name: "domainMode" })
  const logo = useWatch({ control: form.control, name: "logo" })



  const onSubmit = async (data) => {
    try {
      setLoading(true)

      const domain =
        data.domainMode === "tenant"
          ? `${data.tenantName?.toLowerCase().replace(/\s+/g, "")}.edubreezy.com`
          : data.customDomain

      const payload = { ...data, resolvedDomain: domain }

      const res = await fetch("/api/schools/create-school", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const result = await res.json()

      if (res.ok) {
        toast.success("School created successfully!")
        form.reset()
      } else {
        toast.error(result.error || "Something went wrong.")
      }
    } catch (err) {
      toast.error("Failed to create school.")
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create School</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* School Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Sunshine Public School" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* School Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Email</FormLabel>
                    <FormControl>
                      <Input placeholder="mail@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* School Name */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/*admin email*/}
              <FormField
                control={form.control}
                name="adminem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Admin Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/*admin password*/}
              <FormField
                control={form.control}
                name="adminPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Password</FormLabel>
                    <FormControl>
                      <Input placeholder="Admin Password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Logo Upload or URL */}
              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Logo</FormLabel>
                    <FormControl>
                      <Input type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const url = URL.createObjectURL(file)
                          field.onChange(url)
                        }
                      }} />
                    </FormControl>


                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Location */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Delhi, India" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Subscription Type */}
              <FormField
                control={form.control}
                name="subscriptionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subscription Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className={'w-full'}>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A">Per Student</SelectItem>
                        <SelectItem value="B">Upto 500 Students</SelectItem>
                        <SelectItem value="C">501 To 1000 Students</SelectItem>
                        <SelectItem value="d">1001 To 1500 Students</SelectItem>
                        <SelectItem value="e">1501 To 2000 Students</SelectItem>
                        <SelectItem value="e">Above 2000 Students</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />


              {/* Language Dropdown */}
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={'en'}>
                      <FormControl>
                        <SelectTrigger className={'w-full'}>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                        <SelectItem value="bn">Bengali</SelectItem>
                        <SelectItem value="ta">Tamil</SelectItem>
                        <SelectItem value="te">Telugu</SelectItem>
                        <SelectItem value="or">Odia</SelectItem>
                        <SelectItem value="kn">Kannada</SelectItem>
                        <SelectItem value="ml">Malayalam</SelectItem>
                        <SelectItem value="mr">Marathi</SelectItem>
                        <SelectItem value="gu">Gujarati</SelectItem>
                        <SelectItem value="pa">Punjabi</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Domain Mode Toggle */}
              <FormField
                control={form.control}
                name="domainMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domain Option</FormLabel>
                    <RadioGroup
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2">
                        <RadioGroupItem value="tenant" id="tenant" />
                        <Label htmlFor="tenant">Tenant (subdomain)</Label>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <RadioGroupItem value="custom" id="custom" />
                        <Label htmlFor="custom">Custom Domain</Label>
                      </FormItem>
                    </RadioGroup>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tenant Name Input */}
              {domainMode === "tenant" && (
                <FormField
                  control={form.control}
                  name="tenantName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subdomain</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input placeholder="e.g. sunshine" {...field} />
                          <span className="text-muted-foreground text-sm">.edubreezy.com</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Custom Domain Input */}
              {domainMode === "custom" && (
                <FormField
                  control={form.control}
                  name="customDomain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Domain</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. school.edu" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Button type="submit" className="w-full text-white" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2 text-white">
                    <Loader2 className="animate-spin h-4 w-4" />
                    Creating...
                  </span>
                ) : (
                  "Create School"
                )}
              </Button>

            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
