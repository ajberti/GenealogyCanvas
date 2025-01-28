import { useMemo } from "react";
import type { FamilyMember, Document } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { format } from "date-fns";
import { Image as ImageIcon, FileText } from "lucide-react";

interface TimelineProps {
  members: FamilyMember[];
  onSelectMember: (member: FamilyMember) => void;
  isLoading: boolean;
}

interface TimelineEvent {
  date: Date;
  type: 'birth' | 'death' | 'photo';
  member: FamilyMember;
  document?: Document;
}

export default function Timeline({ members, onSelectMember, isLoading }: TimelineProps) {
  const events = useMemo(() => {
    const allEvents: TimelineEvent[] = [];

    members.forEach(member => {
      // Add birth events
      if (member.birthDate) {
        allEvents.push({
          date: new Date(member.birthDate),
          type: 'birth',
          member
        });
      }

      // Add death events
      if (member.deathDate) {
        allEvents.push({
          date: new Date(member.deathDate),
          type: 'death',
          member
        });
      }

      // Add photo events
      member.documents?.forEach(doc => {
        if (doc.documentType === 'photo' && doc.uploadDate) {
          allEvents.push({
            date: new Date(doc.uploadDate),
            type: 'photo',
            member,
            document: doc
          });
        }
      });
    });

    // Sort events by date
    return allEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [members]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-lg" />
        ))}
      </div>
    );
  }

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'birth':
        return 'hsl(142, 76%, 36%)';
      case 'death':
        return 'hsl(346, 84%, 37%)';
      case 'photo':
        return 'hsl(221, 83%, 53%)';
    }
  };

  return (
    <div className="space-y-4 p-4">
      {events.length > 0 ? events.map((event, index) => (
        <Card
          key={`${event.member.id}-${event.type}-${index}`}
          className="relative hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onSelectMember(event.member)}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-1"
            style={{
              backgroundColor: getEventColor(event.type)
            }}
          />
          <CardContent className="pt-6">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <h3 className="font-serif text-lg">
                  {event.member.firstName} {event.member.lastName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {event.type === 'birth' && `Born in ${event.member.birthPlace || 'unknown location'}`}
                  {event.type === 'death' && `Passed away in ${event.member.currentLocation || 'unknown location'}`}
                  {event.type === 'photo' && event.document && (
                    <>
                      <ImageIcon className="inline-block w-4 h-4 mr-1" />
                      {event.document.title}
                    </>
                  )}
                </p>
              </div>

              {event.type === 'photo' && event.document && (
                <div className="w-32">
                  <AspectRatio ratio={4/3} className="bg-muted rounded-md overflow-hidden">
                    <img
                      src={event.document.fileUrl}
                      alt={event.document.title}
                      className="object-cover w-full h-full"
                    />
                  </AspectRatio>
                </div>
              )}

              <time className="text-sm text-muted-foreground whitespace-nowrap">
                {format(event.date, 'MMMM d, yyyy')}
              </time>
            </div>
          </CardContent>
        </Card>
      )) : (
        <div className="text-center py-8 text-muted-foreground">
          No events to display. Add birth dates, death dates, or photos to family members to see them here.
        </div>
      )}
    </div>
  );
}