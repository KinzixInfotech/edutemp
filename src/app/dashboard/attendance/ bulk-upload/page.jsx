// app/dashboard/attendance/bulk-upload/page.jsx
'use client';

import { useState } from 'react';
import { Upload, Download } from 'lucide-react';

export default function BulkUpload() {
    const [file, setFile] = useState(null);

    return (
        <div className="p-8 space-y-6">
            <h1 className="text-3xl font-bold">Bulk Upload Attendance</h1>

            <Card>
                <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                        <Button onClick={() => downloadTemplate()}>
                            <Download className="w-4 h-4 mr-2" />
                            Download Template
                        </Button>

                        <input
                            type="file"
                            accept=".csv,.xlsx"
                            onChange={(e) => setFile(e.target.files[0])}
                        />

                        <Button onClick={() => uploadFile(file)}>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload & Process
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}