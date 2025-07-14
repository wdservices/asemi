
import type { Course, UserProfile, Enrollment, Instructor, CourseModule, Lesson, AITool, AIToolFormDataInput, CourseFormData } from './types';
import { auth } from '@/lib/firebase';

export const mockInstructors: Instructor[] = [
  { id: 'inst1', name: 'Alice Wonderland', bio: 'Expert in Web Development with 10 years of experience.', avatarUrl: 'https://picsum.photos/seed/alice/100/100', title: 'Senior Web Developer' },
  { id: 'inst2', name: 'Bob The Builder', bio: 'Passionate about UI/UX design and teaching.', avatarUrl: 'https://picsum.photos/seed/bob/100/100', title: 'Lead UX Designer' },
  { id: 'inst3', name: 'Charlie Brown', bio: 'Data Science enthusiast and practitioner.', avatarUrl: 'https://picsum.photos/seed/charlie/100/100', title: 'Data Scientist' },
];

export let mockCourses: Course[] = [];

export let mockUserProfiles: UserProfile[] = [
  // IMPORTANT: To login as an admin, you must first create this user in the application
  // via the registration page. Use the email 'admin@asemi.com' and any password.
  // The system will then grant this user admin privileges based on the email.
  {
    id: 'GhqyPnaT79csl59mY2j2aDk1M792', // This is a placeholder UID and will be replaced by the actual Firebase UID on registration.
    email: 'admin@asemi.com',
    displayName: 'Admin User',
    avatarUrl: 'https://picsum.photos/seed/admin1/100/100',
    enrolledCourseIds: [],
    purchasedToolIds: [],
    isAdmin: true,
  },
];

export let mockEnrollments: Enrollment[] = [];


// AI Tool Marketplace Mock Data
export let mockAITools: AITool[] = [];

// --- Mock Data Functions ---

// Courses
export const getCourseBySlug = (slug: string): Course | undefined => mockCourses.find(course => course.slug === slug);
export const getCourseById = (id: string): Course | undefined => mockCourses.find(course => course.id === id);
export const addCourse = (courseData: CourseFormData): Course => {
    // Simulate adding a course
    const newCourse: Course = {
        id: `course${mockCourses.length + 1}`, // Simple ID generation
        slug: courseData.slug,
        title: courseData.title,
        description: courseData.description,
        longDescription: courseData.longDescription,
        thumbnailUrl: courseData.thumbnailUrl,
        price: courseData.price,
        category: courseData.category,
        instructor: mockInstructors.find(inst => inst.name === courseData.instructorName) || mockInstructors[0], // Simplified instructor linking
        modules: courseData.modules.map((mod, modIndex) => ({
            id: `m${modIndex + 1}c${mockCourses.length + 1}`,
            title: mod.title,
            moduleOrder: mod.moduleOrder,
            lessons: mod.lessons.map((lesson, lessonIndex) => ({
                id: `l${lessonIndex + 1}m${modIndex + 1}c${mockCourses.length + 1}`,
                ...lesson,
            })),
        })),
        previewVideoUrl: courseData.previewVideoUrl,
        level: courseData.level,
        tags: courseData.tags?.split(',').map(tag => tag.trim()).filter(Boolean) || [],
        paymentLink: courseData.paymentLink,
        redirectLink: courseData.redirectLink,
        // rating, numberOfRatings, totalLessons, duration would be calculated or added later
    };
    mockCourses.push(newCourse);
    console.log("Mock Course Added:", newCourse);
    return newCourse;
}
export const updateCourse = (courseId: string, courseData: CourseFormData): Course | undefined => {
    const courseIndex = mockCourses.findIndex(c => c.id === courseId);
    if (courseIndex === -1) return undefined;

    const existingCourse = mockCourses[courseIndex];
    const updatedCourse: Course = {
        ...existingCourse,
        title: courseData.title,
        slug: courseData.slug,
        description: courseData.description,
        longDescription: courseData.longDescription,
        thumbnailUrl: courseData.thumbnailUrl,
        price: courseData.price,
        category: courseData.category,
        level: courseData.level,
        tags: courseData.tags?.split(',').map(tag => tag.trim()).filter(Boolean) || [],
        instructor: mockInstructors.find(inst => inst.name === courseData.instructorName) || existingCourse.instructor,
        previewVideoUrl: courseData.previewVideoUrl,
        paymentLink: courseData.paymentLink,
        redirectLink: courseData.redirectLink,
        modules: courseData.modules.map((mod, modIndex) => ({
            id: mod.id || `m${modIndex + 1}c${courseId}-new`, // Assign new ID if missing
            title: mod.title,
            moduleOrder: mod.moduleOrder,
            lessons: mod.lessons.map((lesson, lessonIndex) => ({
                id: lesson.id || `l${lessonIndex + 1}m${mod.id || modIndex + 1}c${courseId}-new`, // Assign new ID if missing
                ...lesson,
            })),
        })),
        // Recalculate derived fields if necessary
    };

    mockCourses[courseIndex] = updatedCourse;
    console.log("Mock Course Updated:", updatedCourse);
    return updatedCourse;
}

export const deleteCourse = (courseId: string): boolean => {
     const initialLength = mockCourses.length;
     mockCourses = mockCourses.filter(c => c.id !== courseId);
     const success = mockCourses.length < initialLength;
     if (success) console.log("Mock Course Deleted:", courseId);
     return success;
}


// Users
export const getUserProfile = (id: string): UserProfile | undefined => {
    const user = mockUserProfiles.find(user => user.id === id);
    if(user) return user;
    // Check if the registered user's email matches the admin email
    const adminConfig = mockUserProfiles.find(p => p.email === 'admin@asemi.com');
    if (adminConfig) {
        // If an admin logs in whose UID is not the placeholder one, check by email.
        const authUser = auth.currentUser;
        if (authUser && authUser.email === 'admin@asemi.com') {
             // Return the admin profile template, which will be saved with the correct UID later
            return { ...adminConfig, id: authUser.uid };
        }
    }
    return undefined;
};

export const updateUserProfile = (id: string, data: Partial<UserProfile>): UserProfile | undefined => {
    const userIndex = mockUserProfiles.findIndex(u => u.id === id);
    if (userIndex !== -1) {
        mockUserProfiles[userIndex] = { ...mockUserProfiles[userIndex], ...data };
        console.log(`Mock User Updated: ${id}`, mockUserProfiles[userIndex]);
        return mockUserProfiles[userIndex];
    } else {
        // If user doesn't exist, create them (for new registrations / Google Sign-In)
        const newUser: UserProfile = {
            id: id,
            email: data.email || null,
            displayName: data.displayName || null,
            avatarUrl: data.avatarUrl || null,
            enrolledCourseIds: [],
            purchasedToolIds: [],
            isAdmin: data.email === 'admin@asemi.com', // Grant admin if email matches
            ...data
        };
        mockUserProfiles.push(newUser);
        console.log(`Mock User Created: ${id}`, newUser);
        return newUser;
    }
};

// Function to add a course to a user's enrolled list (simulates purchase completion)
export const enrollUserInCourse = (userId: string, courseId: string): boolean => {
    const userIndex = mockUserProfiles.findIndex(u => u.id === userId);
    if (userIndex === -1) return false;
    if (!mockUserProfiles[userIndex].enrolledCourseIds?.includes(courseId)) {
        mockUserProfiles[userIndex].enrolledCourseIds = [...(mockUserProfiles[userIndex].enrolledCourseIds || []), courseId];
        // Add a basic enrollment record too
        mockEnrollments.push({
            id: `enroll-${userId}-${courseId}-${Date.now()}`,
            userId: userId,
            courseId: courseId,
            enrolledAt: new Date(),
            progress: 0,
            completedLessons: [],
        });
        console.log(`Mock: User ${userId} enrolled in course ${courseId}`);
        return true;
    }
    return false; // Already enrolled
}

// Function to add a tool to a user's purchased list (simulates purchase completion)
export const addPurchasedToolToUser = (userId: string, toolId: string): boolean => {
    const userIndex = mockUserProfiles.findIndex(u => u.id === userId);
    if (userIndex === -1) return false;
    if (!mockUserProfiles[userIndex].purchasedToolIds?.includes(toolId)) {
        mockUserProfiles[userIndex].purchasedToolIds = [...(mockUserProfiles[userIndex].purchasedToolIds || []), toolId];
        console.log(`Mock: User ${userId} purchased tool ${toolId}`);
        return true;
    }
    return false; // Already purchased
}


// Enrollments
export const getEnrollmentsByUserId = (userId: string): Enrollment[] => mockEnrollments.filter(enrollment => enrollment.userId === userId);

// AI Tools
export const getAllAITools = (): AITool[] => mockAITools;
export const addAITool = (toolData: AIToolFormDataInput): AITool => {
    const newTool: AITool = {
        id: `tool${mockAITools.length + 1}`, // Simple ID generation
        name: toolData.name,
        description: toolData.description,
        price: toolData.price,
        thumbnailUrl: toolData.thumbnailUrl,
        previewLink: toolData.previewLink,
        tags: toolData.tags?.split(',').map(tag => tag.trim()).filter(Boolean) || [],
        paymentLink: toolData.paymentLink,
        redirectLink: toolData.redirectLink,
    };
    mockAITools.push(newTool);
    console.log("Mock AI Tool Added:", newTool);
    return newTool;
}

export const deleteAITool = (toolId: string): boolean => {
    const initialLength = mockAITools.length;
    mockAITools = mockAITools.filter(t => t.id !== toolId);
    const success = mockAITools.length < initialLength;
    if (success) console.log("Mock AI Tool Deleted:", toolId);
    return success;
};

export const getAIToolById = (id: string): AITool | undefined => mockAITools.find(tool => tool.id === id);

export const updateAITool = (toolId: string, toolData: AIToolFormDataInput): AITool | undefined => {
    const toolIndex = mockAITools.findIndex(t => t.id === toolId);
    if (toolIndex === -1) return undefined;

    const existingTool = mockAITools[toolIndex];
    const updatedTool: AITool = {
        ...existingTool,
        name: toolData.name,
        description: toolData.description,
        price: toolData.price,
        thumbnailUrl: toolData.thumbnailUrl,
        previewLink: toolData.previewLink,
        tags: toolData.tags?.split(',').map(tag => tag.trim()).filter(Boolean) || [],
        paymentLink: toolData.paymentLink,
        redirectLink: toolData.redirectLink,
    };

    mockAITools[toolIndex] = updatedTool;
    console.log("Mock AI Tool Updated:", updatedTool);
    return updatedTool;
}
