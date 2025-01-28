import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FamilyMember } from "@/lib/types";
import DocumentViewer from "./DocumentViewer";
import StoryGenerator from "./StoryGenerator";
import MemberForm from "./MemberForm";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface MemberProfileProps {
  member: FamilyMember | null;
  onClose: () => void;
}

const formatDate = (date: Date | undefined) => {
  if (!date) return 'Not specified';
  return format(new Date(date), 'MMMM d, yyyy');
};

export default function MemberProfile({ member, onClose }: MemberProfileProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["/api/family-members"],
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error("No member selected");
      const res = await fetch(`/api/family-members/${member.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete member");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-members"] });
      toast({
        title: "Member deleted",
        description: "The family member has been removed from the tree",
      });
      onClose();
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
    setShowDeleteDialog(false);
  };

  if (!member) return null;

  return (
    <>
      <Dialog open={true} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-3xl h-[90vh]">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-2xl font-serif">
              {member.firstName} {member.lastName}
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowEditDialog(true)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="h-[calc(90vh-80px)] pr-4">
            <div className="space-y-6">
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

              <StoryGenerator member={member} />

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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {member.firstName} {member.lastName}
              and all associated data from the family tree.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showEditDialog && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-3xl h-[90vh]">
            <ScrollArea className="h-[calc(90vh-40px)]">
              <MemberForm
                member={member}
                onClose={() => {
                  setShowEditDialog(false);
                  onClose();
                }}
                existingMembers={familyMembers}
              />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}