"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Upload,
    Download,
    FileSpreadsheet,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Users,
    GraduationCap,
    BookOpen,
    Package,
    ClipboardList,
    ChevronRight,
    ChevronLeft,
    Loader2,
    Info,
    Bus,
    Calendar,
    CreditCard,
    FileText,
    Clock,
    UserCog,
} from "lucide-react";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { InteractiveGridPattern } from "@/components/ui/interactive-grid-pattern";

const MODULE_ICONS = {
    students: GraduationCap,
    teachers: Users,
    parents: Users,
    classes: ClipboardList,
    subjects: BookOpen,
    inventory: Package,
    library: BookOpen,
    nonTeachingStaff: UserCog,
    busRoutes: Bus,
    timetable: Clock,
    feeStructure: FileText,
    exams: Calendar,
    fees: CreditCard,
};

const MODULE_COLORS = {
    students: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
    teachers: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400",
    parents: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
    classes: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400",
    subjects: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-400",
    inventory: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400",
    library: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
    nonTeachingStaff: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400",
    busRoutes: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400",
    timetable: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-400",
    feeStructure: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400",
    exams: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400",
    fees: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-400",
};

export default function ImportDataPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();
    const [selectedModule, setSelectedModule] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [importResults, setImportResults] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const [importStatus, setImportStatus] = useState("");

    // New states for enhanced features
    const [previewData, setPreviewData] = useState(null);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [sendEmails, setSendEmails] = useState(true);
    const [skipDuplicates, setSkipDuplicates] = useState(true);
    const [activeTab, setActiveTab] = useState("import"); // "import", "history", or "export"
    const [uploadedFile, setUploadedFile] = useState(null);
    const [previewPage, setPreviewPage] = useState(1);
    const previewPageSize = 10;

    // Export states
    const [selectedExportModules, setSelectedExportModules] = useState([]);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState("");

    // Fetch import history
    const { data: historyData } = useQuery({
        queryKey: ['importHistory', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/import/history`);
            return res.json();
        },
        enabled: !!schoolId && activeTab === "history",
        refetchOnWindowFocus: false,
    });

    // Fetch export modules
    const { data: exportModulesData } = useQuery({
        queryKey: ['exportModules', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/export`);
            return res.json();
        },
        enabled: !!schoolId && activeTab === "export",
        refetchOnWindowFocus: false,
    });

    // Handle retry for failed Supabase accounts
    const handleRetryAccounts = async (failedAccounts) => {
        if (!failedAccounts || failedAccounts.length === 0) return;

        setIsRetrying(true);
        try {
            const res = await fetch(`/api/schools/${schoolId}/import`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    records: failedAccounts.map(acc => ({
                        email: acc.email,
                        recordId: acc.recordId,
                        password: `Retry@${Date.now().toString().slice(-4)}`
                    })),
                    module: selectedModule
                }),
            });

            const data = await res.json();

            if (data.success > 0) {
                toast.success(`${data.success} accounts created successfully on retry`);
                // Update results
                setImportResults(prev => ({
                    ...prev,
                    accountsCreated: (prev.accountsCreated || 0) + data.success,
                    accountsFailed: data.failed,
                    accountErrors: data.errors || []
                }));
            }

            if (data.failed > 0) {
                toast.warning(`${data.failed} accounts still failed`);
            }

        } catch (error) {
            toast.error("Retry failed: " + error.message);
        } finally {
            setIsRetrying(false);
        }
    };

    // Fetch available modules
    const { data: modulesData, isLoading: modulesLoading } = useQuery({
        queryKey: ["import-modules", schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/import/config`);
            if (!res.ok) throw new Error("Failed to fetch modules");
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Fetch selected module config
    const { data: moduleConfig, isLoading: configLoading } = useQuery({
        queryKey: ["import-config", schoolId, selectedModule],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/import/config?module=${selectedModule}`);
            if (!res.ok) throw new Error("Failed to fetch module config");
            return res.json();
        },
        enabled: !!selectedModule,
    });

    // Download template
    const handleDownloadTemplate = async () => {
        try {
            const res = await fetch(`/api/schools/${schoolId}/import/template?module=${selectedModule}`);
            if (!res.ok) throw new Error("Failed to download template");

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${selectedModule}_import_template.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success("Template downloaded successfully");
        } catch (error) {
            toast.error("Failed to download template");
        }
    };

    // Handle file upload - First Preview
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            toast.error("Please upload an Excel file (.xlsx or .xls)");
            return;
        }

        setUploadedFile(file);
        setIsPreviewing(true);
        setPreviewData(null);
        setPreviewPage(1);
        setImportResults(null);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("module", selectedModule);

            const res = await fetch(`/api/schools/${schoolId}/import/preview`, {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw { message: data.error, details: data.details };
            }

            setPreviewData(data);
            toast.success(`Found ${data.totalRows} records to import`);

        } catch (error) {
            toast.error(error.message || "Preview failed");
            setPreviewData({ error: error.message, details: error.details });
        } finally {
            setIsPreviewing(false);
            event.target.value = "";
        }
    };

    // Confirm and execute import
    const handleConfirmImport = async () => {
        if (!uploadedFile || !previewData) return;

        setIsUploading(true);
        setUploadProgress(5);
        setImportStatus("📂 Starting import...");

        try {
            setUploadProgress(15);
            setImportStatus("📦 Preparing data...");
            await new Promise(r => setTimeout(r, 200));

            const formData = new FormData();
            formData.append("file", uploadedFile);
            formData.append("module", selectedModule);
            if (fullUser?.id) {
                formData.append("userId", fullUser.id);
            }
            formData.append("sendEmails", sendEmails.toString());
            formData.append("skipDuplicates", skipDuplicates.toString());

            setUploadProgress(25);
            setImportStatus("⬆️ Uploading to server...");

            const res = await fetch(`/api/schools/${schoolId}/import`, {
                method: "POST",
                body: formData,
            });

            setUploadProgress(60);
            setImportStatus("🔍 Validating template columns...");
            await new Promise(r => setTimeout(r, 300));

            setUploadProgress(70);
            setImportStatus("📝 Processing records...");
            await new Promise(r => setTimeout(r, 200));

            const data = await res.json();

            if (!res.ok) {
                throw { message: data.error, details: data.details };
            }

            setUploadProgress(85);
            setImportStatus("👤 Creating user accounts...");
            await new Promise(r => setTimeout(r, 300));

            setUploadProgress(95);
            setImportStatus("✅ Finalizing import...");
            await new Promise(r => setTimeout(r, 200));

            setUploadProgress(100);
            setImportStatus("🎉 Import complete!");
            setImportResults(data);
            setPreviewData(null);
            setUploadedFile(null);

            if (data.success > 0) {
                toast.success(`Successfully imported ${data.success} records`);
                queryClient.invalidateQueries();
            }

            if (data.failed > 0) {
                toast.warning(`${data.failed} records failed to import`);
            }

            if (data.emailsSent > 0) {
                toast.info(`Sending ${data.emailsSent} credential emails...`);
            }

        } catch (error) {
            toast.error(error.message || "Import failed");
            setImportResults({ error: error.message, details: error.details });
            setImportStatus("❌ Import failed");
        } finally {
            setIsUploading(false);
        }
    };

    // Cancel preview
    const handleCancelPreview = () => {
        setPreviewData(null);
        setUploadedFile(null);
    };

    // Handle export
    const handleExport = async () => {
        if (selectedExportModules.length === 0) {
            toast.error("Please select at least one module to export");
            return;
        }

        setIsExporting(true);
        setExportProgress("Preparing export...");

        try {
            setExportProgress("Fetching data...");

            const res = await fetch(`/api/schools/${schoolId}/export`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ modules: selectedExportModules })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error);
            }

            setExportProgress("Generating file...");

            // Convert base64 to blob and download
            const byteCharacters = atob(data.fileData);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: data.mimeType });

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = data.fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Show stats
            const totalRecords = data.stats.reduce((sum, s) => sum + s.recordCount, 0);
            toast.success(`Exported ${totalRecords} records from ${data.stats.length} modules`);

            setExportProgress("");
        } catch (error) {
            toast.error(error.message || "Export failed");
            setExportProgress("");
        } finally {
            setIsExporting(false);
        }
    };

    // Toggle export module selection
    const toggleExportModule = (moduleId) => {
        setSelectedExportModules(prev =>
            prev.includes(moduleId)
                ? prev.filter(id => id !== moduleId)
                : [...prev, moduleId]
        );
    };

    // Select/deselect all export modules
    const toggleAllExportModules = () => {
        const allModules = exportModulesData?.modules?.map(m => m.id) || [];
        if (selectedExportModules.length === allModules.length) {
            setSelectedExportModules([]);
        } else {
            setSelectedExportModules(allModules);
        }
    };

    const modules = modulesData?.modules || [];
    const exportModules = exportModulesData?.modules || [];

    return (
        <div className="py-6 px-4 md:px-6 lg:px-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Data Management</h1>
                    <p className="text-muted-foreground">
                        Import and export data using Excel files
                    </p>
                </div>
                {/* Tab Switcher */}
                <div className="flex gap-2 bg-muted p-1 rounded-lg">
                    <Button
                        variant={activeTab === "import" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setActiveTab("import")}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Import
                    </Button>
                    <Button
                        variant={activeTab === "export" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setActiveTab("export")}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                    <Button
                        variant={activeTab === "history" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setActiveTab("history")}
                    >
                        <Clock className="h-4 w-4 mr-2" />
                        History
                    </Button>
                </div>
            </div>

            {/* Trust Banner */}
            {activeTab === "import" && !selectedModule && (
                <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800 dark:text-green-300">Safe Migration</AlertTitle>
                    <AlertDescription className="text-green-700 dark:text-green-400">
                        Your existing system remains untouched. You can verify data before finalizing import.
                    </AlertDescription>
                </Alert>
            )}

            {/* Migration Guidance - Only show on import tab */}
            {activeTab === "import" && !selectedModule && (
                <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800 dark:text-blue-300">📋 Recommended Import Order</AlertTitle>
                    <AlertDescription className="text-blue-700 dark:text-blue-400">
                        <div className="mt-2 flex flex-wrap gap-2 items-center">
                            <Badge variant="outline" className="bg-orange-100 text-orange-700 dark:bg-orange-900/50">1. Classes & Sections</Badge>
                            <span className="text-blue-400">→</span>
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900/50">2. Students</Badge>
                            <span className="text-blue-400">→</span>
                            <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/50">3. Parents</Badge>
                            <span className="text-blue-400">→</span>
                            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50">4. Fee Structure</Badge>
                            <span className="text-blue-400">→</span>
                            <Badge variant="outline" className="bg-purple-100 text-purple-700 dark:bg-purple-900/50">5. Staff</Badge>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Export Tab */}
            {activeTab === "export" ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Download className="h-5 w-5" />
                            Export Data
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                            Select modules to export to Excel file
                            <Badge variant="secondary" className="font-mono text-xs">
                                <FileSpreadsheet className="h-3 w-3 mr-1" />
                                .xlsx
                            </Badge>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Export Info Alert */}
                        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="text-amber-800 dark:text-amber-300">Before Exporting</AlertTitle>
                            <AlertDescription className="text-amber-700 dark:text-amber-400">
                                Exports will include data from the current academic year. Make sure you've selected the correct year in settings.
                            </AlertDescription>
                        </Alert>

                        {/* Select All */}
                        <div className="flex items-center justify-between pb-4 border-b">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="selectAll"
                                    checked={selectedExportModules.length === exportModules.length && exportModules.length > 0}
                                    onChange={toggleAllExportModules}
                                    className="rounded"
                                />
                                <label htmlFor="selectAll" className="text-sm font-medium">
                                    Select All Modules
                                </label>
                            </div>
                            <Badge variant="outline">
                                {selectedExportModules.length} selected
                            </Badge>
                        </div>

                        {/* Module Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {exportModules.map((module) => {
                                const Icon = MODULE_ICONS[module.id] || ClipboardList;
                                const colorClass = MODULE_COLORS[module.id] || "bg-gray-100 text-gray-700";
                                const isSelected = selectedExportModules.includes(module.id);

                                return (
                                    <div
                                        key={module.id}
                                        className={`p-4 border rounded-lg cursor-pointer transition-all ${isSelected
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'hover:border-muted-foreground/50'
                                            }`}
                                        onClick={() => toggleExportModule(module.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => { }}
                                                className="mt-1 rounded"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className={`w-8 h-8 rounded ${colorClass} flex items-center justify-center`}>
                                                        <Icon className="h-4 w-4" />
                                                    </div>
                                                    <span className="font-medium">{module.name}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Fields: {module.fields?.slice(0, 3).join(', ')}...
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Export Button */}
                        <div className="flex justify-end pt-4 border-t">
                            <Button
                                onClick={handleExport}
                                disabled={isExporting || selectedExportModules.length === 0}
                                className="min-w-[200px]"
                            >
                                {isExporting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        {exportProgress || "Exporting..."}
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4 mr-2" />
                                        Export {selectedExportModules.length} Module{selectedExportModules.length !== 1 ? 's' : ''}
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : activeTab === "history" ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Import History</CardTitle>
                        <CardDescription>View all past import operations</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {historyData?.history?.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Module</TableHead>
                                        <TableHead>File</TableHead>
                                        <TableHead>Success</TableHead>
                                        <TableHead>Failed</TableHead>
                                        <TableHead>Accounts</TableHead>
                                        <TableHead>Imported By</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {historyData.history.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="text-sm">
                                                {new Date(item.createdAt).toLocaleDateString()}
                                                <div className="text-xs text-muted-foreground">
                                                    {new Date(item.createdAt).toLocaleTimeString()}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">
                                                    {item.module}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm max-w-[200px] truncate">
                                                {item.fileName}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/50">
                                                    {item.success}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {item.failed > 0 ? (
                                                    <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/50">
                                                        {item.failed}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {item.accountsCreated > 0 && (
                                                    <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900/50">
                                                        {item.accountsCreated} created
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {item.user?.name || 'System'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No import history yet</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Module Selection */}
                    {!selectedModule ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {modulesLoading ? (
                                <div className="col-span-full flex justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                modules.map((module) => {
                                    const Icon = MODULE_ICONS[module.id] || ClipboardList;
                                    const colorClass = MODULE_COLORS[module.id] || "bg-gray-100 text-gray-700";

                                    return (
                                        <Card
                                            key={module.id}
                                            className="cursor-pointer hover:shadow-lg transition-all hover:border-primary group relative overflow-hidden"
                                            onClick={() => setSelectedModule(module.id)}
                                        >
                                            {/* Grid Pattern Background */}
                                            <div className="absolute inset-0 opacity-50 pointer-events-none overflow-hidden">
                                                <div
                                                    className="absolute right-0 top-0 h-full w-2/3"
                                                    style={{
                                                        maskImage: 'linear-gradient(to left, rgba(0,0,0,0.5), transparent)',
                                                        WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.5), transparent)'
                                                    }}
                                                >
                                                    <InteractiveGridPattern
                                                        width={30}
                                                        height={30}
                                                        squares={[12, 12]}
                                                        className="absolute inset-0"
                                                    />
                                                </div>
                                            </div>
                                            <CardHeader className="pb-3 relative z-10">
                                                <div className={`w-12 h-12 rounded-lg ${colorClass} flex items-center justify-center mb-3`}>
                                                    <Icon className="h-6 w-6" />
                                                </div>
                                                <CardTitle className="flex items-center justify-between">
                                                    {module.name}

                                                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                </CardTitle>
                                                <CardDescription>{module.description}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="relative z-10">
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant="secondary">
                                                        {module.fieldCount} fields
                                                    </Badge>
                                                    <Badge variant="outline" className="text-red-600">
                                                        {module.requiredCount} required
                                                    </Badge>
                                                </div>
                                                {/* Fee Structure Special Note */}
                                                {(module.id === 'feeStructure' || module.id === 'fees') && (
                                                    <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-800">
                                                        <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1">
                                                            <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                                            We recommend importing opening balance only, not old receipts.
                                                        </p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })
                            )}
                        </div>
                    ) : (
                        /* Import Interface */
                        <div className="space-y-6">
                            {/* Back Button & Module Title */}
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setSelectedModule(null);
                                        setImportResults(null);
                                        setUploadProgress(0);
                                    }}
                                >
                                    ← Back to Modules
                                </Button>
                                <div>
                                    <h2 className="text-xl font-semibold">
                                        Import {moduleConfig?.name || selectedModule}
                                    </h2>
                                    <p className="text-muted-foreground text-sm">
                                        {moduleConfig?.description}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left: Template Info & Download */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <FileSpreadsheet className="h-5 w-5" />
                                            Template Information
                                        </CardTitle>
                                        <CardDescription>
                                            Download the template and fill in your data
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <Alert>
                                            <Info className="h-4 w-4" />
                                            <AlertTitle>Before you start</AlertTitle>
                                            <AlertDescription>
                                                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                                                    <li>Download the template first</li>
                                                    <li>Fill in data in the "Data" sheet</li>
                                                    <li>Fields marked with * are required</li>
                                                    <li>Date format: YYYY-MM-DD</li>
                                                    <li>Do not modify column headers</li>
                                                </ul>
                                            </AlertDescription>
                                        </Alert>

                                        <Button
                                            className="w-full"
                                            onClick={handleDownloadTemplate}
                                            disabled={configLoading}
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Download Template
                                        </Button>

                                        {/* Field Definitions Table */}
                                        {moduleConfig?.fields && (
                                            <div className="mt-4">
                                                <h4 className="font-medium mb-2">Field Definitions</h4>
                                                <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Field</TableHead>
                                                                <TableHead>Required</TableHead>
                                                                <TableHead>Example</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {moduleConfig.fields.map((field) => (
                                                                <TableRow key={field.name}>
                                                                    <TableCell className="font-medium">
                                                                        {field.label}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {field.required ? (
                                                                            <Badge variant="destructive" className="text-xs">Required</Badge>
                                                                        ) : (
                                                                            <Badge variant="secondary" className="text-xs">Optional</Badge>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-muted-foreground text-sm">
                                                                        {field.example}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Right: Upload Section */}
                                <Card className="relative overflow-hidden flex flex-col">
                                    {/* Gradient background */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
                                    <CardHeader className="relative">
                                        <CardTitle className="flex items-center gap-2">
                                            <div className="p-2 rounded-lg bg-primary/10">
                                                <Upload className="h-5 w-5 text-primary" />
                                            </div>
                                            Upload Data
                                        </CardTitle>
                                        <CardDescription>
                                            Upload your filled Excel file
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4 relative flex-1 flex flex-col overflow-hidden">
                                        {/* Upload Area */}
                                        <label className="relative block group flex-1">
                                            <div className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 h-full min-h-[300px] flex flex-col items-center justify-center ${isUploading
                                                ? 'border-primary bg-primary/10'
                                                : 'hover:border-primary hover:bg-gradient-to-br hover:from-primary/5 hover:to-purple-500/5 hover:shadow-lg hover:shadow-primary/10'
                                                }`}>
                                                {/* Animated corner accents */}
                                                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/50 rounded-tl-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary/50 rounded-tr-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary/50 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/50 rounded-br-lg opacity-0 group-hover:opacity-100 transition-opacity" />

                                                {isUploading ? (
                                                    <div className="space-y-4 py-2">
                                                        <div className="relative">
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <div className="w-16 h-16 rounded-full border-4 border-primary/20" />
                                                            </div>
                                                            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                                                        </div>
                                                        <p className="font-semibold text-lg">{importStatus || "Processing..."}</p>
                                                        <div className="max-w-xs mx-auto">
                                                            <Progress value={uploadProgress} className="h-2" />
                                                        </div>
                                                        <div className="flex justify-between text-xs text-muted-foreground max-w-xs mx-auto">
                                                            <span className="font-medium">{uploadProgress}% complete</span>
                                                            <span className="text-primary animate-pulse">Please don&apos;t refresh</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                                            <FileSpreadsheet className="h-8 w-8 text-primary" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-lg">
                                                                Click to upload or drag and drop
                                                            </p>
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                Excel files only (.xlsx, .xls)
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                                            <div className="h-px flex-1 bg-border" />
                                                            <span>or</span>
                                                            <div className="h-px flex-1 bg-border" />
                                                        </div>
                                                        <Button variant="outline" size="sm" className="pointer-events-none">
                                                            <Upload className="h-4 w-4 mr-2" />
                                                            Browse Files
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                accept=".xlsx,.xls"
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                onChange={handleFileUpload}
                                                disabled={isUploading}
                                            />
                                        </label>

                                        {/* Preview Loading */}
                                        {isPreviewing && (
                                            <div className="text-center py-6">
                                                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                                <p className="mt-2 text-sm text-muted-foreground">Analyzing file...</p>
                                            </div>
                                        )}

                                        {/* Preview Data */}
                                        {previewData && !previewData.error && (
                                            <div className="space-y-4 overflow-hidden">
                                                {/* Preview Summary */}
                                                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                                                    <div className="flex-1">
                                                        <p className="font-medium">{previewData.fileName}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {previewData.totalRows} records found
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Badge variant="outline" className="bg-green-100 text-green-700">
                                                            {previewData.validRows} valid
                                                        </Badge>
                                                        {previewData.duplicateRows > 0 && (
                                                            <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                                                                {previewData.duplicateRows} duplicates
                                                            </Badge>
                                                        )}
                                                        {previewData.invalidRows > 0 && (
                                                            <Badge variant="outline" className="bg-red-100 text-red-700">
                                                                {previewData.invalidRows} invalid
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Preview Table */}
                                                <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead className="w-12">#</TableHead>
                                                                <TableHead>Status</TableHead>
                                                                {previewData.columns?.slice(0, 4).map((col) => (
                                                                    <TableHead key={col} className="capitalize">{col}</TableHead>
                                                                ))}
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {previewData.rows?.slice((previewPage - 1) * previewPageSize, previewPage * previewPageSize).map((row) => (
                                                                <TableRow key={row.rowNumber} className={row.isDuplicate ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}>
                                                                    <TableCell>{row.rowNumber}</TableCell>
                                                                    <TableCell>
                                                                        {row.isDuplicate ? (
                                                                            <Badge variant="outline" className="bg-yellow-100 text-yellow-700 text-xs">
                                                                                Duplicate
                                                                            </Badge>
                                                                        ) : row.isValid ? (
                                                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                                        ) : (
                                                                            <XCircle className="h-4 w-4 text-red-600" />
                                                                        )}
                                                                    </TableCell>
                                                                    {previewData.columns?.slice(0, 4).map((col) => (
                                                                        <TableCell key={col} className="text-sm truncate max-w-[150px]">
                                                                            {row.data?.[col] || '-'}
                                                                        </TableCell>
                                                                    ))}
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>

                                                {/* Pagination Controls */}
                                                {previewData.rows?.length > previewPageSize && (
                                                    <div className="flex items-center justify-between pt-2">
                                                        <p className="text-xs text-muted-foreground">
                                                            Showing {((previewPage - 1) * previewPageSize) + 1} - {Math.min(previewPage * previewPageSize, previewData.rows.length)} of {previewData.rows.length} records
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                                                                disabled={previewPage === 1}
                                                            >
                                                                <ChevronLeft className="h-4 w-4" />
                                                                Previous
                                                            </Button>
                                                            <span className="text-sm text-muted-foreground">
                                                                Page {previewPage} of {Math.ceil(previewData.rows.length / previewPageSize)}
                                                            </span>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setPreviewPage(p => Math.min(Math.ceil(previewData.rows.length / previewPageSize), p + 1))}
                                                                disabled={previewPage >= Math.ceil(previewData.rows.length / previewPageSize)}
                                                            >
                                                                Next
                                                                <ChevronRight className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Import Options */}
                                                {previewData.requiresAuth && (
                                                    <div className="space-y-3 pt-2">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                id="sendEmails"
                                                                checked={sendEmails}
                                                                onChange={(e) => setSendEmails(e.target.checked)}
                                                                className="rounded"
                                                            />
                                                            <label htmlFor="sendEmails" className="text-sm">
                                                                Send login credentials via email
                                                            </label>
                                                        </div>
                                                        {previewData.duplicateRows > 0 && (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    id="skipDuplicates"
                                                                    checked={skipDuplicates}
                                                                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                                                                    className="rounded"
                                                                />
                                                                <label htmlFor="skipDuplicates" className="text-sm">
                                                                    Skip duplicate records
                                                                </label>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Action Buttons */}
                                                <div className="flex gap-3">
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1"
                                                        onClick={handleCancelPreview}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        className="flex-1"
                                                        onClick={handleConfirmImport}
                                                        disabled={isUploading || previewData.validRows === 0}
                                                    >
                                                        {isUploading ? (
                                                            <>
                                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                                Importing...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                                                Confirm Import ({previewData.validRows})
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Preview Error */}
                                        {previewData?.error && (
                                            <Alert variant="destructive" className="overflow-hidden">
                                                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                                <AlertTitle>Preview Failed</AlertTitle>
                                                <AlertDescription className="space-y-3 overflow-hidden">
                                                    <p className="break-words">{previewData.error}</p>

                                                    {/* Show detailed column information if available */}
                                                    {previewData.details && (
                                                        <div className="mt-3 space-y-3 text-sm">
                                                            <p className="text-muted-foreground">{previewData.details.message}</p>

                                                            {/* Missing Columns */}
                                                            {previewData.details.missingColumns?.length > 0 && (
                                                                <div className="p-3 bg-red-100 dark:bg-red-950 rounded-lg">
                                                                    <p className="font-semibold text-red-700 dark:text-red-400 mb-2">
                                                                        Missing Required Columns:
                                                                    </p>
                                                                    <ul className="list-disc list-inside space-y-1">
                                                                        {previewData.details.missingColumns.map((col, i) => (
                                                                            <li key={i} className="text-red-600 dark:text-red-300">{col}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}

                                                            {/* Expected vs Uploaded columns comparison */}
                                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                                <div className="p-3 bg-muted rounded-lg">
                                                                    <p className="font-semibold mb-2">Expected Columns:</p>
                                                                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                                                                        {previewData.details.expectedColumns?.map((col, i) => (
                                                                            <li key={i} className={col.includes('*') ? 'font-medium text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}>
                                                                                {col}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                                <div className="p-3 bg-muted rounded-lg">
                                                                    <p className="font-semibold mb-2">Your Columns:</p>
                                                                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                                                                        {previewData.details.uploadedColumns?.map((col, i) => (
                                                                            <li key={i} className="text-muted-foreground">{col}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            </div>

                                                            {/* Suggestion */}
                                                            {previewData.details.suggestion && (
                                                                <p className="text-amber-600 dark:text-amber-400 font-medium">
                                                                    💡 {previewData.details.suggestion}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {/* Import Results */}
                                        {importResults && !importResults.error && (
                                            <div className="space-y-4">
                                                {/* Records Stats */}
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="text-center p-3 bg-muted rounded-lg">
                                                        <p className="text-xl font-bold">{importResults.total}</p>
                                                        <p className="text-xs text-muted-foreground">Total</p>
                                                    </div>
                                                    <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                                                        <p className="text-xl font-bold text-green-600">
                                                            {importResults.success}
                                                        </p>
                                                        <p className="text-xs text-green-600">Records</p>
                                                    </div>
                                                    <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                                                        <p className="text-xl font-bold text-red-600">
                                                            {importResults.failed}
                                                        </p>
                                                        <p className="text-xs text-red-600">Failed</p>
                                                    </div>
                                                </div>

                                                {/* Supabase Account Creation Stats (for auth modules) */}
                                                {importResults.requiresAuth && (
                                                    <div className="border rounded-lg p-4 space-y-3">
                                                        <h4 className="font-medium flex items-center gap-2">
                                                            <Users className="h-4 w-4" />
                                                            Account Creation Status
                                                        </h4>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                                                                <p className="text-xl font-bold text-blue-600">
                                                                    {importResults.accountsCreated || 0}
                                                                </p>
                                                                <p className="text-xs text-blue-600">Accounts Created</p>
                                                            </div>
                                                            <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                                                                <p className="text-xl font-bold text-orange-600">
                                                                    {importResults.accountsFailed || 0}
                                                                </p>
                                                                <p className="text-xs text-orange-600">Account Failures</p>
                                                            </div>
                                                        </div>

                                                        {/* Failed Account Errors with Retry */}
                                                        {importResults.accountErrors?.length > 0 && (
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <h5 className="text-sm font-medium text-orange-600 flex items-center gap-2">
                                                                        <AlertTriangle className="h-4 w-4" />
                                                                        Failed Account Creations
                                                                    </h5>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleRetryAccounts(importResults.accountErrors)}
                                                                        disabled={isRetrying}
                                                                    >
                                                                        {isRetrying ? (
                                                                            <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Retrying...</>
                                                                        ) : (
                                                                            <>↻ Retry All</>
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                                <div className="max-h-32 overflow-y-auto border rounded-lg">
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow>
                                                                                <TableHead>Email</TableHead>
                                                                                <TableHead>Error</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {importResults.accountErrors.slice(0, 5).map((err, i) => (
                                                                                <TableRow key={i}>
                                                                                    <TableCell className="text-sm">{err.email}</TableCell>
                                                                                    <TableCell className="text-orange-600 text-xs">
                                                                                        {err.message}
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
                                                                {importResults.accountErrors.length > 5 && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        +{importResults.accountErrors.length - 5} more failed...
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {importResults.success > 0 && (
                                                    <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
                                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                        <AlertTitle className="text-green-700">Import Successful</AlertTitle>
                                                        <AlertDescription className="text-green-600">
                                                            {importResults.success} records imported successfully.
                                                            {importResults.requiresAuth && importResults.accountsCreated > 0 && (
                                                                <span> {importResults.accountsCreated} accounts created.</span>
                                                            )}
                                                        </AlertDescription>
                                                    </Alert>
                                                )}

                                                {/* Error Details */}
                                                {importResults.errors?.length > 0 && (
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium text-red-600 flex items-center gap-2">
                                                            <XCircle className="h-4 w-4" />
                                                            Failed Records ({importResults.errors.length})
                                                        </h4>
                                                        <div className="max-h-40 overflow-y-auto border rounded-lg">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead>Row</TableHead>
                                                                        <TableHead>Error</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {importResults.errors.slice(0, 10).map((err, i) => (
                                                                        <TableRow key={i}>
                                                                            <TableCell>{err.row}</TableCell>
                                                                            <TableCell className="text-red-600 text-sm">
                                                                                {err.message}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                        {importResults.errors.length > 10 && (
                                                            <p className="text-sm text-muted-foreground">
                                                                And {importResults.errors.length - 10} more errors...
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {importResults?.error && (
                                            <Alert variant="destructive">
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertTitle>{importResults.error}</AlertTitle>
                                                <AlertDescription className="space-y-2">
                                                    {importResults.details ? (
                                                        <div className="mt-2 space-y-2">
                                                            <p className="text-sm">{importResults.details.message}</p>

                                                            {importResults.details.missingColumns?.length > 0 && (
                                                                <div>
                                                                    <p className="text-xs font-medium mt-2">Missing Required Columns:</p>
                                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                                        {importResults.details.missingColumns.map((col, i) => (
                                                                            <Badge key={i} variant="destructive" className="text-xs">
                                                                                {col.replace(' *', '')}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {importResults.details.expectedColumns && (
                                                                <div>
                                                                    <p className="text-xs font-medium mt-2">Expected Columns:</p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {importResults.details.expectedColumns.slice(0, 5).map(c => c.replace(' *', '')).join(', ')}...
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {importResults.details.uploadedColumns && (
                                                                <div>
                                                                    <p className="text-xs font-medium mt-2">Your File Has:</p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {importResults.details.uploadedColumns.slice(0, 5).join(', ')}...
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {importResults.details.suggestion && (
                                                                <p className="text-xs mt-2 font-medium text-orange-400">
                                                                    💡 {importResults.details.suggestion}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p>{importResults.error}</p>
                                                    )}
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </>
            )
            }
        </div >
    );
}
