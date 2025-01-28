import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FamilyMember, Document } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import DocumentViewer from "./DocumentViewer";

interface DocumentUploadProps {
  members: FamilyMember[];
}

export default function DocumentUpload({ members }: DocumentUploadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState<number | null>(null);

  const selectedMemberDocs = selectedMember
    ? members.find(m => m.id === selectedMember)?.documents || []
    : [];

  const mutation = useMutation({
    mutationFn: async (data: Partial<Document>) => {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to upload document");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-members"] });
      toast({
        title: "Document uploaded",
        description: "The document has been added to the family archive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    mutation.mutate({
      familyMemberId: Number(formData.get("memberId")),
      title: formData.get("title") as string,
      documentType: formData.get("documentType") as "photo" | "certificate" | "record",
      fileUrl: formData.get("fileUrl") as string,
      description: formData.get("description") as string,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-6">
          <h2 className="text-2xl font-serif mb-6">Upload Family Document</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="memberId">Family Member</Label>
              <Select
                name="memberId"
                onValueChange={(value) => setSelectedMember(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select family member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={String(member.id)}>
                      {member.firstName} {member.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Document Title</Label>
              <Input id="title" name="title" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type</Label>
              <Select name="documentType">
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="photo">Photo</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="record">Record</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fileUrl">File URL</Label>
              <Input id="fileUrl" name="fileUrl" type="url" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" />
            </div>

            <Button type="submit" className="w-full">
              Upload Document
            </Button>
          </form>
        </CardContent>
      </Card>

      {selectedMember && (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-6">
            <h2 className="text-2xl font-serif mb-6">Member Documents</h2>
            <DocumentViewer documents={selectedMemberDocs} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}