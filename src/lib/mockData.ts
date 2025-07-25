
import type { Course, UserProfile, AITool, CourseFormData } from './types';

export let mockCourses: Course[] = [
    {
        id: 'course1',
        slug: 'intro-to-react-101',
        title: 'Introduction to React',
        description: 'Learn the fundamentals of React and build your first modern web application.',
        category: 'Web Development',
        level: 'Beginner',
        author: 'John Doe',
        price: 49.99,
        imageUrl: 'https://placehold.co/400x250.png',
        modules: [
            {
                id: 'm1',
                title: 'Module 1: Getting Started',
                lessons: [
                    { id: 'l1-1', title: 'What is React?', contentType: 'video', content: 'https://www.youtube.com/watch?v=SqcY0GlETPk', duration: '8:42' },
                    { id: 'l1-2', title: 'Setting up your environment', contentType: 'text', content: 'Follow these steps to set up your development environment...', duration: '5:00' },
                ]
            },
            {
                id: 'm2',
                title: 'Module 2: Core Concepts',
                lessons: [
                    { id: 'l2-1', title: 'Components & Props', contentType: 'video', content: 'https://www.youtube.com/watch?v=SqcY0GlETPk', duration: '12:15' },
                    { id: 'l2-2', title: 'State & Lifecycle', contentType: 'video', content: 'https://www.youtube.com/watch?v=SqcY0GlETPk', duration: '15:30' },
                ]
            },
        ]
    },
    {
        id: 'course2',
        slug: 'advanced-css-mastery',
        title: 'Advanced CSS Mastery',
        description: 'Dive deep into modern CSS features like Grid, Flexbox, and custom properties to create stunning layouts.',
        category: 'Web Design',
        level: 'Intermediate',
        author: 'Jane Smith',
        price: 79.99,
        imageUrl: 'https://placehold.co/400x250.png',
        modules: [
             {
                id: 'm1',
                title: 'Module 1: Advanced Selectors & Specificity',
                lessons: [
                    { id: 'l1-1', title: 'Deep dive into Selectors', contentType: 'video', content: 'https://www.youtube.com/watch?v=SqcY0GlETPk', duration: '11:05' },
                ]
            },
        ]
    }
];

export let mockAITools: AITool[] = [
    {
        id: 'tool1',
        name: 'AI Blog Post Generator',
        description: 'Generate high-quality, SEO-optimized blog posts in minutes. Just provide a topic and let our AI do the rest.',
        price: 29.99,
        tags: ['Content Creation', 'Writing', 'SEO'],
        thumbnailUrl: 'https://placehold.co/400x300.png',
        previewLink: '#',
        paymentLink: '#',
        redirectLink: '/tools/tool1/access',
    },
    {
        id: 'tool2',
        name: 'Logo & Brand Kit Creator',
        description: 'Create a professional logo and a complete brand kit for your business instantly. No design skills required.',
        price: 49.99,
        tags: ['Design', 'Branding'],
        thumbnailUrl: 'https://placehold.co/400x300.png',
        previewLink: '#',
        paymentLink: '#',
        redirectLink: '/tools/tool2/access',
    },
];

export let mockUserProfiles: UserProfile[] = [
  // This user will be automatically granted admin privileges if registered with this email.
  {
    id: 'admin_placeholder_uid', 
    email: 'spellz49@gmail.com',
    displayName: 'Admin User',
    avatarUrl: 'https://avatar.vercel.sh/admin.png',
    isAdmin: true,
    enrolledCourseIds: ['course1', 'course2'],
    purchasedToolIds: ['tool1'],
  },
   {
    id: 'user1_placeholder_uid', 
    email: 'testuser@example.com',
    displayName: 'Test User',
    avatarUrl: 'https://avatar.vercel.sh/testuser.png',
    isAdmin: false,
    enrolledCourseIds: ['course1'],
    purchasedToolIds: [],
  },
];

// --- Mock Data Functions ---

// Courses
export const getAllCourses = (): Course[] => mockCourses;
export const getCourseById = (id: string): Course | undefined => mockCourses.find(course => course.id === id);
export const getCourseBySlug = (slug: string): Course | undefined => mockCourses.find(course => course.slug === slug);
export const addCourse = (courseData: CourseFormData): Course => {
    const newCourse: Course = {
        id: `course${Date.now()}`,
        slug: `${courseData.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        ...courseData,
        modules: courseData.modules.map((m, mIndex) => ({
            id: `m${Date.now()}-${mIndex}`,
            title: m.title,
            lessons: m.lessons.map((l, lIndex) => ({
                id: `l${Date.now()}-${mIndex}-${lIndex}`,
                ...l,
            }))
        }))
    };
    mockCourses.unshift(newCourse); // Add to the beginning of the array
    console.log("Mock Course Added:", newCourse);
    return newCourse;
}
export const deleteCourse = (courseId: string): boolean => {
     const initialLength = mockCourses.length;
     mockCourses = mockCourses.filter(c => c.id !== courseId);
     const success = mockCourses.length < initialLength;
     if (success) console.log("Mock Course Deleted:", courseId);
     return success;
}

// AI Tools
export const getAllAITools = (): AITool[] => mockAITools;
export const getAIToolById = (id: string): AITool | undefined => mockAITools.find(tool => tool.id === id);


// Users
export const getUserProfile = (id: string): UserProfile | undefined => {
    return mockUserProfiles.find(user => user.id === id);
};

export const updateUserProfile = (id: string, data: Partial<UserProfile>): UserProfile | undefined => {
    let userIndex = mockUserProfiles.findIndex(u => u.id === id);

    if (userIndex !== -1) {
        // Update existing user
        mockUserProfiles[userIndex] = { ...mockUserProfiles[userIndex], ...data, id };
        console.log(`Mock User Updated: ${id}`, mockUserProfiles[userIndex]);
        return mockUserProfiles[userIndex];
    } else {
        // Create new user profile
        const newUser: UserProfile = {
            id: id,
            email: data.email || null,
            displayName: data.displayName || null,
            avatarUrl: data.avatarUrl || null,
            isAdmin: data.email === 'spellz49@gmail.com', // Grant admin if email matches
            enrolledCourseIds: [],
            purchasedToolIds: []
        };
        mockUserProfiles.push(newUser);
        console.log(`Mock User Created: ${id}`, newUser);
        return newUser;
    }
};

export const addPurchasedToolToUser = (userId: string, toolId: string): boolean => {
    const userProfile = getUserProfile(userId);
    if (userProfile && !userProfile.purchasedToolIds?.includes(toolId)) {
        updateUserProfile(userId, { purchasedToolIds: [...(userProfile.purchasedToolIds || []), toolId] });
        return true;
    }
    return false; // Already purchased or user not found
};
