
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
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl?: string | null;
  enrolledCourseIds?: string[];
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
export type CourseFormData = Omit<Course, 'id' | 'instructor' | 'modules' | 'rating' | 'numberOfRatings' | 'totalLessons' | 'duration'> & {
  instructorName: string;
  instructorBio?: string;
  instructorTitle?: string;
  modules: Array<Omit<CourseModule, 'id' | 'lessons'> & {
    id?: string; // For editing existing modules
    lessons: Array<Omit<Lesson, 'id'> & { id?: string }>; // For editing existing lessons
  }>;
};

// AI Tool Marketplace Type
export interface AITool {
  id: string;
  name: string;
  description: string;
  price: number;
  thumbnailUrl: string;
  previewLink: string; // URL to a live preview or demo video
  tags?: string[];
  // Add other relevant fields if needed, e.g., category, developer info
}

// AI Tool Form Data Type
export type AIToolFormData = Omit<AITool, 'id'>;
