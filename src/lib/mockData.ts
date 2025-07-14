
import type { Course, UserProfile, Enrollment, Instructor, CourseModule, Lesson, AITool, AIToolFormDataInput, CourseFormData } from './types';

export const mockInstructors: Instructor[] = [
  { id: 'inst1', name: 'Alice Wonderland', bio: 'Expert in Web Development with 10 years of experience.', avatarUrl: 'https://picsum.photos/seed/alice/100/100', title: 'Senior Web Developer' },
  { id: 'inst2', name: 'Bob The Builder', bio: 'Passionate about UI/UX design and teaching.', avatarUrl: 'https://picsum.photos/seed/bob/100/100', title: 'Lead UX Designer' },
  { id: 'inst3', name: 'Charlie Brown', bio: 'Data Science enthusiast and practitioner.', avatarUrl: 'https://picsum.photos/seed/charlie/100/100', title: 'Data Scientist' },
];

export let mockCourses: Course[] = [
  {
    id: 'course1',
    slug: 'nextjs-masterclass',
    title: 'Next.js 14 Masterclass',
    description: 'Learn Next.js from scratch and build production-ready apps.',
    longDescription: 'This comprehensive course covers everything you need to know about Next.js 14, from fundamentals like routing and data fetching to advanced topics such as server components, server actions, and deployment strategies. Build multiple projects and gain hands-on experience.',
    thumbnailUrl: 'https://picsum.photos/seed/nextjs/600/400',
    price: 49.99,
    rating: 4.8,
    numberOfRatings: 1200,
    category: 'Web Development',
    instructor: mockInstructors[0],
    previewVideoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder
    totalLessons: 50,
    duration: "20h 15m",
    level: 'Intermediate',
    tags: ['Next.js', 'React', 'JavaScript', 'Web Development'],
    paymentLink: 'https://buy.stripe.com/mock_course1', // Mock payment link
    redirectLink: '/learn/nextjs-masterclass', // Redirect to learn page after purchase
    modules: [
      {
        id: 'm1c1', title: 'Introduction to Next.js', moduleOrder: 1,
        lessons: [
          { id: 'l1m1c1', title: 'What is Next.js?', contentType: 'video', content: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: '10m', isPreviewable: true, lessonOrder: 1 },
          { id: 'l2m1c1', title: 'Setting up your environment', contentType: 'video', content: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: '12m', lessonOrder: 2 },
        ]
      },
      {
        id: 'm2c1', title: 'Routing and Pages', moduleOrder: 2,
        lessons: [
          { id: 'l1m2c1', title: 'File-based Routing', contentType: 'video', content: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: '15m', lessonOrder: 1 },
          { id: 'l2m2c1', title: 'Dynamic Routes', contentType: 'pdf', content: '/sample.pdf', downloadableResources: [{id: 'dr1', name: 'Routing Cheatsheet.pdf', url:'/sample.pdf', fileType: 'PDF'}], duration: '20m', lessonOrder: 2 },
        ]
      },
    ]
  },
  {
    id: 'course2',
    slug: 'tailwind-css-deep-dive',
    title: 'Tailwind CSS: From Zero to Hero',
    description: 'Master Tailwind CSS and build beautiful, responsive UIs.',
    longDescription: 'Dive deep into Tailwind CSS and learn how to rapidly build modern websites without ever leaving your HTML. This course covers utility-first fundamentals, responsive design, customizing Tailwind, and advanced techniques.',
    thumbnailUrl: 'https://picsum.photos/seed/tailwind/600/400',
    price: 29.99,
    rating: 4.9,
    numberOfRatings: 950,
    category: 'Web Design',
    instructor: mockInstructors[1],
    previewVideoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    totalLessons: 35,
    duration: "12h 45m",
    level: 'Beginner',
    tags: ['Tailwind CSS', 'CSS', 'Frontend', 'UI Design'],
    paymentLink: 'https://buy.stripe.com/mock_course2', // Mock payment link
    redirectLink: '/learn/tailwind-css-deep-dive', // Redirect to learn page
    modules: [
      {
        id: 'm1c2', title: 'Getting Started with Tailwind', moduleOrder: 1,
        lessons: [
          { id: 'l1m1c2', title: 'Utility-First Concepts', contentType: 'video', content: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: '8m', isPreviewable: true, lessonOrder: 1 },
        ]
      },
    ]
  },
  {
    id: 'course3',
    slug: 'python-data-science',
    title: 'Python for Data Science Bootcamp',
    description: 'Unlock the power of Python for data analysis and visualization.',
    longDescription: 'This bootcamp will take you from Python basics to advanced data science techniques using libraries like NumPy, Pandas, Matplotlib, and Scikit-learn. Work on real-world datasets and build a portfolio of projects.',
    thumbnailUrl: 'https://picsum.photos/seed/python/600/400',
    price: 79.99,
    rating: 4.7,
    numberOfRatings: 2500,
    category: 'Data Science',
    instructor: mockInstructors[2],
    previewVideoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    totalLessons: 70,
    duration: "30h 00m",
    level: 'All Levels',
    tags: ['Python', 'Data Science', 'Machine Learning', 'NumPy', 'Pandas'],
    paymentLink: 'https://buy.stripe.com/mock_course3', // Mock payment link
    redirectLink: '/learn/python-data-science', // Redirect to learn page
    modules: [
      {
        id: 'm1c3', title: 'Python Fundamentals', moduleOrder: 1,
        lessons: [
          { id: 'l1m1c3', title: 'Variables and Data Types', contentType: 'video', content: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: '10m', isPreviewable: true, lessonOrder: 1 },
        ]
      },
    ]
  },
];

export let mockUserProfiles: UserProfile[] = [
  // This user's UID must match a user in Firebase Auth for the demo to work
  {
    id: 'GhqyPnaT79csl59mY2j2aDk1M792', // Replace with a real UID from your Firebase project for admin@example.com
    email: 'admin@example.com',
    displayName: 'Admin User',
    avatarUrl: 'https://picsum.photos/seed/admin1/100/100',
    enrolledCourseIds: ['course1', 'course2'],
    purchasedToolIds: ['tool1'],
    isAdmin: true,
  },
   // Add other mock profiles if needed, matching their Firebase UIDs
];

export let mockEnrollments: Enrollment[] = [
  {
    id: 'enroll1',
    userId: 'some-user-uid', // Replace with a real user UID
    courseId: 'course1',
    enrolledAt: new Date('2023-01-15'),
    progress: 60,
    completedLessons: ['l1m1c1', 'l2m1c1', 'l1m2c1']
  },
];


// AI Tool Marketplace Mock Data
export let mockAITools: AITool[] = [
  {
    id: 'tool1',
    name: 'AI Content Generator',
    description: 'Generate high-quality blog posts, articles, and marketing copy in seconds. Basic customization (logo, brand color) included.',
    price: 199.00,
    thumbnailUrl: 'https://picsum.photos/seed/aitool1/600/400',
    previewLink: 'https://example.com/preview/content-generator',
    tags: ['Content Creation', 'Marketing', 'Writing'],
    paymentLink: 'https://buy.stripe.com/mock_tool1', // Mock payment link
    redirectLink: '/tools/tool1/access', // Mock access page link
  },
  {
    id: 'tool2',
    name: 'Smart Image Enhancer',
    description: 'Automatically upscale and enhance your images using AI. Improve resolution and clarity effortlessly. Color palette adjustments available.',
    price: 99.00,
    thumbnailUrl: 'https://picsum.photos/seed/aitool2/600/400',
    previewLink: 'https://example.com/preview/image-enhancer',
    tags: ['Image Processing', 'Design', 'Photography'],
    paymentLink: 'https://buy.stripe.com/mock_tool2', // Mock payment link
    redirectLink: '/tools/tool2/access', // Mock access page link
  },
  {
    id: 'tool3',
    name: 'AI Code Assistant',
    description: 'Get intelligent code suggestions, bug fixes, and explanations. Integrates with VS Code. Theme customization possible.',
    price: 249.00,
    thumbnailUrl: 'https://picsum.photos/seed/aitool3/600/400',
    previewLink: 'https://example.com/preview/code-assistant',
    tags: ['Development', 'Coding', 'Productivity'],
    paymentLink: 'https://buy.stripe.com/mock_tool3', // Mock payment link
    redirectLink: '/tools/tool3/access', // Mock access page link
  },
];

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
export const getUserProfile = (id: string): UserProfile | undefined => mockUserProfiles.find(user => user.id === id);

export const updateUserProfile = (id: string, data: Partial<UserProfile>): UserProfile | undefined => {
    const userIndex = mockUserProfiles.findIndex(u => u.id === id);
    if (userIndex !== -1) {
        mockUserProfiles[userIndex] = { ...mockUserProfiles[userIndex], ...data };
        return mockUserProfiles[userIndex];
    } else {
        // If user doesn't exist, create them (for new registrations)
        const newUser: UserProfile = {
            id: id,
            email: data.email || null,
            displayName: data.displayName || null,
            ...data
        };
        mockUserProfiles.push(newUser);
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
