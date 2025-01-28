export interface FamilyMember {
  id: number;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate?: Date;
  deathDate?: Date;
  birthPlace?: string;
  currentLocation?: string;
  bio?: string;
  relationships?: Relationship[];
  timelineEvents?: TimelineEvent[];
}

export interface Relationship {
  id: number;
  personId: number;
  relatedPersonId: number;
  relationType: 'parent' | 'child' | 'spouse';
  relatedPerson?: FamilyMember;
}

export interface TimelineEvent {
  id: number;
  familyMemberId: number;
  title: string;
  description?: string;
  eventDate: Date;
  location?: string;
  eventType: 'birth' | 'marriage' | 'education' | 'career' | 'death' | 'other';
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: number;
  familyMemberId: number;
  title: string;
  documentType: 'photo' | 'certificate' | 'record';
  fileUrl: string;
  description?: string;
  uploadDate: Date;
}

export interface TreeNode extends FamilyMember {
  children?: TreeNode[];
  spouse?: TreeNode;
  parents?: TreeNode[];
}