import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import FamilyTree from "@/components/FamilyTree";
import Timeline from "@/components/Timeline";
import MemberProfile from "@/components/MemberProfile";
import type { FamilyMember } from "@/lib/types";
import AdminLogin from "@/components/AdminLogin";

const VINTAGE_PAPER_BG = "https://images.unsplash.com/photo-1519972064555-542444e71b54";

export default function Home() {
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [showingProfile, setShowingProfile] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const { data: members = [], isLoading } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
  });

  const handleMemberClick = (member: FamilyMember) => {
    setSelectedMember(member);
    setShowingProfile(true);
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
              Family Heritage
            </h1>
            <Button 
              variant="outline"
              onClick={() => setShowAdminLogin(true)}
            >
              Admin Login
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
                  readOnly={true}
                />
              </div>
            </TabsContent>

            <TabsContent value="timeline">
              <div className="border rounded-lg bg-white/50">
                <Timeline
                  members={members}
                  onSelectMember={handleMemberClick}
                  isLoading={isLoading}
                  readOnly={true}
                />
              </div>
            </TabsContent>

            <TabsContent value="members">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((member) => (
                  <Card 
                    key={member.id}
                    className="p-4 hover:shadow-md cursor-pointer"
                    onClick={() => handleMemberClick(member)}
                  >
                    <h3 className="text-lg font-semibold">
                      {member.firstName} {member.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {member.birthDate && new Date(member.birthDate).toLocaleDateString()}
                    </p>
                    {member.bio && (
                      <p className="text-sm mt-2 line-clamp-2">{member.bio}</p>
                    )}
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="documents">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((member) => (
                  member.documents && member.documents.length > 0 && (
                    <Card key={member.id} className="p-4">
                      <h3 className="text-lg font-semibold mb-2">
                        {member.firstName} {member.lastName}'s Documents
                      </h3>
                      <div className="space-y-2">
                        {member.documents.map((doc) => (
                          <div key={doc.id} className="text-sm">
                            <a 
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {doc.title}
                            </a>
                            <p className="text-muted-foreground">{doc.description}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <MemberProfile 
        member={showingProfile ? selectedMember : null} 
        onClose={() => setShowingProfile(false)}
        readOnly={true}
      />

      <AdminLogin 
        open={showAdminLogin}
        onOpenChange={setShowAdminLogin}
      />
    </div>
  );
}