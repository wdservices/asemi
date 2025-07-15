
import type { User } from 'firebase/auth';

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  longDescription?: string;
  thumbnailUrl: string;
  price: number;
  rating?: number;
  numberOfRatings?: number;
  category?: string;
  instructor: Instructor;
  modules: CourseModule[];
  previewVideoUrl?: string;
  totalLessons?: number;
  duration?: string; // e.g., "10h 30m"
  level?: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  tags?: string[];
  paymentLink?: string; // Link to external payment processor
  redirectLink?: string; // Link where user is sent after successful payment (e.g., /learn/course-slug)
}

export interface Instructor {
  id: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  title?: string; // e.g., "Lead Developer @ Company"
}

export interface CourseModule {
  id: string;
  title: string;
  lessons: Lesson[];
  moduleOrder: number;
}

export interface Lesson {
  id: string;
  title: string;
  contentType: 'video' | 'pdf' | 'text' | 'quiz';
  content: string; // URL for video/pdf, text content, or quiz ID
  duration?: string; // e.g., "15m"
  isPreviewable?: boolean;
  downloadableResources?: ResourceFile[];
  lessonOrder: number;
}

export interface ResourceFile {
  id: string;
  name: string;
  url: string;
  fileType?: string; // e.g., 'PDF', 'ZIP'
}

export interface UserProfile {
  id: string; // Firebase UID
  email: string | null;
  displayName: string | null;
  avatarUrl?: string | null;
  enrolledCourseIds?: string[];
  purchasedToolIds?: string[]; // Added for tracking tool purchases
  isAdmin?: boolean;
  // Add other profile details as needed
  bio?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: Date;
  progress?: number; // Percentage, 0-100
  completedLessons?: string[]; // Array of lesson IDs
}

// For forms
export type CourseFormData = Omit<Course, 'id' | 'instructor' | 'modules' | 'rating' | 'numberOfRatings' | 'totalLessons' | 'duration' | 'tags'> & {
  instructorName: string;
  instructorBio?: string;
  instructorTitle?: string;
  tags?: string; // Comma-separated string for form input
  modules: Array<Omit<CourseModule, 'id' | 'lessons'> & {
    id?: string; // For editing existing modules
    lessons: Array<Omit<Lesson, 'id'> & { id?: string }>; // For editing existing lessons
  }>;
  paymentLink?: string;
  redirectLink?: string;
};

// AI Tool Marketplace Type
export interface AITool {
  id: string;
  name: string;
  description: string;
  price: number; // Ensure price is always number
  thumbnailUrl: string;
  previewLink: string; // URL to a live preview or demo video
  tags?: string[];
  paymentLink?: string; // Link to external payment processor
  redirectLink?: string; // Link where user is sent after successful payment (e.g., /tools/tool-id/access)
  // Add other relevant fields if needed, e.g., category, developer info
}

// AI Tool Form Data Type - Input for the form might handle tags as a single string
// Used in the 'new' and 'edit' form components.
export interface AIToolFormDataInput {
  name: string;
  description: string;
  price: number; // Input field type="number" will coerce, Zod handles validation
  thumbnailUrl: string;
  previewLink: string;
  tags?: string; // Comma-separated string for the form input
  paymentLink?: string;
  redirectLink?: string;
}

// AI Tool Form Data Type - Processed data for saving/display (might not be explicitly needed if Input type is sufficient)
// Represents the data structure after potential processing (e.g., converting tags string to array).
export type AIToolFormData = Omit<AITool, 'id'>;
