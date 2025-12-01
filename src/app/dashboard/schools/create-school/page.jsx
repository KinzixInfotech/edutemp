"use client"

import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from "@/components/ui/form"
import CropImageDialog from "@/app/components/CropImageDialog";
import { uploadFiles } from "@/app/components/utils/uploadThing";
import { toast } from "sonner"
import { useEffect, useState } from "react"
import { Loader2, Copy, Check, CheckCircle, XCircle, RefreshCcw } from "lucide-react"
import { Input } from "@/components/ui/input"
import debounce from "lodash.debounce"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import FileUploadButton from "@/components/fileupload"

const schoolFormSchema = z.object({
  name: z.string().min(1),
  email: z.string().min(1),
  location: z.string().min(1),
  phone: z.string().min(1),
  profilePicture: z.string().optional(),
  adminem: z.string().min(1),
  adminPassword: z.string().min(1),
  subscriptionType: z.enum(["A", "B", "C"]),
  masteradminemail: z.string().min(1),
  masteradminpassword: z.string().min(1),
  language: z.string().min(1),
  schoolCode: z.string(),
  domainMode: z.enum(["tenant", "custom"]),
  tenantName: z.string().optional(),
  customDomain: z.string().optional(),
}).refine(
  (data) => {
    if (data.domainMode === "tenant") return !!data.tenantName?.trim();
    if (data.domainMode === "custom") return !!data.customDomain?.trim();
    return true;
  },
  (data) => ({
    message: "Domain input required.",
    path: [data.domainMode === "custom" ? "customDomain" : "tenantName"],
  })
);

export default function CreateSchoolPage() {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [rawImage, setRawImage] = useState(null);
  const [errorUpload, setErrorupload] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  const [resetKey, setResetKey] = useState(0);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  // domain validation function
  const form = useForm({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      location: "",
      subscriptionType: "A",
      language: "en",
      schoolCode: '',
      adminem: "",
      masteradminemail: "",
      masteradminpassword: "",
      adminPassword: "",
      domainMode: "tenant",
      tenantName: "",
      customDomain: "",
      profilePicture: "",
      generateWebsite: false,
    }
  })
  const subdomain = form.watch("tenantName") // your form field name
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState(null)


  const check = debounce(async (val) => {
    if (!val) return
    setChecking(true)
    setAvailable(null)

    const res = await fetch(`/api/check-domain?subdomain=${val}`)
    const { exists } = await res.json()

    setChecking(false)

    if (exists) {
      setAvailable(false)
      form.setError("tenantName", {
        type: "manual",
        message: "Domain already exists",
      })
    } else {
      setAvailable(true)
      form.clearErrors("tenantName")

    }
  }, 500)

  useEffect(() => {
    if (!subdomain || subdomain.trim() === "") {
      setAvailable(null)
      form.clearErrors("tenantName")
      return
    }

    check(subdomain)
    return () => check.cancel()
  }, [subdomain])
  // const handleImageUpload = (e) => {
  //   const file = e.target.files?.[0];
  //   if (!file) return;

  //   const reader = new FileReader();
  //   reader.onload = () => {
  //     setRawImage(reader.result);
  //     setCropDialogOpen(true);
  //   };
  //   reader.readAsDataURL(file);
  // };
  const handleImageUpload = (previewUrl) => {
    if (!previewUrl || previewUrl === rawImage) return;
    setRawImage(previewUrl);
    setCropDialogOpen(true);
  }
  const generateSchoolCode = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/schools/schoolcodegenerate")
      if (!res.ok) throw new Error("Failed to generate school code")
      const { code } = await res.json()
      form.setValue("schoolCode", code, {
        shouldDirty: true,
        shouldValidate: true,
      })
    } catch (error) {
      console.error("Error generating school code:", error)
      toast.error("Error generating school code");
      // Optional: show toast or error UI
    } finally {
      setLoading(false)
    }
  }

  const retryUpload = async () => {
    const res = await uploadFiles("profilePictureUploader", {
      files: [tempImage],
      input: {
        profileId: crypto.randomUUID(),
        username: form.name || "User",
      },
    });
    if (res && res[0]?.url) {
      form.setValue("profilePicture", res[0].ufsUrl)
      setPreviewUrl(res[0].ufsUrl);
      toast.success("Image uploaded!");
      setErrorupload(true);
    } else {
      toast.error("Upload failed");
    }
  }
  const router = useRouter();
  const [loading, setLoading] = useState(false)


  const domainMode = useWatch({ control: form.control, name: "domainMode" })
  // const profile = useWatch({ control: form.control, name: "logo" })



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
        setResetKey((prev) => prev + 1)
        router.push('/dashboard/schools/all-schools');
      } else {
        toast.error(result.error || "Something went wrong.")
      }
    } catch (err) {
      toast.error("Failed to create school.")
    } finally {
      setLoading(false)
    }
  }


  function SchoolCodeField({ field }) {
    const [copied, setCopied] = useState(false)
    const value = `${field?.value || ""}`

    const handleCopy = async () => {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }

    return (
      <FormItem>
        <FormLabel>School Code</FormLabel>
        <FormControl>
          <div className="flex flex-row gap-2 items-center">
            <div className="pointer-events-none py-1 px-3.5 border rounded-lg w-16 flex items-center justify-center bg-muted">
              <span className="text-black/55 dark:text-gray-200 text-lg ">EB-</span>
            </div>

            <Input
              readOnly
              value={field.value}
              className="flex-1 cursor-default"
              placeholder="Generate"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={generateSchoolCode}
              disabled={loading}
            >
              <RefreshCcw className="w-4 h-4 animate-spin-once" />
            </Button>

            {field.name === "schoolCode" && field.value && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            )}

          </div>
        </FormControl>
        <FormMessage />
      </FormItem>
    )
  }
  return (
    <div className="max-w-3xl mx-auto p-6">
      {cropDialogOpen && rawImage && (
        <CropImageDialog
          image={rawImage}
          onClose={() => {
            if (!uploading) setCropDialogOpen(false); // disable closing while uploading
          }}
          uploading={uploading}

          open={cropDialogOpen}
          // onClose={() => setCropDialogOpen(false)}
          onCropComplete={async (croppedBlob) => {
            const now = new Date();
            const iso = now.toISOString().replace(/[:.]/g, "-");
            const perf = Math.floor(performance.now() * 1000); // microseconds (approximate nanos)
            const timestamp = `${iso}-${perf}`;
            const filename = `${timestamp}.jpg`;
            const file = new File([croppedBlob], filename, { type: "image/jpeg" });
            setTempImage(file);
            try {
              setUploading(true)

              const res = await uploadFiles("profilePictureUploader", {
                files: [file],
                input: {
                  profileId: crypto.randomUUID(),
                  username: form.name || "User",
                },
              });
              if (res && res[0]?.url) {
                form.setValue("profilePicture", res[0].url)
                setPreviewUrl(res[0].url);
                toast.success("Image uploaded!")
                setErrorupload(false);
              } else {
                toast.error("Upload failed");
                setErrorupload(true);
              }
            } catch (err) {
              toast.error("Something went wrong during upload");
              console.error(err);
              setErrorupload(true);
            } finally {
              setUploading(false)
              setCropDialogOpen(false);
            }

          }}
        />
      )}
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
              <div className="dark:bg-background bg-muted py-4 border px-2 rounded-md flex gap-2.5 flex-col">

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
              </div>
              {/*master admin email*/}
              <div className="dark:bg-background bg-muted py-4 border px-2 rounded-md flex gap-2.5 flex-col">
                <FormField
                  control={form.control}
                  name="masteradminemail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Master Admin Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Master Admin Email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/*master admin password*/}
                <FormField
                  control={form.control}
                  name="masteradminpassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Master Admin Password</FormLabel>
                      <FormControl>
                        <Input placeholder="Master Admin Password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="dark:bg-background bg-muted py-4 border px-2 rounded-md flex gap-2.5 flex-col">

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
              </div>
              {/* Logo Upload or URL */}
              <div className="space-y-2">
                <Label>School Logo</Label>
                {/* <Input type="file" accept="image/*" onChange={handleImageUpload} />
                {previewUrl && <img src={previewUrl} width={80} height={80} alt="Preview" className="rounded-full mt-2" />}
                {errorUpload && <div onClick={() => retryUpload()} ><Button >Retry</Button></div>} */}
                <FileUploadButton field="Teacher" onChange={(previewUrl) => handleImageUpload(previewUrl)} />
              </div>
              {/* Location */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
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
                      <FormLabel>School Domain</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              id="domain"
                              placeholder="e.g. sunshine"
                              {...field}
                              className={form.formState.errors.tenantName ? "border-red-500" : ""}
                            />
                            <span className="text-muted-foreground text-sm">.edubreezy.com</span>
                            {available === true && (
                              <CheckCircle className="text-green-500 h-5 w-5" />
                            )}
                            {available === false && (
                              <XCircle className="text-red-500 h-5 w-5" />
                            )}
                          </div>

                          {checking && (
                            <p className="text-sm text-muted-foreground">Checking domain availability...</p>
                          )}

                          {available === true && !checking && (
                            <p className="text-sm text-green-600">Domain is available 🎉</p>
                          )}

                          {form.formState.errors.tenantName && (
                            <p className="text-sm text-red-500">
                              {form.formState.errors.tenantName.message}
                            </p>
                          )}
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
              <FormField
                control={form.control}
                name="schoolCode"
                render={({ field }) => <SchoolCodeField field={field} />}
              />
              <FormField
                control={form.control}
                name="generateWebsite"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Generate School Website
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Automatically create a default website for this school.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
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
