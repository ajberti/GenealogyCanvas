import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import type { FamilyMember } from "@/lib/types";
import DocumentViewer from "./DocumentViewer";
import StoryGenerator from "./StoryGenerator";

interface MemberProfileProps {
  member: FamilyMember | null;
  onClose: () => void;
}

export default function MemberProfile({ member, onClose }: MemberProfileProps) {
  if (!member) return null;

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Not specified';
    return format(new Date(date), 'MMMM d, yyyy');
  };

  return (
    <Dialog open={!!member} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">
            {member.firstName} {member.lastName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-80px)] pr-4">
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-muted-foreground">Gender</h3>
                    <p className="mt-1">{member.gender}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-muted-foreground">Birth Date</h3>
                    <p className="mt-1">{formatDate(member.birthDate)}</p>
                  </div>
                  {member.deathDate && (
                    <div>
                      <h3 className="font-medium text-muted-foreground">Death Date</h3>
                      <p className="mt-1">{formatDate(member.deathDate)}</p>
                    </div>
                  )}
                  {member.birthPlace && (
                    <div>
                      <h3 className="font-medium text-muted-foreground">Birth Place</h3>
                      <p className="mt-1">{member.birthPlace}</p>
                    </div>
                  )}
                  {member.currentLocation && (
                    <div>
                      <h3 className="font-medium text-muted-foreground">Current Location</h3>
                      <p className="mt-1">{member.currentLocation}</p>
                    </div>
                  )}
                </div>

                {member.bio && (
                  <div>
                    <h3 className="font-medium text-muted-foreground">Biography</h3>
                    <p className="mt-1 whitespace-pre-wrap">{member.bio}</p>
                  </div>
                )}

                <div>
                  <h3 className="font-medium text-muted-foreground mb-2">Family Relationships</h3>
                  <div className="space-y-2">
                    {member.relationships?.map((rel) => (
                      <div key={rel.id} className="text-sm">
                        <span className="capitalize">{rel.relationType}</span>:{' '}
                        {rel.relatedPerson?.firstName} {rel.relatedPerson?.lastName}
                      </div>
                    ))}
                    {(!member.relationships || member.relationships.length === 0) && (
                      <p className="text-sm text-muted-foreground">No relationships recorded</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Story Generator */}
            <StoryGenerator member={member} />

            {/* Documents Section */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-medium mb-4">Documents</h3>
                {member.documents && member.documents.length > 0 ? (
                  <DocumentViewer documents={member.documents} />
                ) : (
                  <p className="text-muted-foreground">No documents available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}