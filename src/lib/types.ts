
import type { User } from 'firebase/auth';

// Main type for an Exam
export interface Exam {
  id: string;
  title: string;
  description: string;
  subject: string;
  year?: number;
  imageUrl?: string;
  questions: Question[];
}

// Type for a single question within an exam
export interface Question {
  id: string;
  text: string;
  imageUrl?: string;
  options: Option[];
  correctOptionId: string;
  explanation?: string;
}

// Type for an option in a multiple-choice question
export interface Option {
  id: string; // e.g., 'A', 'B', 'C', 'D'
  text: string;
}

export interface UserProfile {
  id: string; // Firebase UID
  email: string | null;
  displayName: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
  // PrepMate specific fields
  activeSubscription?: boolean;
  recentExamIds?: string[];
}

// For the new exam form
export type ExamFormData = Omit<Exam, 'id' | 'questions'> & {
  questions: Array<Omit<Question, 'id' | 'options' | 'correctOptionId'> & {
    options: Array<Omit<Option, 'id'>>;
    correctOptionIndex: number; // 0-based index for radio group
  }>;
};
