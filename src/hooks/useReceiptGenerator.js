'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { generateReceiptPDF } from '@/lib/pdf/receipt-pdf-generator';
import { useUploadThing } from '@/lib/uploadthing';

/**
 * Custom hook for generating and uploading fee receipts
 * @returns {Object} - Receipt generation utilities and state
 */
export function useReceiptGenerator() {
    const [isGenerating, setIsGenerating] = useState(false);
    const queryClient = useQueryClient();
    const receiptRef = useRef(null);

    const { startUpload } = useUploadThing('feeReceiptUploader');

    /**
     * Generate receipt record (creates entry in database)
     */
    const generateReceiptMutation = useMutation({
        mutationFn: async ({ feePaymentId, schoolId }) => {
            const res = await fetch('/api/receipts/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feePaymentId, schoolId }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to generate receipt');
            }

            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(['student-receipts']);
            return data;
        },
    });

    /**
     * Generate PDF from receipt element and upload to UploadThing
     */
    const generateAndUploadPDF = async ({
        receiptElement,
        receiptId,
        paymentId,
        schoolId,
        filename,
    }) => {
        try {
            setIsGenerating(true);

            // Generate PDF blob from the receipt HTML element
            const pdfBlob = await generateReceiptPDF(receiptElement, filename);

            // Create File object from blob
            const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

            // Upload to UploadThing
            const uploadResult = await startUpload([pdfFile], {
                paymentId,
                schoolId,
                receiptId,
            });

            if (!uploadResult || uploadResult.length === 0) {
                throw new Error('Upload failed');
            }

            const pdfUrl = uploadResult[0].ufsUrl || uploadResult[0].url;

            toast.success('Receipt generated and saved successfully!');

            // Invalidate queries to refresh data
            queryClient.invalidateQueries(['receipt', receiptId]);
            queryClient.invalidateQueries(['student-receipts']);

            return {
                pdfUrl,
                receiptId,
            };

        } catch (error) {
            console.error('Receipt generation error:', error);
            toast.error(`Failed to generate receipt: ${error.message}`);
            throw error;
        } finally {
            setIsGenerating(false);
        }
    };

    /**
     * Complete workflow: Generate receipt record + PDF + Upload
     */
    const createCompleteReceipt = async ({
        feePaymentId,
        schoolId,
        receiptElement,
    }) => {
        try {
            // Step 1: Create receipt record in database
            const receiptData = await generateReceiptMutation.mutateAsync({
                feePaymentId,
                schoolId,
            });

            if (!receiptData.success) {
                throw new Error('Failed to create receipt record');
            }

            const { receipt, uploadMetadata, suggestedFilename } = receiptData;

            // Step 2: Generate PDF and upload
            const result = await generateAndUploadPDF({
                receiptElement,
                receiptId: receipt.id,
                paymentId: feePaymentId,
                schoolId,
                filename: suggestedFilename,
            });

            return {
                ...result,
                receiptNumber: receipt.receiptNumber,
            };

        } catch (error) {
            console.error('Complete receipt creation error:', error);
            throw error;
        }
    };

    return {
        isGenerating,
        receiptRef,
        generateReceipt: generateReceiptMutation.mutate,
        generateReceiptAsync: generateReceiptMutation.mutateAsync,
        generateAndUploadPDF,
        createCompleteReceipt,
    };
}
