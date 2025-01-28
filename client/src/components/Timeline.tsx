import { useMemo } from "react";
import type { FamilyMember } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

interface TimelineProps {
  members: FamilyMember[];
  onSelectMember: (member: FamilyMember) => void;
  isLoading: boolean;
}

interface TimelineEvent {
  date: Date;
  type: 'birth' | 'death';
  member: FamilyMember;
}

export default function Timeline({ members, onSelectMember, isLoading }: TimelineProps) {
  const events = useMemo(() => {
    const allEvents: TimelineEvent[] = [];
    
    members.forEach(member => {
      if (member.birthDate) {
        allEvents.push({
          date: new Date(member.birthDate),
          type: 'birth',
          member
        });
      }
      if (member.deathDate) {
        allEvents.push({
          date: new Date(member.deathDate),
          type: 'death',
          member
        });
      }
    });

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

  return (
    <div className="space-y-4 p-4">
      {events.map((event, index) => (
        <Card
          key={`${event.member.id}-${event.type}-${index}`}
          className="relative hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onSelectMember(event.member)}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-1"
            style={{
              backgroundColor: event.type === 'birth' ? 'hsl(142, 76%, 36%)' : 'hsl(346, 84%, 37%)'
            }}
          />
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-serif text-lg">
                  {event.member.firstName} {event.member.lastName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {event.type === 'birth' ? 'Born' : 'Passed away'} in{' '}
                  {event.type === 'birth' ? event.member.birthPlace : event.member.currentLocation}
                </p>
              </div>
              <time className="text-sm text-muted-foreground">
                {format(event.date, 'MMMM d, yyyy')}
              </time>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {events.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No events to display. Add birth or death dates to family members to see them here.
        </div>
      )}
    </div>
  );
}
