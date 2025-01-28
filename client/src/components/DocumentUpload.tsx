import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { FamilyMember } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import DocumentViewer from "./DocumentViewer";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "image/gif", "application/pdf"];

const documentSchema = z.object({
  memberId: z.string().min(1, "Please select a family member"),
  title: z.string().min(1, "Title is required"),
  documentType: z.enum(["photo", "certificate", "record"], {
    required_error: "Please select a document type",
  }),
  file: z.any().refine((files) => files?.length > 0, "File is required")
    .refine(
      (files) => files?.[0]?.size <= MAX_FILE_SIZE,
      "Max file size is 5MB"
    )
    .refine(
      (files) => ACCEPTED_FILE_TYPES.includes(files?.[0]?.type),
      "Only .jpg, .jpeg, .png, .gif and .pdf files are accepted"
    ),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof documentSchema>;

interface DocumentUploadProps {
  members: FamilyMember[];
}

export default function DocumentUpload({ members }: DocumentUploadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState<number | null>(null);

  const selectedMemberDocs = selectedMember
    ? members.find((m) => m.id === selectedMember)?.documents || []
    : [];

  const form = useForm<FormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: "",
      documentType: undefined,
      description: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const formData = new FormData();
      formData.append("familyMemberId", data.memberId);
      formData.append("title", data.title);
      formData.append("documentType", data.documentType);
      if (data.description) formData.append("description", data.description);
      if (data.file?.[0]) formData.append("file", data.file[0]);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
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
      form.reset();
    },
  });

  const onSubmit = (data: FormValues) => {
    mutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-6">
          <h2 className="text-2xl font-serif mb-6">Upload Family Document</h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="memberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Family Member</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedMember(Number(value));
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select family member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={String(member.id)}>
                            {member.firstName} {member.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="documentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="photo">Photo</SelectItem>
                        <SelectItem value="certificate">Certificate</SelectItem>
                        <SelectItem value="record">Record</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="file"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>Upload File</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept=".jpg,.jpeg,.png,.gif,.pdf"
                        onChange={(e) => onChange(e.target.files)}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full">
                Upload Document
              </Button>
            </form>
          </Form>
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