import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FamilyMember } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface MemberFormProps {
  member: FamilyMember | null;
  onClose: () => void;
  existingMembers: FamilyMember[];
}

interface FormValues {
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string;
  deathDate: string;
  birthPlace?: string;
  currentLocation?: string;
  bio?: string;
}

export default function MemberForm({ member, onClose, existingMembers }: MemberFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: member ? {
      ...member,
      birthDate: member.birthDate ? new Date(member.birthDate).toISOString().split('T')[0] : '',
      deathDate: member.deathDate ? new Date(member.deathDate).toISOString().split('T')[0] : '',
    } : {
      firstName: "",
      lastName: "",
      gender: "",
      birthPlace: "",
      currentLocation: "",
      bio: "",
      birthDate: "",
      deathDate: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const formattedData = {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        deathDate: data.deathDate ? new Date(data.deathDate) : null,
      };

      const url = member 
        ? `/api/family-members/${member.id}`
        : "/api/family-members";

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

  return (
    <Card className="p-4">
      <CardHeader>
        <h3 className="text-2xl font-serif">
          {member ? "Edit Family Member" : "Add New Member"}
        </h3>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" {...register("firstName", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" {...register("lastName", { required: true })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select {...register("gender")}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birthDate">Birth Date</Label>
              <Input 
                id="birthDate" 
                type="date" 
                {...register("birthDate")} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deathDate">Death Date</Label>
              <Input 
                id="deathDate" 
                type="date" 
                {...register("deathDate")} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birthPlace">Birth Place</Label>
              <Input id="birthPlace" {...register("birthPlace")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentLocation">Current Location</Label>
              <Input id="currentLocation" {...register("currentLocation")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Biography</Label>
            <Textarea id="bio" {...register("bio")} />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {member ? "Update" : "Add"} Member
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}