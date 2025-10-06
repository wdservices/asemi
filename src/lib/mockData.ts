
import { db } from './firebase';
import { collection, getDocs, getDoc, doc, addDoc, deleteDoc, query, where, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Course, UserProfile, AITool, CourseFormData, Lesson } from './types';

// --- Courses ---

export const getAllCourses = async (): Promise<Course[]> => {
    try {
        const coursesCol = collection(db, 'courses');
        const courseSnapshot = await getDocs(coursesCol);
        const coursesList = courseSnapshot.docs.map(doc => {
            const data = doc.data();
            // Ensure pricing field exists and is properly formatted
            if (!data.pricing || typeof data.pricing !== 'object') {
                data.pricing = {
                    type: data.price && data.price > 0 ? 'payment' : 'free',
                    amount: data.price || undefined
                };
            }
            
            // Ensure modules and lessons have IDs (for backward compatibility)
            if (data.modules && Array.isArray(data.modules)) {
                data.modules = data.modules.map((module: any, moduleIndex: number) => ({
                    ...module,
                    id: module.id || `module-${moduleIndex}`,
                    lessons: module.lessons ? module.lessons.map((lesson: any, lessonIndex: number) => ({
                        ...lesson,
                        id: lesson.id || `lesson-${moduleIndex}-${lessonIndex}`
                    })) : []
                }));
            }
            
            return {
                id: doc.id,
                ...data
            } as Course;
        });
        return coursesList;
    } catch (error) {
        console.error("Error fetching courses: ", error);
        return [];
    }
};

export const getCourseById = async (id: string): Promise<Course | null> => {
    try {
        const courseRef = doc(db, 'courses', id);
        const courseSnap = await getDoc(courseRef);
        if (courseSnap.exists()) {
            const data = courseSnap.data();
            // Ensure pricing field exists and is properly formatted
            if (!data.pricing || typeof data.pricing !== 'object') {
                data.pricing = {
                    type: data.price && data.price > 0 ? 'payment' : 'free',
                    amount: data.price || undefined
                };
            }
            
            // Ensure modules and lessons have IDs (for backward compatibility)
            if (data.modules && Array.isArray(data.modules)) {
                data.modules = data.modules.map((module: any, moduleIndex: number) => ({
                    ...module,
                    id: module.id || `module-${moduleIndex}`,
                    lessons: module.lessons ? module.lessons.map((lesson: any, lessonIndex: number) => ({
                        ...lesson,
                        id: lesson.id || `lesson-${moduleIndex}-${lessonIndex}`
                    })) : []
                }));
            }
            
            return { id: courseSnap.id, ...data } as Course;
        } else {
            console.log("No such course!");
            return null;
        }
    } catch (error) {
        console.error("Error fetching course by ID: ", error);
        return null;
    }
};

export const getCourseBySlug = async (slug: string): Promise<Course | null> => {
    try {
        const q = query(collection(db, "courses"), where("slug", "==", slug));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const courseDoc = querySnapshot.docs[0];
            const data = courseDoc.data();
            // Ensure pricing field exists and is properly formatted
            if (!data.pricing || typeof data.pricing !== 'object') {
                data.pricing = {
                    type: data.price && data.price > 0 ? 'payment' : 'free',
                    amount: data.price || undefined
                };
            }
            
            // Ensure modules and lessons have IDs (for backward compatibility)
            if (data.modules && Array.isArray(data.modules)) {
                data.modules = data.modules.map((module: any, moduleIndex: number) => ({
                    ...module,
                    id: module.id || `module-${moduleIndex}`,
                    lessons: module.lessons ? module.lessons.map((lesson: any, lessonIndex: number) => ({
                        ...lesson,
                        id: lesson.id || `lesson-${moduleIndex}-${lessonIndex}`
                    })) : []
                }));
            }
            
            const courseData = { id: courseDoc.id, ...data } as Course;
            return courseData; // Return the course regardless of published status
        }
        
        // If no course found and slug matches our mock course, return mock data
        if (slug === "react-development-fundamentals") {
            return {
                id: "test-course-1",
                title: "React Development Fundamentals",
                slug: "react-development-fundamentals",
                description: "Learn the basics of React development from scratch",
                longDescription: "This comprehensive course covers everything you need to know about React development, from basic concepts to advanced patterns.",
                thumbnailUrl: "/course-fallback.webp",
                price: 0,
                pricing: { type: 'free' },
                category: "Web Development",
                level: "Beginner",
                tags: ["react", "javascript", "frontend"],
                instructorName: "John Doe",
                instructorBio: "Senior React Developer with 5+ years of experience",
                instructorTitle: "Senior Frontend Developer",
                previewVideoUrl: "https://www.youtube.com/watch?v=dGcsHMXbSOA",
                paymentLink: "",
                author: "John Doe",
                imageUrl: "/course-fallback.webp",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                modules: [
                    {
                        id: "module-1",
                        title: "Getting Started with React",
                        moduleOrder: 0,
                        lessons: [
                            {
                                id: "lesson-1-1",
                                title: "Introduction to React",
                                contentType: "video",
                                content: "https://www.youtube.com/watch?v=dGcsHMXbSOA",
                                duration: "15:30",
                                isPreviewable: true,
                                lessonOrder: 0,
                                downloadableResources: []
                            },
                            {
                                id: "lesson-1-2",
                                title: "Setting up Development Environment",
                                contentType: "video",
                                content: "https://www.youtube.com/watch?v=SqcY0GlETPk",
                                duration: "12:45",
                                isPreviewable: false,
                                lessonOrder: 1,
                                downloadableResources: []
                            }
                        ]
                    },
                    {
                        id: "module-2",
                        title: "React Components",
                        moduleOrder: 1,
                        lessons: [
                            {
                                id: "lesson-2-1",
                                title: "Understanding Components",
                                contentType: "video",
                                content: "https://www.youtube.com/watch?v=Y2hgEGPzTZY",
                                duration: "18:20",
                                isPreviewable: false,
                                lessonOrder: 0,
                                downloadableResources: []
                            },
                            {
                                id: "lesson-2-2",
                                title: "Props and State",
                                contentType: "video",
                                content: "https://www.youtube.com/watch?v=IYvD9oBCuJI",
                                duration: "22:15",
                                isPreviewable: false,
                                lessonOrder: 1,
                                downloadableResources: []
                            }
                        ]
                    }
                ]
            };
        }
        
        return null;
    } catch (error) {
        console.error("Error fetching course by slug: ", error);
        return null;
    }
};

export const addCourse = async (courseData: CourseFormData): Promise<Course | null> => {
    try {
        // Ensure safe defaults and normalized fields
        const now = new Date().toISOString();
        const fallbackImage = '/course-fallback.webp';

        const normalizedPricing = (() => {
            if (courseData.pricing && typeof courseData.pricing === 'object') return courseData.pricing;
            const price = (courseData as any).price as number | undefined;
            return {
                type: price && price > 0 ? 'payment' : 'free',
                amount: price || undefined,
            } as any;
        })();

        const modules = Array.isArray(courseData.modules)
            ? courseData.modules.map((m, mIndex) => ({
                id: `m${Date.now()}-${mIndex}`,
                title: m.title,
                lessons: (m.lessons || []).map((l, lIndex) => ({
                    id: `l${Date.now()}-${mIndex}-${lIndex}`,
                    ...l,
                })),
            }))
            : [];

        const newCourseData = {
            ...courseData,
            pricing: normalizedPricing,
            // Guarantee images are set (Firestore rejects undefined)
            imageUrl: courseData.imageUrl ?? fallbackImage,
            slug: `${courseData.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
            isPublished: true, // default publish
            createdAt: now,
            updatedAt: now,
            modules,
        } as any;

        const docRef = await addDoc(collection(db, 'courses'), newCourseData);
        return { id: docRef.id, ...newCourseData } as Course;
    } catch (error) {
        console.error('Error adding course: ', error);
        return null;
    }
};

export const updateCourse = async (courseId: string, data: Partial<Course>): Promise<boolean> => {
    try {
        const courseRef = doc(db, 'courses', courseId);
        await updateDoc(courseRef, data);
        return true;
    } catch (error) {
        console.error("Error updating course: ", error);
        return false;
    }
};


export const deleteCourse = async (courseId: string): Promise<boolean> => {
    try {
        await deleteDoc(doc(db, "courses", courseId));
        return true;
    } catch (error) {
        console.error("Error deleting course: ", error);
        return false;
    }
};


// --- AI Tools (example, can be expanded) ---

export const getAllAITools = async (): Promise<AITool[]> => {
    // This is a placeholder. You would implement this similarly to getAllCourses
    // if you add an "ai_tools" collection in Firestore.
    return [];
};

export const getAIToolById = async (id: string): Promise<AITool | undefined> => {
    // Placeholder
    return undefined;
};


// --- User Profiles ---

export const getUserProfile = async (id: string): Promise<UserProfile | null> => {
    try {
        const userRef = doc(db, 'users', id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            return { id: userSnap.id, ...userSnap.data() } as UserProfile;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching user profile: ", error);
        return null;
    }
};

export const updateUserProfile = async (id: string, data: Partial<UserProfile>): Promise<UserProfile | undefined> => {
    try {
        const userRef = doc(db, 'users', id);
        // Using set with merge:true will create the doc if it doesn't exist, or update it if it does.
        await setDoc(userRef, data, { merge: true });
        const updatedUserSnap = await getDoc(userRef);
        return { id: updatedUserSnap.id, ...updatedUserSnap.data() } as UserProfile;
    } catch (error) {
        console.error("Error updating user profile: ", error);
        return undefined;
    }
};

export const addPurchasedToolToUser = async (userId: string, toolId: string): Promise<boolean> => {
    // Placeholder - would need to fetch user, update array, and save.
    return false;
};

export const enrollUserInCourse = async (userId: string, courseId: string): Promise<boolean> => {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data() as UserProfile;
            const enrolledCourses = userData.enrolledCourses || [];
            
            // Check if user is already enrolled
            if (!enrolledCourses.includes(courseId)) {
                // Add the course to enrolled courses
                const updatedEnrolledCourses = [...enrolledCourses, courseId];
                
                // Update the user profile
                await setDoc(userRef, { 
                    enrolledCourses: updatedEnrolledCourses 
                }, { merge: true });
                
                return true;
            }
            return true; // Already enrolled
        } else {
            // Create new user profile with this course enrollment
            await setDoc(userRef, {
                enrolledCourses: [courseId],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }, { merge: true });
            
            return true;
        }
    } catch (error) {
        console.error("Error enrolling user in course: ", error);
        return false;
    }
};

// Function to create sample course data for testing
export const createSampleCourse = async (): Promise<Course | null> => {
    const sampleCourse: CourseFormData = {
        title: "React Development Fundamentals",
        slug: "react-development-fundamentals",
        description: "Learn the basics of React development from scratch",
        longDescription: "This comprehensive course covers everything you need to know about React development, from basic concepts to advanced patterns.",
        thumbnailUrl: "/course-fallback.webp",
        price: 0,
        pricing: { type: 'free' },
        category: "Web Development",
        level: "Beginner",
        tags: "react,javascript,frontend",
        instructorName: "John Doe",
        instructorBio: "Senior React Developer with 5+ years of experience",
        instructorTitle: "Senior Frontend Developer",
        previewVideoUrl: "https://www.youtube.com/watch?v=dGcsHMXbSOA",
        paymentLink: "",
        author: "John Doe",
        imageUrl: "/course-fallback.webp",
        modules: [
            {
                id: "module-1",
                title: "Getting Started with React",
                moduleOrder: 0,
                lessons: [
                    {
                        id: "lesson-1-1",
                        title: "Introduction to React",
                        contentType: "video",
                        content: "https://www.youtube.com/watch?v=dGcsHMXbSOA",
                        duration: "15:30",
                        isPreviewable: true,
                        lessonOrder: 0,
                        downloadableResources: []
                    },
                    {
                        id: "lesson-1-2",
                        title: "Setting up Development Environment",
                        contentType: "video",
                        content: "https://www.youtube.com/watch?v=SqcY0GlETPk",
                        duration: "12:45",
                        isPreviewable: false,
                        lessonOrder: 1,
                        downloadableResources: []
                    }
                ]
            },
            {
                id: "module-2",
                title: "React Components",
                moduleOrder: 1,
                lessons: [
                    {
                        id: "lesson-2-1",
                        title: "Understanding Components",
                        contentType: "video",
                        content: "https://www.youtube.com/watch?v=Y2hgEGPzTZY",
                        duration: "18:20",
                        isPreviewable: false,
                        lessonOrder: 0,
                        downloadableResources: []
                    },
                    {
                        id: "lesson-2-2",
                        title: "Props and State",
                        contentType: "video",
                        content: "https://www.youtube.com/watch?v=IYvD9oBCuJI",
                        duration: "22:15",
                        isPreviewable: false,
                        lessonOrder: 1,
                        downloadableResources: []
                    }
                ]
            }
        ]
    };

    return await addCourse(sampleCourse);
};

// --- Payment Records ---

export interface PaymentRecord {
    id?: string;
    userId: string;
    courseId: string;
    amount: number;
    currency: string;
    reference: string;
    status: 'success' | 'failed' | 'pending';
    pricingType: string;
    customerEmail: string;
    paidAt: string;
    createdAt: any;
}

export const createPaymentRecord = async (paymentData: Omit<PaymentRecord, 'id' | 'createdAt'>): Promise<boolean> => {
    try {
        console.log('Creating payment record in Firestore payments collection:', paymentData);
        const docRef = await addDoc(collection(db, 'payments'), {
            ...paymentData,
            createdAt: serverTimestamp()
        });
        console.log('Payment record created with ID:', docRef.id);
        return true;
    } catch (error) {
        console.error('Error creating payment record in Firestore:', error);
        return false;
    }
};

export const getPaymentsByUserId = async (userId: string): Promise<PaymentRecord[]> => {
    try {
        const q = query(collection(db, 'payments'), where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as PaymentRecord));
    } catch (error) {
        console.error('Error fetching payments:', error);
        return [];
    }
};

export const verifyUserPaymentForCourse = async (userId: string, courseId: string): Promise<boolean> => {
    try {
        const q = query(
            collection(db, 'payments'),
            where('userId', '==', userId),
            where('courseId', '==', courseId),
            where('status', '==', 'success')
        );
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (error) {
        console.error('Error verifying payment:', error);
        return false;
    }
};
