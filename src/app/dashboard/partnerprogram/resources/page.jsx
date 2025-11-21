// app/partnerprogram/resources/page.jsx
'use client';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import {
    FileText, Download, Video, Image,
    Link as LinkIcon, QrCode, Copy, Check,
    Presentation, DollarSign, Target
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function MarketingResources() {
    const { fullUser } = useAuth();
    const queryClient = useQueryClient();
    const [partnerId] = useState(fullUser?.partner?.id);
    const [copiedLink, setCopiedLink] = useState(false);

    // Fetch marketing assets
    const { data: assetsData, isLoading: loading } = useQuery({
        queryKey: ['marketing-assets', partnerId],
        queryFn: async () => {
            const res = await axios.get(`/api/partners/marketing-assets?partnerId=${partnerId}`);
            return res.data;
        },
        enabled: !!partnerId,
    });

    const groupedAssets = assetsData?.groupedAssets || {};
    const referralLink = fullUser?.partner?.referralLink || '';
    const referralCode = fullUser?.partner?.referralCode || '';

    const trackDownloadMutation = useMutation({
        mutationFn: async (assetId) => {
            return axios.patch('/api/partners/marketing-assets', {
                id: assetId,
                partnerId
            });
        }
    });

    const handleDownload = (asset) => {
        trackDownloadMutation.mutate(asset.id);
        window.open(asset.fileUrl, '_blank');
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(referralLink);
        setCopiedLink(true);
        toast.success("Copied!", {
            description: "Referral link copied to clipboard",
        });
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const getIcon = (type) => {
        switch (type) {
            case 'PITCH_DECK': return Presentation;
            case 'BROCHURE': return FileText;
            case 'PRICING': return DollarSign;
            case 'VIDEO': return Video;
            case 'IMAGE': return Image;
            default: return FileText;
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-3xl font-bold tracking-tight">Marketing Resources</h1>
                <p className="text-muted-foreground mt-1">
                    Access tools and materials to promote our services
                </p>
            </motion.div>

            {/* Referral Link Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle>Your Referral Link</CardTitle>
                        <CardDescription>
                            Share this link with potential clients to track conversions
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Input
                                    value={referralLink}
                                    readOnly
                                    className="pr-10"
                                />
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="absolute right-1 top-1/2 -translate-y-1/2"
                                    onClick={handleCopyLink}
                                >
                                    {copiedLink ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                                <div className="p-2 bg-primary/10 rounded">
                                    <LinkIcon className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium">Referral Code</div>
                                    <div className="text-lg font-bold">{referralCode}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                                <div className="p-2 bg-primary/10 rounded">
                                    <QrCode className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium">QR Code</div>
                                    <Button variant="link" className="p-0 h-auto text-primary">
                                        Download QR
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Marketing Assets */}
            {Object.entries(groupedAssets).map(([type, assets], idx) => (
                <motion.div
                    key={type}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                >
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {(() => {
                                        const Icon = getIcon(type);
                                        return <Icon className="h-5 w-5 text-primary" />;
                                    })()}
                                    <div>
                                        <CardTitle>{type.replace('_', ' ')}</CardTitle>
                                        <CardDescription>
                                            {assets.length} resource{assets.length !== 1 ? 's' : ''} available
                                        </CardDescription>
                                    </div>
                                </div>
                                <Badge variant="secondary">{assets.length}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {loading ? (
                                    Array(3).fill(0).map((_, i) => (
                                        <div key={i} className="space-y-2">
                                            <Skeleton className="h-32 w-full" />
                                            <Skeleton className="h-4 w-3/4" />
                                        </div>
                                    ))
                                ) : (
                                    assets.map((asset) => (
                                        <motion.div
                                            key={asset.id}
                                            whileHover={{ scale: 1.02 }}
                                            className="border rounded-lg p-4 space-y-3 hover:border-primary transition-colors"
                                        >
                                            {asset.thumbnailUrl && (
                                                <div className="aspect-video bg-muted rounded overflow-hidden">
                                                    <img
                                                        src={asset.thumbnailUrl}
                                                        alt={asset.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            )}

                                            <div>
                                                <h4 className="font-medium">{asset.title}</h4>
                                                {asset.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                                        {asset.description}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                {asset.fileSize && (
                                                    <span>{(asset.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                                                )}
                                                {asset.version && (
                                                    <Badge variant="outline" className="text-xs">
                                                        v{asset.version}
                                                    </Badge>
                                                )}
                                            </div>

                                            <Button
                                                onClick={() => handleDownload(asset)}
                                                className="w-full gap-2"
                                                size="sm"
                                            >
                                                <Download className="h-4 w-4" />
                                                Download
                                            </Button>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}

            {loading && Object.keys(groupedAssets).length === 0 && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Array(6).fill(0).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <Skeleton className="h-32 w-full mb-4" />
                                <Skeleton className="h-4 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}