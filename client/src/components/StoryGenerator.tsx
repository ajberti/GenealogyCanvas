import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { FamilyMember } from "@/lib/types";

interface StoryGeneratorProps {
  member: FamilyMember;
}

export default function StoryGenerator({ member }: StoryGeneratorProps) {
  const [story, setStory] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/family-members/${member.id}/story`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to generate story");
      return res.json();
    },
    onSuccess: (data) => {
      setStory(data.story);
    },
  });

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Family Story</h3>
            <Button 
              onClick={() => mutation.mutate()} 
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Story'
              )}
            </Button>
          </div>

          {story ? (
            <div className="prose prose-zinc dark:prose-invert">
              <p className="whitespace-pre-wrap font-serif">{story}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Click the button above to generate a story about {member.firstName}'s life and family connections.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
