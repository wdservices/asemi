
import type { User } from 'firebase/auth';

// Main type for a Course
export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  author: string;
  price: number;
  imageUrl?: string;
  isPublished?: boolean;
  modules: CourseModule[];
}

// Type for a module within a course
export interface CourseModule {
  id: string;
  title: string;
  lessons: Lesson[];
}

// Type for a single lesson within a module
export interface Lesson {
  id: string;
  title:string;
  contentType: 'video' | 'text' | 'pdf' | 'quiz';
  content: string; // URL for video/pdf, markdown for text, or JSON for quiz
  duration?: string; // e.g., "10:35"
  isCompleted?: boolean; // For tracking user progress
  downloadableResources?: ResourceFile[];
}

// Type for downloadable files in a lesson
export interface ResourceFile {
    id: string;
    name: string;
    url: string;
    fileType?: string; // e.g. PDF, ZIP
}

export interface UserProfile {
  id: string; // Firebase UID
  email: string | null;
  displayName: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
  // Asemi specific fields
  enrolledCourseIds?: string[];
  purchasedToolIds?: string[];
}

// Main type for an AI Tool in the marketplace
export interface AITool {
  id: string;
  name: string;
  description: string;
  price: number;
  tags: string[];
  thumbnailUrl: string;
  previewLink: string;
  paymentLink: string; // e.g., Stripe, Lemon Squeezy
  redirectLink?: string; // Where user is sent after purchase
}

// For the new course form
export type CourseFormData = Omit<Course, 'id' | 'slug' | 'modules'> & {
  modules: Array<{
    title: string;
    lessons: Array<Omit<Lesson, 'id' | 'isCompleted' | 'downloadableResources'>>;
  }>;
};
