import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus } from "lucide-react";
import FamilyTree from "@/components/FamilyTree";
import Timeline from "@/components/Timeline";
import MemberForm from "@/components/MemberForm";
import DocumentUpload from "@/components/DocumentUpload";
import MemberProfile from "@/components/MemberProfile";
import type { FamilyMember } from "@/lib/types";

const VINTAGE_PAPER_BG = "https://images.unsplash.com/photo-1519972064555-542444e71b54";

export default function AdminDashboard() {
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [showingProfile, setShowingProfile] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);

  const { data: members = [], isLoading } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
  });

  const handleMemberClick = (member: FamilyMember) => {
    setSelectedMember(member);
    setShowingProfile(true);
  };

  const handleAddNewMember = () => {
    setSelectedMember(null);
    setShowAddMemberForm(true);
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center p-2 sm:p-6"
      style={{
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url(${VINTAGE_PAPER_BG})`,
      }}
    >
      <Card className="max-w-7xl mx-auto bg-white/80 backdrop-blur">
        <CardContent className="p-2 sm:p-6">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-serif text-primary mb-4 sm:mb-6">
              Family Heritage - Admin
            </h1>
            <Button 
              onClick={handleAddNewMember}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Member
            </Button>
          </div>

          <Tabs defaultValue="tree" className="w-full">
            <TabsList className="w-full justify-center mb-4 sm:mb-6">
              <TabsTrigger value="tree">Family Tree</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="tree">
              <div className="h-[calc(100vh-200px)] sm:h-[600px] border rounded-lg bg-white/50 p-2 sm:p-4">
                <FamilyTree
                  members={members}
                  onSelectMember={handleMemberClick}
                  isLoading={isLoading}
                />
              </div>
            </TabsContent>

            <TabsContent value="timeline">
              <div className="border rounded-lg bg-white/50">
                <Timeline
                  members={members}
                  onSelectMember={handleMemberClick}
                  isLoading={isLoading}
                />
              </div>
            </TabsContent>

            <TabsContent value="members">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {members.map((member) => (
                    <Button
                      key={member.id}
                      variant="outline"
                      className="h-auto p-4 text-left flex flex-col items-start"
                      onClick={() => handleMemberClick(member)}
                    >
                      <span className="text-lg font-semibold">
                        {member.firstName} {member.lastName}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {member.birthDate && new Date(member.birthDate).toLocaleDateString()}
                      </span>
                      {member.bio && (
                        <p className="text-sm mt-2 line-clamp-2">{member.bio}</p>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="documents">
              <DocumentUpload members={members} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <MemberProfile 
        member={showingProfile ? selectedMember : null} 
        onClose={() => setShowingProfile(false)} 
      />

      {showAddMemberForm && (
        <Dialog open={showAddMemberForm} onOpenChange={setShowAddMemberForm}>
          <DialogContent className="max-w-3xl h-[90vh]">
            <DialogTitle>Add New Member</DialogTitle>
            <ScrollArea className="h-[calc(90vh-80px)] pr-4">
              <MemberForm
                member={null}
                onClose={() => setShowAddMemberForm(false)}
                existingMembers={members}
              />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
