// // app/documents/signature-stamp-management/page.jsx (Main page with tabs)
// 'use client';

// import { useState } from 'react';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// import { useAuth } from '@/context/AuthContext';
// import SignaturesTab from '@/app/components/signature-stamp/SignatureTab/page';
// import StampsTab from '@/app/components/signature-stamp/stamp-tab/page';
// import AssignmentsTab from '@/app/components/signature-stamp/AssignmentsTab/page';

// export default function SignatureStampManagement() {
//   const { fullUser } = useAuth();
//   const role = fullUser?.role?.name;

//   if (!['ADMIN'].includes(role)) return <div>Unauthorized</div>;

//   return (
//     <div className="p-6">
//       <h1 className="text-2xl font-bold mb-4">Signature & Stamp Management</h1>
//       <Tabs defaultValue="signatures">
//         <TabsList>
//           <TabsTrigger value="signatures">Signatures</TabsTrigger>
//           <TabsTrigger value="stamps">Stamps</TabsTrigger>
//           <TabsTrigger value="assignments">Assignments</TabsTrigger>
//         </TabsList>
//         <TabsContent value="signatures">
//           <SignaturesTab />
//         </TabsContent>
//         <TabsContent value="stamps">
//           <StampsTab />
//         </TabsContent>
//         <TabsContent value="assignments">
//           <AssignmentsTab />
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }
'use client';
import AssignmentsTab from '@/app/components/signature-stamp/AssignmentsTab';
import SignaturesTab from '@/app/components/signature-stamp/SignaturesTab';
import StampsTab from '@/app/components/signature-stamp/StampsTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';

// Import directly from the component files, not page.jsx
// import SignaturesTab from '@/components/signature-stamp/SignaturesTab';
// import AssignmentsTab from '@/components/signature-stamp/AssignmentsTab';
// import StampsTab from '@/components/signature-stamp/StampsTab'; // Create this similar to SignaturesTab

export default function SignatureStampManagement() {
  const { fullUser } = useAuth();
  const role = fullUser?.role?.name;

  if (!['ADMIN'].includes(role)) return <div>Unauthorized</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Signature & Stamp Management</h1>
      <Tabs defaultValue="signatures">
        <TabsList>
          <TabsTrigger value="signatures">Signatures</TabsTrigger>
          <TabsTrigger value="stamps">Stamps</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>
        <TabsContent value="signatures">
          <SignaturesTab />
        </TabsContent>
        <TabsContent value="stamps">
          <StampsTab />

        </TabsContent>
        <TabsContent value="assignments">
          <AssignmentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}