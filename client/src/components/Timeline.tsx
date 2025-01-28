import { useMemo } from "react";
import type { FamilyMember, TimelineEvent } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar, Book, GraduationCap, Briefcase, Heart } from "lucide-react";

interface TimelineProps {
  members: FamilyMember[];
  onSelectMember: (member: FamilyMember) => void;
  isLoading: boolean;
}

interface TimelineEventWithMember extends TimelineEvent {
  member: FamilyMember;
}

export default function Timeline({ members, onSelectMember, isLoading }: TimelineProps) {
  const events = useMemo(() => {
    const allEvents: TimelineEventWithMember[] = [];

    members.forEach(member => {
      // Add timeline events
      member.timelineEvents?.forEach(event => {
        allEvents.push({
          ...event,
          member,
          eventDate: new Date(event.eventDate) // Convert string to Date object
        });
      });

      // Add birth events if not already in timeline
      if (member.birthDate && !member.timelineEvents?.some(e => e.eventType === 'birth')) {
        allEvents.push({
          id: -1, // Temporary ID for auto-generated events
          familyMemberId: member.id,
          title: "Birth",
          description: `Born in ${member.birthPlace || 'unknown location'}`,
          eventDate: new Date(member.birthDate),
          location: member.birthPlace,
          eventType: 'birth' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          member
        });
      }

      // Add death events if not already in timeline
      if (member.deathDate && !member.timelineEvents?.some(e => e.eventType === 'death')) {
        allEvents.push({
          id: -2, // Temporary ID for auto-generated events
          familyMemberId: member.id,
          title: "Death",
          description: `Passed away in ${member.currentLocation || 'unknown location'}`,
          eventDate: new Date(member.deathDate),
          location: member.currentLocation,
          eventType: 'death' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          member
        });
      }
    });

    // Sort events by date
    return allEvents.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
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

  const getEventIcon = (type: TimelineEvent['eventType']) => {
    switch (type) {
      case 'birth':
        return <Calendar className="h-4 w-4" />;
      case 'death':
        return <Book className="h-4 w-4" />;
      case 'education':
        return <GraduationCap className="h-4 w-4" />;
      case 'career':
        return <Briefcase className="h-4 w-4" />;
      case 'marriage':
        return <Heart className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: TimelineEvent['eventType']) => {
    switch (type) {
      case 'birth':
        return 'hsl(142, 76%, 36%)';
      case 'death':
        return 'hsl(346, 84%, 37%)';
      case 'education':
        return 'hsl(221, 83%, 53%)';
      case 'career':
        return 'hsl(48, 96%, 53%)';
      case 'marriage':
        return 'hsl(326, 100%, 74%)';
      default:
        return 'hsl(221, 83%, 53%)';
    }
  };

  return (
    <div className="space-y-4 p-4">
      {events.length > 0 ? events.map((event) => (
        <Card
          key={`${event.member.id}-${event.eventType}-${event.id}`}
          className="relative hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onSelectMember(event.member)}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-1"
            style={{
              backgroundColor: getEventColor(event.eventType)
            }}
          />
          <CardContent className="pt-6">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {getEventIcon(event.eventType)}
                  <h3 className="font-serif text-lg">
                    {event.title}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {event.member.firstName} {event.member.lastName}
                </p>
                {event.description && (
                  <p className="text-sm mt-2">{event.description}</p>
                )}
                {event.location && (
                  <p className="text-sm text-muted-foreground mt-1">{event.location}</p>
                )}
              </div>

              <time className="text-sm text-muted-foreground whitespace-nowrap">
                {format(new Date(event.eventDate), 'MMMM d, yyyy')}
              </time>
            </div>
          </CardContent>
        </Card>
      )) : (
        <div className="text-center py-8 text-muted-foreground">
          No events to display. Add life events to family members to see them here.
        </div>
      )}
    </div>
  );
}