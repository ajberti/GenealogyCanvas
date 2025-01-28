import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Timeline from "@/components/Timeline";
import FamilyTree from "@/components/FamilyTree";
import MemberForm from "@/components/MemberForm";
import type { FamilyMember } from "@/lib/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: members = [], isLoading } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
  });

  const handleSelectMember = (member: FamilyMember) => {
    setSelectedMember(member);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-4 min-h-screen">
      <h1 className="text-4xl font-serif mb-8">Family History</h1>

      <Tabs defaultValue="tree" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tree">Family Tree</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="tree" className="space-y-4">
          <FamilyTree
            members={members}
            onSelectMember={handleSelectMember}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Timeline
            members={members}
            onSelectMember={handleSelectMember}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <MemberForm
            member={selectedMember}
            onClose={() => setIsEditDialogOpen(false)}
            existingMembers={members}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
