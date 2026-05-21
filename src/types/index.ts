// Event Types
export type EventType =
  | 'Trade Show'
  | 'Trade Show + Partner Booth'
  | 'Trade Show + Speaking'
  | 'Trade Show + Industry Training'
  | 'Trade Show + Showcase'
  | 'Thought Leadership'
  | 'Local / Regional Event'
  | 'Webinar'
  | 'PEC Event'
  | 'Partner Onboarding'
  | 'Panduit ONE Roadshow'
  | 'Sales Training'
  | 'FMPS Sales Pitch'
  | 'Consultant Workshop'
  | 'Distributer Event'
  | 'Customer Visit'
  | 'Marketing Event'
  | 'Installation - Partner Meeting'
  | 'Hands-On Demo'
  | 'PTO - Vacation'
  | 'Media - Podcast, Interview'
  | 'Tabletop Display + Speaking'
  | 'Tabletop Display'
  | 'Partner Kickoff';

export type EventStatus = 'Confirmed' | 'Placeholder' | 'Cancelled' | 'Done' | 'Pending';

export type Theater = 'NA' | 'LATAM' | 'EMEA' | 'APAC';

export type BoothSize =
  | '10 x 10'
  | '10 x 20'
  | '20 x 20'
  | '20 x 30'
  | '30 x 30'
  | 'Innovation Area'
  | 'Showcase'
  | 'Walking Only'
  | 'No Booth'
  | 'Partner Booth'
  | 'Counter Show'
  | '6\' Table'
  | 'Lab';

export type AssetCategory =
  | 'Mobile Demo'
  | 'Full Demo'
  | 'Rack Display'
  | 'Banner'
  | 'Kiosk'
  | 'Backdrop'
  | 'Bannerstand'
  | 'Tower'
  | 'Pelican Box'
  | 'Inline'
  | 'Hands-on Kit'
  | '4-Post Rack';

export type ReservationStatus = 'Reserved' | 'Checked Out' | 'Returned' | 'Cancelled';

// Core Interfaces
export interface Event {
  id: string;
  title: string;
  eventType: EventType;
  theater: Theater;
  tradeshowOwner: string;
  buOwner: string;
  teamMembers: string[];
  displayType: string;
  status: EventStatus;
  speakerDeadline?: string;
  startDate: string;
  endDate: string;
  graphicsDeadline?: string;
  budget?: number;
  support?: string;
  travelDetails?: string;
  leadsData?: string;
  showNotes?: string;
  year: number;
  boothSize?: BoothSize;
  boothProperty?: string[];
  createdBy: string;
  modifiedDate: string;
}

export interface Asset {
  id: string;
  title: string;
  partNumber: string;
  category: AssetCategory;
  totalQuantity: number;
  location?: string;
  notes?: string;
}

export interface AssetReservation {
  id: string;
  assetId: string;
  eventId: string;
  quantity: number;
  startDate: string;
  endDate: string;
  reservedBy: string;
  status: ReservationStatus;
}

export interface ThoughtLeadership {
  id: string;
  eventName: string;
  submissionDeadline?: string;
  eventDateTime?: string;
  presentationTitle: string;
  speakers: string[];
  targetAudience?: string;
  learningObjectives?: string;
  abstract?: string;
  mediaLink?: string;
  speakerBios?: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Presented';
}

export interface TeamMember {
  id: string;
  displayName: string;
  email: string;
  role: 'TSE' | 'Manager' | 'Admin';
  isActive: boolean;
}

export interface MonthlySalesMeeting {
  id: string;
  group: number;
  regionName: string;
  teamMembers: string;
  schedule: string;
}

export interface DropdownOption {
  id: string;
  value: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
}

// View state
export type ViewMode = 'calendar' | 'list' | 'assets' | 'thoughtLeadership' | 'team' | 'admin';
