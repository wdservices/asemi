
import { db } from './firebase';
import { collection, getDocs, getDoc, doc, addDoc, deleteDoc, query, where, setDoc } from 'firebase/firestore';
import type { Course, UserProfile, AITool, CourseFormData, Lesson } from './types';

// --- Courses ---

export const getAllCourses = async (): Promise<Course[]> => {
    try {
        const coursesCol = collection(db, 'courses');
        const courseSnapshot = await getDocs(coursesCol);
        const coursesList = courseSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Course));
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
            return { id: courseSnap.id, ...courseSnap.data() } as Course;
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
            return { id: courseDoc.id, ...courseDoc.data() } as Course;
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching course by slug: ", error);
        return null;
    }
};

export const addCourse = async (courseData: CourseFormData): Promise<Course | null> => {
    try {
        const newCourseData = {
            ...courseData,
            slug: `${courseData.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
            modules: courseData.modules.map((m, mIndex) => ({
                id: `m${Date.now()}-${mIndex}`,
                title: m.title,
                lessons: m.lessons.map((l, lIndex) => ({
                    id: `l${Date.now()}-${mIndex}-${lIndex}`,
                    ...l,
                }))
            }))
        };
        const docRef = await addDoc(collection(db, "courses"), newCourseData);
        return { id: docRef.id, ...newCourseData };
    } catch (error) {
        console.error("Error adding course: ", error);
        return null;
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
