import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Timeline from "@/components/Timeline";
import FamilyTree from "@/components/FamilyTree";
import MemberForm from "@/components/MemberForm";
import DocumentUpload from "@/components/DocumentUpload";
import type { FamilyMember } from "@/lib/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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

  const handleAddMember = () => {
    setSelectedMember(null);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-4 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-serif">Family History</h1>
        <Button onClick={handleAddMember}>
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      <Tabs defaultValue="tree" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tree">Family Tree</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="members">Family Members</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
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

        <TabsContent value="members" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member) => (
              <div
                key={member.id}
                className="p-4 border rounded-lg hover:shadow-md cursor-pointer"
                onClick={() => handleSelectMember(member)}
              >
                <h3 className="text-lg font-semibold">{member.firstName} {member.lastName}</h3>
                <p className="text-sm text-muted-foreground">
                  {member.birthDate && `Born: ${new Date(member.birthDate).toLocaleDateString()}`}
                </p>
                {member.bio && (
                  <p className="text-sm mt-2 line-clamp-2">{member.bio}</p>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <DocumentUpload members={members} />
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