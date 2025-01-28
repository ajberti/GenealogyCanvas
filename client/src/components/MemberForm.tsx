import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FamilyMember } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";

const relationSchema = z.object({
  relatedPersonId: z.string().min(1, "Please select a family member"),
  relationType: z.enum(["parent", "child", "spouse"], {
    required_error: "Please select a relationship type",
  }),
});

const memberSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  gender: z.enum(["male", "female", "other"], {
    required_error: "Please select a gender",
  }),
  birthDate: z.string().optional(),
  deathDate: z.string().optional(),
  birthPlace: z.string().optional(),
  currentLocation: z.string().optional(),
  bio: z.string().optional(),
  relationships: z.array(relationSchema),
});

type FormValues = z.infer<typeof memberSchema>;

interface MemberFormProps {
  member: FamilyMember | null;
  onClose: () => void;
  existingMembers?: FamilyMember[];
}

export default function MemberForm({ member, onClose, existingMembers = [] }: MemberFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentRelationships = member?.relationships?.map(rel => ({
    relatedPersonId: String(rel.relatedPersonId),
    relationType: rel.relationType as "parent" | "child" | "spouse",
  })) || [];

  const defaultValues: FormValues = member
    ? {
        firstName: member.firstName,
        lastName: member.lastName,
        gender: member.gender as "male" | "female" | "other",
        birthPlace: member.birthPlace || "",
        currentLocation: member.currentLocation || "",
        bio: member.bio || "",
        birthDate: member.birthDate ? new Date(member.birthDate).toISOString().split("T")[0] : "",
        deathDate: member.deathDate ? new Date(member.deathDate).toISOString().split("T")[0] : "",
        relationships: currentRelationships,
      }
    : {
        firstName: "",
        lastName: "",
        gender: "male" as const,
        birthPlace: "",
        currentLocation: "",
        bio: "",
        birthDate: "",
        deathDate: "",
        relationships: [],
      };

  const form = useForm<FormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    name: "relationships",
    control: form.control,
  });

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const formattedData = {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        deathDate: data.deathDate ? new Date(data.deathDate) : null,
      };

      const url = member ? `/api/family-members/${member.id}` : "/api/family-members";

      const res = await fetch(url, {
        method: member ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formattedData),
      });

      if (!res.ok) throw new Error("Failed to save member");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-members"] });
      toast({
        title: `Family member ${member ? "updated" : "added"}`,
        description: "The family tree has been updated",
      });
      onClose();
    },
  });

  const onSubmit = (data: FormValues) => {
    mutation.mutate(data);
  };

  // Filter out the current member from relationship options
  const availableMembers = existingMembers.filter(m => m.id !== member?.id);

  return (
    <Card className="p-4">
      <CardHeader>
        <h3 className="text-2xl font-serif">
          {member ? "Edit Family Member" : "Add New Member"}
        </h3>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Birth Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deathDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Death Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="birthPlace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Birth Place</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Location</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Biography</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Relationships Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Family Relationships</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ relatedPersonId: "", relationType: "parent" as const })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Relationship
                </Button>
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-4 items-start">
                    <FormField
                      control={form.control}
                      name={`relationships.${index}.relationType`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="parent">Parent</SelectItem>
                              <SelectItem value="child">Child</SelectItem>
                              <SelectItem value="spouse">Spouse</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`relationships.${index}.relatedPersonId`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select person" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableMembers.map((m) => (
                                <SelectItem key={m.id} value={String(m.id)}>
                                  {m.firstName} {m.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button type="submit">
                {member ? "Update" : "Add"} Member
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}